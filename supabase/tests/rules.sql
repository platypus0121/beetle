-- 資料庫規則測試。整份在一個交易內執行，最後 ROLLBACK，不留資料。
-- 執行：psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rules.sql
begin;
create schema t;
grant usage on schema t to authenticated, anon;

create function t.login(p uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end $$;
create function t.anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
create function t.su() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
-- 預期失敗：錯誤訊息需符合 pattern
create function t.fails(p_name text, p_sql text, p_pattern text) returns void language plpgsql as $$
declare ok boolean := false; msg text;
begin
  begin
    execute p_sql;
    ok := true;
  exception when others then msg := sqlerrm;
  end;
  if ok then raise exception 'FAIL [%]: 應該被拒絕但成功了', p_name; end if;
  if msg !~ p_pattern then raise exception 'FAIL [%]: 錯誤訊息不符：%', p_name, msg; end if;
  raise notice 'ok  %', p_name;
end $$;
-- 預期成功
create function t.ok(p_name text, p_sql text) returns void language plpgsql as $$
begin execute p_sql; raise notice 'ok  %', p_name; end $$;
-- 預期回傳筆數／數值
create function t.eq(p_name text, p_sql text, p_expect text) returns void language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  if v is distinct from p_expect then raise exception 'FAIL [%]: 預期 % 實際 %', p_name, p_expect, v; end if;
  raise notice 'ok  %', p_name;
end $$;
grant execute on all functions in schema t to authenticated, anon;

-- ───── 測試帳號：alice(賣家) bob(買家) carol(買家2) dave(新帳號) mod(版主) ─────
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-0000-0000-000000000001','alice@test.local','authenticated','authenticated'),
  ('b0000000-0000-0000-0000-000000000002','bob@test.local','authenticated','authenticated'),
  ('c0000000-0000-0000-0000-000000000003','carol@test.local','authenticated','authenticated'),
  ('d0000000-0000-0000-0000-000000000004','dave@test.local','authenticated','authenticated'),
  ('e0000000-0000-0000-0000-000000000005','mod@test.local','authenticated','authenticated');
update public.profiles set created_at = now() - interval '60 days' where id::text !~ '^d';
update public.profiles set username = 'alice' where id::text ~ '^a';
update public.profiles set username = 'bob' where id::text ~ '^b';
update public.profiles set username = 'carol' where id::text ~ '^c';
update public.profiles set role = 'moderator' where id::text ~ '^e';
\set alice '\'a0000000-0000-0000-0000-000000000001\''
\set bob '\'b0000000-0000-0000-0000-000000000002\''
\set carol '\'c0000000-0000-0000-0000-000000000003\''
\set dave '\'d0000000-0000-0000-0000-000000000004\''
\set mod '\'e0000000-0000-0000-0000-000000000005\''
select id as sp_ok from public.species where scientific_name = 'Dynastes hercules hercules' \gset
select id as sp_tw from public.species where scientific_name = 'Trypoxylus dichotomus tunobosonis' \gset
select id as sp_p1 from public.species where scientific_name = 'Dorcus grandis formosanus' \gset
select id as sp_p2 from public.species where scientific_name = 'Dorcus schenklingi' \gset
select id as sp_p3 from public.species where scientific_name = 'Cheirotonus formosanus' \gset

\echo '== 會員 =='
select t.eq('註冊自動建立 profile', 'select count(*) from public.profiles', '5');
select t.login(:alice);
select t.fails('不能自己改 role', $$update public.profiles set role = 'admin' where id = auth.uid()$$, 'permission denied');
select t.fails('不能自己改信用分', $$update public.profiles set credit_score = 999 where id = auth.uid()$$, 'permission denied');
select t.ok('可以改自己的簡介', $$update public.profiles set bio = 'hi' where id = auth.uid()$$);
select t.eq('改不到別人的 profile', $$with u as (update public.profiles set bio = 'x' where username = 'bob' returning 1) select count(*) from u$$, '0');
select t.fails('暱稱不可含 @', $$update public.profiles set username = 'a@b' where id = auth.uid()$$, '暱稱');

\echo '== 文章／留言 =='
select t.ok('發文', format($$insert into public.posts (author_id, category, species_id, title, body) values (auth.uid(), 'share', %s, '我的長戟', '第一次養 https://example.com')$$, :sp_ok));
select id as post1 from public.posts limit 1 \gset
select t.fails('不能冒名發文', format($$insert into public.posts (author_id, category, title, body) values (%L, 'share', '冒名', '內容內容')$$, :bob), 'row-level security');
select t.fails('重複內容被擋', $$insert into public.posts (author_id, category, title, body) values (auth.uid(), 'share', '再一次', '第一次養 https://example.com')$$, '重複');
select t.fails('禁用詞被擋', $$insert into public.posts (author_id, category, title, body) values (auth.uid(), 'share', '好康', '線上賭場 首儲送')$$, '禁用詞');
select t.fails('不能自己改讚數', $$update public.posts set like_count = 99$$, 'permission denied');
select t.login(:dave);
select t.fails('新帳號不能貼連結', $$insert into public.posts (author_id, category, title, body) values (auth.uid(), 'share', '哈囉', '看這裡 http://spam.example')$$, '24 小時');
select t.ok('新帳號可以發純文字', $$insert into public.posts (author_id, category, title, body) values (auth.uid(), 'beginner', '新手報到', '大家好')$$);
select t.login(:bob);
select t.ok('留言', format($$insert into public.comments (post_id, author_id, body) values (%s, auth.uid(), '好漂亮 @carol 來看')$$, :post1));
select id as c1 from public.comments limit 1 \gset
select t.ok('回覆', format($$insert into public.comments (post_id, author_id, parent_id, body) values (%s, auth.uid(), %s, '補充一下')$$, :post1, :c1));
select id as c2 from public.comments where parent_id is not null limit 1 \gset
select t.fails('只能回覆一層', format($$insert into public.comments (post_id, author_id, parent_id, body) values (%s, auth.uid(), %s, '第三層')$$, :post1, :c2), '第一層');
select t.eq('改不到別人的文章', $$with u as (update public.posts set title = '被改了' returning 1) select count(*) from u$$, '0');
select t.eq('刪不到別人的文章', $$with u as (delete from public.posts returning 1) select count(*) from u$$, '0');
select t.ok('按讚', format($$insert into public.post_likes (post_id, user_id) values (%s, auth.uid())$$, :post1));
select t.su();
select t.eq('留言數與讚數由觸發器維護', format($$select comment_count || '/' || like_count from public.posts where id = %s$$, :post1), '2/1');
select t.eq('作者收到留言、回覆與按讚通知', format($$select count(*) from public.notifications where user_id = %L and type in ('comment','like')$$, :alice), '3');
select t.eq('@提及 產生通知', format($$select count(*) from public.notifications where user_id = %L and type = 'mention'$$, :carol), '1');
select t.login(:bob);
select t.eq('看不到別人的通知', $$select count(*) from public.notifications where user_id <> auth.uid()$$, '0');
do $$ begin
  for i in 1..28 loop
    insert into public.comments (post_id, author_id, body) select id, auth.uid(), '灌水 ' || i from public.posts order by id limit 1;
  end loop;
end $$;
select t.fails('留言限流 30 則/10 分鐘', format($$insert into public.comments (post_id, author_id, body) values (%s, auth.uid(), '第 31 則')$$, :post1), '太頻繁');
select t.anon();
select t.eq('未登入可讀公開文章', $$select count(*) from public.posts$$, '2');
select t.fails('未登入不能發文', $$insert into public.posts (author_id, category, title, body) values (null, 'share', 'xx', 'yy')$$, 'permission denied|row-level');

\echo '== 上架：保育類與飼育證明 =='
select t.login(:alice);
select t.fails('臺灣大鍬形蟲不得上架', format($$insert into public.listings (seller_id, species_id, title, stage, price, shipping_methods) values (auth.uid(), %s, '台大成蟲', 'adult', 3000, '{blackcat}')$$, :sp_p1), '保育類');
select t.fails('長角大鍬形蟲不得上架', format($$insert into public.listings (seller_id, species_id, title, stage, price, shipping_methods) values (auth.uid(), %s, '長角標本', 'specimen', 3000, '{blackcat}')$$, :sp_p2), '保育類');
select t.fails('臺灣長臂金龜不得上架', format($$insert into public.listings (seller_id, species_id, title, stage, price, shipping_methods, sale_type) values (auth.uid(), %s, '長臂', 'larva', 3000, '{blackcat}', 'auction')$$, :sp_p3), '保育類');
select t.fails('保育類不得刊登徵求', format($$insert into public.wanted_listings (user_id, species_id, title) values (auth.uid(), %s, '徵台大')$$, :sp_p1), '保育類');
select t.fails('台灣產活體缺飼育證明', format($$insert into public.listings (seller_id, species_id, title, stage, price, shipping_methods, origin, origin_is_taiwan) values (auth.uid(), %s, '獨角仙幼蟲', 'larva', 100, '{store}', '南投埔里', true)$$, :sp_tw), '飼育證明');
select t.ok('台灣產活體附證明可上架', format($$insert into public.listings (seller_id, species_id, title, stage, price, shipping_methods, origin, origin_is_taiwan, breeding_proof_path) values (auth.uid(), %s, '獨角仙幼蟲', 'larva', 100, '{store}', '南投埔里', true, auth.uid()::text || '/proof.webp')$$, :sp_tw));
select t.ok('台灣產標本不需證明', format($$insert into public.listings (seller_id, species_id, title, stage, price, shipping_methods, origin_is_taiwan) values (auth.uid(), %s, '獨角仙標本', 'specimen', 200, '{post}', true)$$, :sp_tw));
select t.ok('一般上架', format($$insert into public.listings (seller_id, species_id, title, stage, sex, size_mm, generation, origin, price, shipping_methods) values (auth.uid(), %s, 'DHH 145mm', 'adult', 'male', 145, 'CBF2', 'Guadeloupe', 8000, '{blackcat,meetup}')$$, :sp_ok));
select id as l1 from public.listings where title = 'DHH 145mm' \gset
select t.eq('學名由物種帶入', format($$select scientific_name from public.listings where id = %s$$, :l1), 'Dynastes hercules hercules');
select t.fails('改成保育類也被擋', format($$update public.listings set species_id = %s where id = %s$$, :sp_p1, :l1), '保育類');
select t.fails('賣家不能自行標為已售出', format($$update public.listings set status = 'sold' where id = %s$$, :l1), '無法直接變更');
select t.login(:dave);
select t.fails('新帳號不能上架', format($$insert into public.listings (seller_id, species_id, title, stage, price, shipping_methods) values (auth.uid(), %s, '新帳號賣', 'adult', 1, '{post}')$$, :sp_ok), '24 小時');
select t.login(:bob);
select t.eq('改不到別人的商品', $$with u as (update public.listings set price = 1 returning 1) select count(*) from u$$, '0');

\echo '== 交易狀態機 =='
select t.fails('不能直接新增訂單', format($$insert into public.orders (listing_id, buyer_id, seller_id, source, amount, status) values (%s, auth.uid(), %L, 'direct', 1, 'completed')$$, :l1, :alice), 'permission denied');
select t.fails('寄送方式需為賣家提供', format($$select public.create_order(%s, 'store')$$, :l1), '寄送方式');
select public.create_order(:l1, 'blackcat', '請幫我包保冷') as o1 \gset
select t.login(:alice);
select t.fails('不能買自己的商品', format($$select public.create_order(%s, 'blackcat')$$, :l1), '自己');
select t.fails('沒填收款資訊不能接受', format($$select public.order_transition(%s, 'accept')$$, :o1), '收款資訊');
select t.ok('賣家填收款帳戶', format($$select public.set_payment_info(%s, 'transfer', '822', '123456789012', '王小明')$$, :o1));
select t.fails('不能跳過狀態（未付款就出貨）', format($$select public.order_transition(%s, 'ship')$$, :o1), '不能執行');
select t.eq('接受 → 待付款', format($$select public.order_transition(%s, 'accept')$$, :o1), 'awaiting_payment');
select t.fails('不能直接改 orders.status', format($$update public.orders set status = 'completed' where id = %s$$, :o1), 'permission denied');
select t.login(:carol);
select t.fails('非當事人不能推進狀態', format($$select public.order_transition(%s, 'report_payment', '{"amount":8000}')$$, :o1), '當事人');
select t.eq('非當事人讀不到交易單', $$select count(*) from public.orders$$, '0');
select t.eq('非當事人讀不到收款帳戶', $$select count(*) from public.order_payment_info$$, '0');
select t.eq('非當事人讀不到時間軸', $$select count(*) from public.order_events$$, '0');
select t.fails('商品保留中不能再下單', format($$select public.create_order(%s, 'blackcat')$$, :l1), '無法下單');
select t.login(:alice);
select t.fails('賣家不能替買家回報付款', format($$select public.order_transition(%s, 'report_payment', '{"amount":8000}')$$, :o1), '不能執行');
select t.fails('期限未到不能回報未付款', format($$select public.order_transition(%s, 'report_unpaid')$$, :o1), '尚未到期');
select t.login(:bob);
select t.eq('買家看得到收款帳戶', $$select account_no from public.order_payment_info$$, '123456789012');
select t.eq('回報付款 → 已回報', format($$select public.order_transition(%s, 'report_payment', '{"amount":8000,"last5":"54321"}')$$, :o1), 'payment_reported');
select t.fails('買家不能自己確認收款', format($$select public.order_transition(%s, 'confirm_payment')$$, :o1), '不能執行');
select t.login(:alice);
select t.eq('確認收款 → 已付款', format($$select public.order_transition(%s, 'confirm_payment')$$, :o1), 'paid');
select t.eq('出貨 → 已出貨', format($$select public.order_transition(%s, 'ship', '{"tracking_no":"9876543210"}')$$, :o1), 'shipped');
select t.fails('未完成不能評價', format($$select public.submit_review(%s, 5, '讚')$$, :o1), '完成後');
select t.login(:bob);
select t.eq('確認收貨 → 完成', format($$select public.order_transition(%s, 'confirm_receipt')$$, :o1), 'completed');
select t.fails('完成後不能再變更', format($$select public.order_transition(%s, 'cancel')$$, :o1), '不能執行');
select t.ok('買家評價', format($$select public.submit_review(%s, 5, '包裝很用心')$$, :o1));
select t.fails('不能重複評價', format($$select public.submit_review(%s, 1, '改一下')$$, :o1), '已評價');
select t.fails('時間軸不可修改', $$update public.order_events set action = 'x'$$, 'permission denied');
select t.fails('時間軸不可刪除', $$delete from public.order_events$$, 'permission denied');
select t.su();
select t.fails('即使是資料庫擁有者也改不了時間軸', $$update public.order_events set action = 'x'$$, '不可修改');
select t.eq('時間軸 7 筆事件', format($$select count(*) from public.order_events where order_id = %s$$, :o1), '7');
select t.eq('每次轉換都通知到買家', format($$select count(*) from public.notifications where user_id = %L and type = 'order'$$, :bob), '4');
select t.eq('每次轉換都通知到賣家', format($$select count(*) from public.notifications where user_id = %L and type = 'order'$$, :alice), '3');
select t.eq('完成後商品標為已售出', format($$select status from public.listings where id = %s$$, :l1), 'sold');
select t.eq('信用分：完成 +1、好評 +1', format($$select credit_score from public.profiles where id = %L$$, :alice), '102');

\echo '== 糾紛與到貨死亡 =='
select t.login(:alice);
insert into public.listings (seller_id, species_id, title, stage, price, shipping_methods)
  select auth.uid(), id, '彩虹鍬成蟲', 'adult', 1500, '{blackcat}' from public.species where genus = 'Phalacrognathus' returning id as l2 \gset
select t.login(:carol);
select public.create_order(:l2, 'blackcat') as o2 \gset
select t.login(:alice);
select public.set_payment_info(:o2, 'transfer', '812', '99887766554', '王小明');
select t.eq('換了收款帳戶 → 提醒買家', format($$select public.payment_account_is_new(%s)::text$$, :o2), 'true');
select public.order_transition(:o2, 'accept');
select t.login(:carol);
select public.order_transition(:o2, 'report_payment', '{"amount":1500}');
select t.login(:alice);
select public.order_transition(:o2, 'confirm_payment');
select public.order_transition(:o2, 'ship');
select t.login(:carol);
select t.fails('到貨死亡沒有開箱影片被拒', format($$select public.order_transition(%s, 'open_dispute', '{"kind":"doa","description":"到貨時已經死亡，沒有動靜"}')$$, :o2), '開箱影片');
select t.su();
insert into public.video_uploads (owner_id, stream_uid, purpose) values (:bob, 'vid-bob', 'doa') returning id as v_bob \gset
insert into public.video_uploads (owner_id, stream_uid, purpose) values (:carol, 'vid-carol', 'doa') returning id as v_carol \gset
select t.login(:carol);
select t.fails('不能拿別人的影片申訴', format($$select public.order_transition(%s, 'open_dispute', '{"kind":"doa","description":"到貨時已經死亡，沒有動靜","video_upload_id":%s}')$$, :o2, :v_bob), '開箱影片');
select t.eq('附影片申訴 → 糾紛', format($$select public.order_transition(%s, 'open_dispute', '{"kind":"doa","description":"到貨時已經死亡，沒有動靜","video_upload_id":%s}')$$, :o2, :v_carol), 'disputed');
select t.fails('一般會員不能裁決', format($$select public.resolve_dispute(%s, 'cancelled', 'seller', 'x')$$, :o2), '版主');
select t.login(:mod);
select t.ok('版主裁決', format($$select public.resolve_dispute(%s, 'cancelled', 'seller', '影片顯示到貨即死亡，賣家應退款')$$, :o2));
select t.su();
select t.eq('裁決後賣方扣 15 分', format($$select credit_score from public.profiles where id = %L$$, :alice), '87');
select t.eq('取消後商品重新上架', format($$select status from public.listings where id = %s$$, :l2), 'active');

\echo '== 拍賣 =='
select t.login(:alice);
insert into public.listings (seller_id, sale_type, species_id, title, stage, price, shipping_methods)
  select auth.uid(), 'auction', id, '安達 85mm 拍賣', 'adult', 1, '{blackcat}' from public.species where scientific_name = 'Dorcus antaeus' returning id as l3 \gset
select t.fails('結標時間太近', format($$select public.create_auction(%s, 1000, 100, now() + interval '5 minutes')$$, :l3), '1 小時');
select t.ok('建立拍賣（底價 2000）', format($$select public.create_auction(%s, 1000, 100, now() + interval '2 hours', null, 2000)$$, :l3));
select t.fails('賣家不能出價', format($$select public.place_bid(%s, 5000)$$, :l3), '自己的拍賣');
select t.fails('不能直接寫入 bids', format($$insert into public.bids (listing_id, bidder_id, amount) values (%s, auth.uid(), 1)$$, :l3), 'permission denied');
select t.fails('不能直接改拍賣', $$update public.auctions set current_price = 1$$, 'permission denied');
select t.login(:dave);
select t.fails('新帳號不能出價', format($$select public.place_bid(%s, 1000)$$, :l3), '24 小時');
select t.login(:bob);
select t.fails('低於起標價', format($$select public.place_bid(%s, 900)$$, :l3), '至少 NT\$1000');
select t.eq('首次出價以起標價領先', format($$select public.place_bid(%s, 1500)->>'current_price'$$, :l3), '1000');
select t.eq('看不到底價', $$select count(*) from public.auction_secrets$$, '0');
select t.login(:carol);
select t.fails('低於最低加價', format($$select public.place_bid(%s, 1050)$$, :l3), '至少 NT\$1100');
select t.eq('未超過對方上限：被自動加價超過', format($$select (r->>'leading') || '/' || (r->>'current_price') from (select public.place_bid(%s, 1200) r) x$$, :l3), 'false/1300');
select t.eq('看不到別人的自動出價上限', $$select count(*) from public.auto_bids where bidder_id <> auth.uid()$$, '0');
select t.eq('超過對方上限：以上限加一口領先', format($$select (r->>'leading') || '/' || (r->>'current_price') from (select public.place_bid(%s, 3000) r) x$$, :l3), 'true/1600');
select t.eq('底價未達', format($$select reserve_met::text from public.auctions where listing_id = %s$$, :l3), 'false');
select t.eq('出價紀錄暱稱遮蔽', format($$select bidder from public.auction_bid_history(%s) where not is_me limit 1$$, :l3), 'b***b');
select t.login(:alice);
select t.fails('有人出價後不能修改', format($$update public.listings set title = '改標題' where id = %s$$, :l3), '已有人出價');
select t.fails('有人出價後不能刪除', format($$delete from public.listings where id = %s$$, :l3), '已有人出價');
select t.su();
update public.auctions set ends_at = now() + interval '2 minutes' where listing_id = :l3;
select t.login(:bob);
select t.eq('結標前 5 分鐘出價 → 延標', format($$select public.place_bid(%s, 2500)->>'extended'$$, :l3), 'true');
select t.su();
select t.eq('延長到約 5 分鐘後', format($$select (ends_at - now() > interval '4 minutes 50 seconds')::text from public.auctions where listing_id = %s$$, :l3), 'true');
select t.eq('被超標有通知', format($$select count(*) from public.notifications where user_id = %L and type = 'auction'$$, :bob), '1');
update public.auctions set ends_at = now() - interval '1 second' where listing_id = :l3;
select t.login(:bob);
select t.fails('結標後不能出價', format($$select public.place_bid(%s, 9000)$$, :l3), '已結標');
select t.su();
select t.eq('排程結標 1 場', $$select private.close_due_auctions()::text$$, '1');
select t.eq('達底價 → 成交', format($$select status || '/' || current_price from public.auctions where listing_id = %s$$, :l3), 'ended_sold/2600');
select t.eq('得標自動成立待付款交易單', format($$select status || '/' || amount || '/' || source from public.orders where listing_id = %s and buyer_id = %L$$, :l3, :carol), 'awaiting_payment/2600/auction');
select id as o3 from public.orders where listing_id = :l3 \gset
update public.orders set pay_by = now() - interval '1 hour' where id = :o3;
select t.login(:alice);
select t.eq('逾期未付款 → 取消', format($$select public.order_transition(%s, 'report_unpaid')$$, :o3), 'cancelled');
select t.su();
select t.eq('棄標：扣 10 分並記 1 次', format($$select credit_score || '/' || strikes from public.profiles where id = %L$$, :carol), '90/1');
-- 流標
select t.login(:alice);
insert into public.listings (seller_id, sale_type, species_id, title, stage, price, shipping_methods)
  select auth.uid(), 'auction', id, '流標測試', 'adult', 1, '{blackcat}' from public.species where scientific_name = 'Dorcus antaeus' returning id as l4 \gset
select public.create_auction(:l4, 500, 50, now() + interval '2 hours', 3000);
select t.su();
update public.auctions set ends_at = now() - interval '1 second' where listing_id = :l4;
select private.close_due_auctions();
select t.eq('無人出價 → 流標', format($$select a.status || '/' || l.status from public.auctions a join public.listings l on l.id = a.listing_id where a.listing_id = %s$$, :l4), 'ended_unsold/closed');

\echo '== 好友／封鎖／私訊 =='
select t.login(:bob);
select t.eq('送出好友邀請', format($$select public.send_friend_request(%L)$$, :alice), 'pending');
select t.fails('不能直接寫入 friendships', format($$insert into public.friendships (requester_id, addressee_id, status) values (auth.uid(), %L, 'accepted')$$, :carol), 'permission denied');
select t.login(:carol);
select t.eq('非當事人讀不到好友邀請', $$select count(*) from public.friendships$$, '0');
select t.fails('不能替別人回應邀請', $$select public.respond_friend_request((select max(id) from public.friendships), true)$$, '找不到');
select t.login(:alice);
select t.ok('接受邀請', $$select public.respond_friend_request((select id from public.friendships), true)$$);
select t.eq('成為好友', format($$select public.are_friends(auth.uid(), %L)::text$$, :bob), 'true');
select t.ok('只接受好友私訊', $$update public.profiles set dm_friends_only = true where id = auth.uid()$$);
select t.login(:carol);
select t.fails('非好友被擋', format($$select public.send_message(%L, '哈囉')$$, :alice), '好友');
select t.login(:bob);
select public.send_message(:alice, '想問一下幼蟲還有嗎') as conv \gset
select t.fails('不能直接寫入 messages', format($$insert into public.messages (conversation_id, sender_id, body) values (%s, auth.uid(), 'x')$$, :conv), 'permission denied');
select t.login(:carol);
select t.eq('非當事人讀不到私訊', $$select count(*) from public.messages$$, '0');
select t.eq('非當事人讀不到對話', $$select count(*) from public.conversations$$, '0');
select t.login(:alice);
select t.eq('收件人讀得到', $$select count(*) from public.messages$$, '1');
select t.ok('封鎖', format($$insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), %L)$$, :bob));
select t.eq('封鎖後自動解除好友', $$select count(*) from public.friendships$$, '0');
select t.login(:bob);
select t.fails('被封鎖後不能傳訊', format($$select public.send_message(%L, '在嗎')$$, :alice), '無法傳送');
select t.fails('被封鎖後不能加好友', format($$select public.send_friend_request(%L)$$, :alice), '無法送出');
select t.fails('被封鎖後不能下單', format($$select public.create_order(%s, 'blackcat')$$, :l2), '無法與此賣家');

\echo '== 媒體數量 =='
select t.login(:alice);
insert into public.media (owner_id, kind, path) select auth.uid(), 'image', auth.uid()::text || '/' || g || '.webp' from generate_series(1, 12) g;
select t.fails('不能登記到別人的資料夾', $$insert into public.media (owner_id, kind, path) values (auth.uid(), 'image', 'someone-else/x.webp')$$, 'row-level security');
select t.fails('前端不能自己把照片標成已驗證', $$update public.media set status = 'ready'$$, 'permission denied');
select t.su();
select t.ok('文章掛 10 張', format($$update public.media set attached_type = 'post', attached_id = %s, status = 'ready' where id in (select id from public.media order by id limit 10)$$, :post1));
select t.fails('文章第 11 張被拒', format($$update public.media set attached_type = 'post', attached_id = %s where id = (select max(id) from public.media)$$, :post1), '最多 10 張');
select t.ok('留言掛 2 張', format($$update public.media set attached_type = 'comment', attached_id = %s where id in (select id from public.media where attached_type is null)$$, (select id from public.comments where author_id = :bob limit 1)::text)) where false;
insert into public.media (owner_id, kind, path) select :bob, 'image', :bob || '/c' || g || '.webp' from generate_series(1, 3) g;
select t.ok('留言掛 2 張', format($$update public.media set attached_type = 'comment', attached_id = %s where id in (select id from public.media where owner_id = %L order by id limit 2)$$, :c1, :bob));
select t.fails('留言第 3 張被拒', format($$update public.media set attached_type = 'comment', attached_id = %s where id = (select max(id) from public.media where owner_id = %L)$$, :c1, :bob), '最多 2 張');
select t.fails('不能掛到別人的文章', format($$update public.media set attached_type = 'post', attached_id = %s where id = (select max(id) from public.media where owner_id = %L)$$, :post1, :bob), '自己的內容');
insert into public.listings (seller_id, species_id, title, stage, price, shipping_methods) values (:alice, :sp_ok, '媒體測試', 'adult', 10, '{post}') returning id as l5 \gset
insert into public.media (owner_id, kind, path) select :alice, 'image', :alice || '/l' || g || '.webp' from generate_series(1, 9) g;
select t.ok('交易掛 8 張', format($$update public.media set attached_type = 'listing', attached_id = %s where id in (select id from public.media where path like '%%/l_.webp' order by id limit 8)$$, :l5));
select t.fails('交易第 9 張被拒', format($$update public.media set attached_type = 'listing', attached_id = %s where path like '%%/l9.webp'$$, :l5), '最多 8 張');
insert into public.video_uploads (owner_id, stream_uid, purpose) values (:alice, 'va1', 'media'), (:alice, 'va2', 'media');
select t.ok('交易掛 1 支影片', format($$insert into public.media (owner_id, kind, video_upload_id, attached_type, attached_id) select %L, 'video', id, 'listing', %s from public.video_uploads where stream_uid = 'va1'$$, :alice, :l5));
select t.fails('交易第 2 支影片被拒', format($$insert into public.media (owner_id, kind, video_upload_id, attached_type, attached_id) select %L, 'video', id, 'listing', %s from public.video_uploads where stream_uid = 'va2'$$, :alice, :l5), '最多 1 支');
select t.ok('新帳號第 1-3 支影片', format($$insert into public.video_uploads (owner_id, stream_uid, purpose) select %L, 'vd' || g, 'media' from generate_series(1, 3) g$$, :dave));
select t.fails('新帳號第 4 支影片被拒', format($$insert into public.video_uploads (owner_id, stream_uid, purpose) values (%L, 'vd4', 'media')$$, :dave), '已達上限');
select t.eq('信用良好的老會員上限 10 支', format($$select public.video_daily_limit(%L)::text$$, :bob), '10');
select t.login(:alice);
select t.fails('前端不能自己登記影片', $$insert into public.video_uploads (owner_id, stream_uid, purpose) values (auth.uid(), 'hack', 'media')$$, 'permission denied');

\echo '== 飼育紀錄 =='
select t.login(:alice);
insert into public.specimens (owner_id, species_id, label) values (auth.uid(), :sp_ok, 'DHH-01') returning id as s1 \gset
select t.ok('新增量測', format($$insert into public.specimen_measurements (specimen_id, measured_on, weight_g, head_width_mm) values (%s, current_date, 85.5, 14.2)$$, :s1));
select t.login(:bob);
select t.eq('私人個體別人看不到', $$select count(*) from public.specimens$$, '0');
select t.eq('私人量測別人看不到', $$select count(*) from public.specimen_measurements$$, '0');
select t.fails('不能替別人的個體加紀錄', format($$insert into public.specimen_measurements (specimen_id, measured_on, weight_g) values (%s, current_date, 1)$$, :s1), 'row-level security');
select t.login(:alice);
select t.ok('設為公開', format($$update public.specimens set visibility = 'public' where id = %s$$, :s1));
select t.anon();
select t.eq('公開個體可被看到', $$select count(*) from public.specimens$$, '1');

\echo '== 檢舉與版主 =='
select t.login(:bob);
select t.ok('檢舉', format($$insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'listing', '%s', 'scam')$$, :l5));
select t.fails('同一對象不能重複檢舉', format($$insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'listing', '%s', 'spam')$$, :l5), 'duplicate');
select t.login(:carol);
select t.ok('檢舉 2', format($$insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'listing', '%s', 'scam')$$, :l5));
select t.eq('看不到別人的檢舉', $$select count(*) from public.reports$$, '1');
select t.login(:dave);
select t.ok('檢舉 3', format($$insert into public.reports (reporter_id, target_type, target_id, reason) values (auth.uid(), 'listing', '%s', 'scam')$$, :l5));
select t.su();
select t.eq('3 人檢舉自動隱藏', format($$select status from public.listings where id = %s$$, :l5), 'hidden');
select t.login(:alice);
select t.eq('被隱藏後賣家不能自己改回', format($$with u as (update public.listings set status = 'active' where id = %s returning 1) select count(*) from u$$, :l5), '0');
select t.fails('一般會員不能停權別人', format($$select public.mod_ban(%L, 7, 'x')$$, :bob), '版主');
select t.fails('一般會員不能改物種表', $$update public.species set is_protected = false$$, '') where false;
select t.eq('一般會員改不動物種表', $$with u as (update public.species set is_protected = false returning 1) select count(*) from u$$, '0');
select t.login(:mod);
select t.ok('版主處理檢舉', $$select public.mod_handle_report((select min(id) from public.reports), 'resolved', '已下架')$$);
select t.eq('同對象檢舉一併結案', $$select count(*) from public.reports where status = 'open'$$, '0');
select t.ok('版主停權', format($$select public.mod_ban(%L, 7, '廣告')$$, :dave));
select t.fails('版主不能指派角色', format($$select public.admin_set_role(%L, 'moderator')$$, :bob), '管理員');
select t.login(:dave);
select t.fails('停權者不能發文', $$insert into public.posts (author_id, category, title, body) values (auth.uid(), 'share', '我又來了', '純文字')$$, 'row-level security');
select t.fails('停權者不能留言', format($$insert into public.comments (post_id, author_id, body) values (%s, auth.uid(), '純文字')$$, :post1), 'row-level security');
select t.fails('停權者不能出價', format($$select public.place_bid(%s, 99999)$$, :l3), '停權');
select t.fails('停權者不能傳私訊', format($$select public.send_message(%L, 'hi')$$, :carol), '停權');

\echo '== Storage 規則 =='
select t.su();
select t.eq('三個 bucket 都有大小與格式限制', $$select count(*) from storage.buckets where file_size_limit is not null and allowed_mime_types is not null$$, '3');
select t.eq('照片上限 1.5 MB', $$select file_size_limit::text from storage.buckets where id = 'media'$$, '1572864');
select t.login(:alice);
select t.fails('不能寫入別人的資料夾', format($$insert into storage.objects (bucket_id, name, owner_id) values ('media', %L || '/x.webp', auth.uid()::text)$$, :bob), 'row-level security');
select t.ok('可以寫入自己的資料夾', $$insert into storage.objects (bucket_id, name, owner_id) values ('media', auth.uid()::text || '/x.webp', auth.uid()::text)$$);
select t.login(:dave);
select t.fails('停權者不能上傳', $$insert into storage.objects (bucket_id, name, owner_id) values ('media', auth.uid()::text || '/x.webp', auth.uid()::text)$$, 'row-level security');

select t.su();
select t.eq('所有 public 資料表都開了 RLS', $$select count(*) from pg_tables where schemaname = 'public' and not rowsecurity$$, '0');
\echo '全部通過'
rollback;
