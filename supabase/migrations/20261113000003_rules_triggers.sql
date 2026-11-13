-- 0003 規則、觸發器與資料庫函式。
-- private schema 不對 API 開放；public 內的函式才是前端可呼叫的 RPC。
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ═════════════════════ 共用 ═════════════════════
create or replace function private.notify(
  p_user uuid, p_type text, p_title text, p_body text, p_link text, p_actor uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  if exists (select 1 from public.notification_settings
             where user_id = p_user and type = p_type and not enabled) then return; end if;
  if p_actor is not null and exists (select 1 from public.blocks
             where blocker_id = p_user and blocked_id = p_actor) then return; end if;
  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (p_user, p_type, p_title, left(p_body, 200), p_link, p_actor);
end $$;

create or replace function private.apply_credit(p_user uuid, p_delta int, p_reason text, p_order bigint default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.credit_events (user_id, delta, reason, order_id) values (p_user, p_delta, p_reason, p_order);
  update public.profiles set credit_score = greatest(0, credit_score + p_delta) where id = p_user;
end $$;

create or replace function private.username(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select username from public.profiles where id = p_user;
$$;

-- 需要登入且未停權，回傳 uid
create or replace function private.require_active() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception '請先登入' using errcode = 'P0001'; end if;
  if not public.is_active() then raise exception '帳號停權中，無法執行此操作' using errcode = 'P0001'; end if;
  return v;
end $$;

create or replace function private.account_age(p_user uuid) returns interval
language sql stable security definer set search_path = '' as $$
  select now() - created_at from public.profiles where id = p_user;
$$;

-- ═════════════════════ 會員建立 ═════════════════════
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 10));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.tg_profile_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.username !~ '^[^\s@/\\<>]+$' then
    raise exception '暱稱不可包含空白或 @ / \ < > 符號';
  end if;
  return new;
end $$;
create trigger profile_guard before insert or update of username on public.profiles
  for each row execute function private.tg_profile_guard();

-- ═════════════════════ 限流（通用觸發器）═════════════════════
-- 參數：使用者欄位、時間窗、上限、訊息
create or replace function private.tg_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null or public.is_mod() then return new; end if;
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2::interval',
                 tg_table_schema, tg_table_name, tg_argv[0])
    into v_count using v_uid, tg_argv[1];
  if v_count >= tg_argv[2]::int then
    raise exception '%', tg_argv[3] using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger rate_posts before insert on public.posts for each row
  execute function private.tg_rate_limit('author_id', '1 hour', '5', '發文太頻繁，每小時最多 5 篇，請稍後再試');
create trigger rate_comments before insert on public.comments for each row
  execute function private.tg_rate_limit('author_id', '10 minutes', '30', '留言太頻繁，請稍後再試');
create trigger rate_listings before insert on public.listings for each row
  execute function private.tg_rate_limit('seller_id', '1 day', '10', '每天最多上架 10 件商品');
create trigger rate_wanted before insert on public.wanted_listings for each row
  execute function private.tg_rate_limit('user_id', '1 day', '5', '每天最多刊登 5 則徵求');
create trigger rate_reports before insert on public.reports for each row
  execute function private.tg_rate_limit('reporter_id', '1 day', '10', '每天最多檢舉 10 次');
create trigger rate_order_messages before insert on public.order_messages for each row
  execute function private.tg_rate_limit('sender_id', '10 minutes', '30', '留言太頻繁，請稍後再試');
create trigger rate_subs before insert on public.species_submissions for each row
  execute function private.tg_rate_limit('user_id', '1 day', '5', '每天最多提報 5 個物種');
create trigger rate_media before insert on public.media for each row
  execute function private.tg_rate_limit('owner_id', '1 day', '200', '今日照片上傳數已達上限');

-- ═════════════════════ 防廣告 ═════════════════════
create or replace function private.content_guard(p_text text, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_links int;
  v_word text;
begin
  if p_user is null or public.is_mod() then return; end if;
  select word into v_word from public.banned_words
   where position(lower(word) in lower(p_text)) > 0 limit 1;
  if v_word is not null then
    raise exception '內容含有禁用詞，無法送出' using errcode = 'P0001';
  end if;
  select count(*) into v_links from regexp_matches(p_text, '(https?://|www\.)', 'gi');
  if v_links > 0 and private.account_age(p_user) < interval '24 hours' then
    raise exception '註冊未滿 24 小時的帳號不能張貼連結' using errcode = 'P0001';
  end if;
  if v_links > 5 then
    raise exception '單則內容最多 5 個連結' using errcode = 'P0001';
  end if;
end $$;

create or replace function private.tg_post_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.content_guard(new.title || ' ' || new.body, auth.uid());
  if tg_op = 'INSERT' and auth.uid() is not null and exists (
       select 1 from public.posts where author_id = new.author_id and body = new.body
          and created_at > now() - interval '1 day') then
    raise exception '請勿重複張貼相同內容' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger post_guard before insert or update on public.posts
  for each row execute function private.tg_post_guard();

create or replace function private.tg_comment_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_parent public.comments;
begin
  perform private.content_guard(new.body, auth.uid());
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.posts where id = new.post_id and status = 'published') then
      raise exception '此文章無法留言' using errcode = 'P0001';
    end if;
    if new.parent_id is not null then
      select * into v_parent from public.comments where id = new.parent_id;
      if v_parent.post_id <> new.post_id or v_parent.parent_id is not null then
        raise exception '只能回覆第一層留言' using errcode = 'P0001';
      end if;
    end if;
    if auth.uid() is not null and exists (
         select 1 from public.comments where author_id = new.author_id and body = new.body
            and created_at > now() - interval '10 minutes') then
      raise exception '請勿重複張貼相同內容' using errcode = 'P0001';
    end if;
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end $$;
create trigger comment_guard before insert or update on public.comments
  for each row execute function private.tg_comment_guard();

-- ═════════════════════ 計數與通知 ═════════════════════
create or replace function private.tg_comment_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_post public.posts;
  v_parent_author uuid;
  v_name text;
  m text[];
  v_target uuid;
begin
  if tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
    return old;
  end if;
  update public.posts set comment_count = comment_count + 1 where id = new.post_id returning * into v_post;
  v_name := private.username(new.author_id);
  if new.parent_id is not null then
    select author_id into v_parent_author from public.comments where id = new.parent_id;
    perform private.notify(v_parent_author, 'reply', v_name || ' 回覆了你的留言', new.body,
                           '/posts/' || new.post_id || '#c' || new.id, new.author_id);
  end if;
  if v_post.author_id is distinct from v_parent_author then
    perform private.notify(v_post.author_id, 'comment', v_name || ' 在「' || v_post.title || '」留言', new.body,
                           '/posts/' || new.post_id || '#c' || new.id, new.author_id);
  end if;
  for m in select regexp_matches(new.body, '@([^\s@/\\<>]{2,20})', 'g') loop
    select id into v_target from public.profiles where username = m[1];
    if v_target is not null and v_target is distinct from v_post.author_id
       and v_target is distinct from v_parent_author then
      perform private.notify(v_target, 'mention', v_name || ' 在留言中提到你', new.body,
                             '/posts/' || new.post_id || '#c' || new.id, new.author_id);
    end if;
  end loop;
  return new;
end $$;
create trigger comment_after after insert or delete on public.comments
  for each row execute function private.tg_comment_after();

create or replace function private.tg_post_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_post public.posts;
begin
  if tg_op = 'DELETE' then
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
    return old;
  end if;
  update public.posts set like_count = like_count + 1 where id = new.post_id returning * into v_post;
  perform private.notify(v_post.author_id, 'like', private.username(new.user_id) || ' 喜歡你的文章',
                         v_post.title, '/posts/' || new.post_id, new.user_id);
  return new;
end $$;
create trigger post_like_after after insert or delete on public.post_likes
  for each row execute function private.tg_post_like();

create or replace function private.tg_comment_like() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.comments set like_count = greatest(0, like_count - 1) where id = old.comment_id;
    return old;
  end if;
  update public.comments set like_count = like_count + 1 where id = new.comment_id;
  return new;
end $$;
create trigger comment_like_after after insert or delete on public.comment_likes
  for each row execute function private.tg_comment_like();

create or replace function private.tg_follow_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.followee_id, 'follow', private.username(new.follower_id) || ' 開始追蹤你',
                         null, '/u/' || new.follower_id, new.follower_id);
  return new;
end $$;
create trigger follow_after after insert on public.user_follows
  for each row execute function private.tg_follow_after();

-- 封鎖時自動解除好友與追蹤
create or replace function private.tg_block_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships
   where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
      or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  delete from public.user_follows
   where (follower_id = new.blocker_id and followee_id = new.blocked_id)
      or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end $$;
create trigger block_after after insert on public.blocks
  for each row execute function private.tg_block_after();

-- ═════════════════════ 上架規則 ═════════════════════
create or replace function private.tg_listing_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_species public.species;
  v_uid uuid := auth.uid();
  v_live boolean := new.stage in ('adult','larva','pupa','egg');
begin
  -- 保育類：一律不得上架
  if new.species_id is not null then
    select * into v_species from public.species where id = new.species_id;
    if v_species.is_protected then
      raise exception '「%」為保育類野生動物，依法不得買賣，無法上架', v_species.common_name
        using errcode = 'P0001';
    end if;
    new.scientific_name := v_species.scientific_name;
  else
    new.scientific_name := null;
  end if;

  -- 台灣產活體需附飼育證明
  if new.origin_is_taiwan and v_live and new.breeding_proof_path is null then
    raise exception '台灣產活體需上傳飼育證明才能上架' using errcode = 'P0001';
  end if;
  if new.breeding_proof_path is not null
     and new.breeding_proof_path not like new.seller_id::text || '/%' then
    raise exception '飼育證明檔案路徑不正確' using errcode = 'P0001';
  end if;

  perform private.content_guard(new.title || ' ' || new.description, v_uid);

  if tg_op = 'INSERT' then
    if v_uid is not null and not public.is_mod() and private.account_age(v_uid) < interval '24 hours' then
      raise exception '註冊滿 24 小時後才能上架' using errcode = 'P0001';
    end if;
    new.status := 'active';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger listing_guard before insert or update on public.listings
  for each row execute function private.tg_listing_guard();

-- 賣家直接修改商品時的限制。這支是 SECURITY INVOKER：
-- 前端直接更新時 current_user 是 authenticated；由交易流程的函式更新時是函式擁有者，不受此限。
create or replace function public.tg_listing_seller_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' or public.is_mod() then return new; end if;
  -- 賣家只能在「上架中／已下架」之間切換；保留中、已售出由交易流程決定
  if new.status is distinct from old.status
     and not (old.status in ('active','closed') and new.status in ('active','closed')) then
    raise exception '無法直接變更商品狀態' using errcode = 'P0001';
  end if;
  if old.status in ('reserved','sold') then
    raise exception '交易進行中或已售出的商品不能修改' using errcode = 'P0001';
  end if;
  if old.sale_type = 'auction' then
    if exists (select 1 from public.auctions where listing_id = old.id and (bid_count > 0 or status <> 'open')) then
      raise exception '已有人出價或已結標的拍賣不能修改' using errcode = 'P0001';
    end if;
    if new.status is distinct from old.status or new.price is distinct from old.price then
      raise exception '拍賣商品請使用「取消拍賣」' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger listing_seller_guard before update on public.listings
  for each row execute function public.tg_listing_seller_guard();

create or replace function private.tg_listing_delete_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_mod() or auth.uid() is null then return old; end if;
  if exists (select 1 from public.orders where listing_id = old.id) then
    raise exception '已有交易紀錄的商品不能刪除，請改為下架' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.auctions where listing_id = old.id and bid_count > 0) then
    raise exception '已有人出價的拍賣不能刪除' using errcode = 'P0001';
  end if;
  return old;
end $$;
create trigger listing_delete_guard before delete on public.listings
  for each row execute function private.tg_listing_delete_guard();

create or replace function private.tg_wanted_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.species_id is not null and exists
     (select 1 from public.species where id = new.species_id and is_protected) then
    raise exception '保育類野生動物依法不得買賣，無法刊登徵求' using errcode = 'P0001';
  end if;
  perform private.content_guard(new.title || ' ' || new.description, auth.uid());
  return new;
end $$;
create trigger wanted_guard before insert or update on public.wanted_listings
  for each row execute function private.tg_wanted_guard();

-- ═════════════════════ 媒體數量上限 ═════════════════════
-- 文章 10 張照片＋1 支影片；交易 8 張＋1 支；留言 2 張；飼育個體 20 張
create or replace function private.tg_media_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_max int;
  v_count int;
  v_owner uuid;
begin
  if new.attached_type is null then return new; end if;
  if new.attached_id is null then raise exception '缺少掛載對象'; end if;

  case new.attached_type
    when 'post' then select author_id into v_owner from public.posts where id = new.attached_id;
    when 'listing' then select seller_id into v_owner from public.listings where id = new.attached_id;
    when 'comment' then select author_id into v_owner from public.comments where id = new.attached_id;
    when 'specimen' then select owner_id into v_owner from public.specimens where id = new.attached_id;
  end case;
  if v_owner is distinct from new.owner_id then
    raise exception '只能在自己的內容上附加媒體' using errcode = 'P0001';
  end if;

  if new.kind = 'video' then
    v_max := case new.attached_type when 'post' then 1 when 'listing' then 1 else 0 end;
  else
    v_max := case new.attached_type when 'post' then 10 when 'listing' then 8
                                    when 'comment' then 2 else 20 end;
  end if;
  -- 鎖住同一個掛載對象，避免同時寫入時超量
  perform pg_advisory_xact_lock(hashtext(new.attached_type), new.attached_id::int);
  select count(*) into v_count from public.media
   where attached_type = new.attached_type and attached_id = new.attached_id
     and kind = new.kind and id <> new.id;
  if v_count >= v_max then
    raise exception '%', case when new.kind = 'video'
      then (case when v_max = 0 then '此處不能附加影片' else '每則最多 1 支影片' end)
      else format('照片數量超過上限（最多 %s 張）', v_max) end using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger media_limit before insert or update of attached_type, attached_id on public.media
  for each row execute function private.tg_media_limit();

-- 每日影片上傳數：新帳號 3 支，註冊滿 30 天且信用分 >= 100 者 10 支
create or replace function public.video_daily_limit(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case when role in ('moderator','admin') then 50
              when created_at < now() - interval '30 days' and credit_score >= 100 then 10
              else 3 end
    from public.profiles where id = p_user;
$$;

create or replace function private.tg_video_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_used int;
begin
  if exists (select 1 from public.profiles where id = new.owner_id and banned_until > now()) then
    raise exception '帳號停權中，無法上傳' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('video_quota'), hashtext(new.owner_id::text));
  select count(*) into v_used from public.video_uploads
   where owner_id = new.owner_id and created_at > now() - interval '1 day';
  if v_used >= public.video_daily_limit(new.owner_id) then
    raise exception '今日影片上傳數已達上限（%s 支）', public.video_daily_limit(new.owner_id)
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger video_quota before insert on public.video_uploads
  for each row execute function private.tg_video_quota();

-- ═════════════════════ 檢舉 ═════════════════════
create or replace function private.tg_report_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  select count(*) into v_n from public.reports
   where target_type = new.target_type and target_id = new.target_id and status = 'open';
  -- 被 3 位不同會員檢舉：自動隱藏待審
  if v_n >= 3 then
    if new.target_type = 'post' then
      update public.posts set status = 'hidden' where id = new.target_id::bigint and status = 'published';
    elsif new.target_type = 'comment' then
      update public.comments set status = 'hidden' where id = new.target_id::bigint;
    elsif new.target_type = 'listing' then
      update public.listings set status = 'hidden' where id = new.target_id::bigint and status = 'active';
    elsif new.target_type = 'wanted' then
      update public.wanted_listings set status = 'hidden' where id = new.target_id::bigint;
    end if;
  end if;
  return new;
end $$;
create trigger report_after after insert on public.reports
  for each row execute function private.tg_report_after();

-- ═════════════════════ 交易時間軸不可竄改 ═════════════════════
create or replace function private.tg_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% 的紀錄不可修改或刪除', tg_table_name using errcode = 'P0001';
end $$;
create trigger order_events_immutable before update or delete on public.order_events
  for each row execute function private.tg_immutable();
create trigger credit_events_immutable before update or delete on public.credit_events
  for each row execute function private.tg_immutable();

create or replace function private.tg_order_message_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_o public.orders;
begin
  select * into v_o from public.orders where id = new.order_id;
  perform private.notify(case when new.sender_id = v_o.buyer_id then v_o.seller_id else v_o.buyer_id end,
    'order', '交易單 #' || v_o.id || ' 有新留言', new.body, '/orders/' || v_o.id, new.sender_id);
  return new;
end $$;
create trigger order_message_after after insert on public.order_messages
  for each row execute function private.tg_order_message_after();

-- ═════════════════════ 交易狀態機 ═════════════════════
-- 寫入時間軸並通知買賣雙方
create or replace function private.order_event(
  p_order public.orders, p_actor uuid, p_action text, p_to text, p_title text,
  p_amount int default null, p_detail jsonb default '{}'
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.order_events (order_id, actor_id, action, from_status, to_status, amount, detail)
  values (p_order.id, p_actor, p_action, p_order.status, p_to, p_amount, coalesce(p_detail, '{}'));
  perform private.notify(p_order.buyer_id, 'order', '交易單 #' || p_order.id || '：' || p_title, null,
                         '/orders/' || p_order.id, p_actor);
  perform private.notify(p_order.seller_id, 'order', '交易單 #' || p_order.id || '：' || p_title, null,
                         '/orders/' || p_order.id, p_actor);
end $$;

-- 直購下單
create or replace function public.create_order(p_listing bigint, p_shipping text, p_note text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_l public.listings;
  v_o public.orders;
begin
  select * into v_l from public.listings where id = p_listing for update;
  if not found or v_l.status <> 'active' then raise exception '此商品目前無法下單' using errcode = 'P0001'; end if;
  if v_l.sale_type <> 'fixed' then raise exception '拍賣商品請以出價方式購買' using errcode = 'P0001'; end if;
  if v_l.seller_id = v_uid then raise exception '不能購買自己的商品' using errcode = 'P0001'; end if;
  if public.is_blocked_between(v_uid, v_l.seller_id) then raise exception '無法與此賣家交易' using errcode = 'P0001'; end if;
  if not (p_shipping = any (v_l.shipping_methods)) then raise exception '請選擇賣家提供的寄送方式' using errcode = 'P0001'; end if;
  if exists (select 1 from public.orders where listing_id = p_listing and buyer_id = v_uid
             and status not in ('completed','cancelled')) then
    raise exception '你已對此商品下單' using errcode = 'P0001';
  end if;
  if (select count(*) from public.orders where buyer_id = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception '今日下單次數已達上限' using errcode = 'P0001';
  end if;
  insert into public.orders (listing_id, buyer_id, seller_id, source, amount, shipping_method, buyer_note, status)
  values (p_listing, v_uid, v_l.seller_id, 'direct', v_l.price, p_shipping, nullif(left(p_note, 500), ''), 'requested')
  returning * into v_o;
  v_o.status := null;
  perform private.order_event(v_o, v_uid, 'create', 'requested', '買家已下單，等待賣家確認', v_o.amount,
                              jsonb_build_object('listing_title', v_l.title));
  return v_o.id;
end $$;

-- 賣家填寫收款資訊（只存在交易單內）
create or replace function public.set_payment_info(
  p_order bigint, p_method text, p_bank_code text default null, p_account_no text default null,
  p_account_name text default null, p_meetup_place text default null, p_meetup_time timestamptz default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_o public.orders;
begin
  select * into v_o from public.orders where id = p_order for update;
  if not found or v_o.seller_id <> v_uid then raise exception '只有賣家可以填寫收款資訊' using errcode = 'P0001'; end if;
  if v_o.status not in ('requested','awaiting_payment') then
    raise exception '此階段不能修改收款資訊' using errcode = 'P0001';
  end if;
  if p_method = 'transfer' and (p_bank_code is null or p_account_no is null or coalesce(p_account_name,'') = '') then
    raise exception '請填寫完整的銀行代碼、帳號與戶名' using errcode = 'P0001';
  elsif p_method = 'meetup' and coalesce(p_meetup_place,'') = '' then
    raise exception '請填寫面交地點' using errcode = 'P0001';
  end if;
  insert into public.order_payment_info as i
    (order_id, method, bank_code, account_no, account_name, meetup_place, meetup_time)
  values (p_order, p_method,
          case when p_method = 'transfer' then p_bank_code end,
          case when p_method = 'transfer' then p_account_no end,
          case when p_method = 'transfer' then p_account_name end,
          case when p_method = 'meetup' then p_meetup_place end,
          case when p_method = 'meetup' then p_meetup_time end)
  on conflict (order_id) do update set
    method = excluded.method, bank_code = excluded.bank_code, account_no = excluded.account_no,
    account_name = excluded.account_name, meetup_place = excluded.meetup_place,
    meetup_time = excluded.meetup_time, updated_at = now();
  perform private.order_event(v_o, v_uid, 'set_payment_info', v_o.status, '賣家已更新收款資訊', null,
    jsonb_build_object('method', p_method,
                       'account_tail', case when p_method = 'transfer' then right(p_account_no, 4) end));
end $$;

-- 這個收款帳戶是否與賣家過去完成交易時使用的不同（詐騙提醒用）
create or replace function public.payment_account_is_new(p_order bigint) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_o public.orders; v_i public.order_payment_info;
begin
  select * into v_o from public.orders where id = p_order;
  if not found or auth.uid() not in (v_o.buyer_id, v_o.seller_id) then return false; end if;
  select * into v_i from public.order_payment_info where order_id = p_order;
  if not found or v_i.method <> 'transfer' then return false; end if;
  if not exists (select 1 from public.orders o where o.seller_id = v_o.seller_id
                 and o.status = 'completed' and o.id <> p_order) then
    return false;  -- 沒有歷史可比，由「新賣家」提醒負責
  end if;
  return not exists (
    select 1 from public.orders o join public.order_payment_info i on i.order_id = o.id
     where o.seller_id = v_o.seller_id and o.status = 'completed' and o.id <> p_order
       and i.bank_code = v_i.bank_code and i.account_no = v_i.account_no);
end $$;

-- 棄標／未付款處分
create or replace function private.penalize_unpaid(p_o public.orders) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set strikes = strikes + 1 where id = p_o.buyer_id;
  perform private.apply_credit(p_o.buyer_id, -10,
    case when p_o.source = 'auction' then '得標未付款（棄標）' else '下單後未付款' end, p_o.id);
end $$;

-- 交易結束後釋放或標記商品
create or replace function private.settle_listing(p_o public.orders, p_to text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_to = 'completed' then
    update public.listings set status = 'sold' where id = p_o.listing_id;
  elsif p_to = 'cancelled' then
    update public.listings set status = case when p_o.source = 'direct' then 'active' else 'closed' end
     where id = p_o.listing_id and status = 'reserved';
  end if;
end $$;

create or replace function private.complete_order(p_o public.orders) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set completed_orders = completed_orders + 1 where id in (p_o.buyer_id, p_o.seller_id);
  perform private.apply_credit(p_o.buyer_id, 1, '完成交易', p_o.id);
  perform private.apply_credit(p_o.seller_id, 1, '完成交易', p_o.id);
  perform private.settle_listing(p_o, 'completed');
end $$;

-- 唯一能改變交易狀態的入口
create or replace function public.order_transition(p_order bigint, p_action text, p_payload jsonb default '{}')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_o public.orders;
  v_is_buyer boolean;
  v_is_seller boolean;
  v_to text;
  v_title text;
  v_amount int;
  v_detail jsonb := '{}';
  v_paid_at timestamptz;
  v_vid public.video_uploads;
  r record;
begin
  select * into v_o from public.orders where id = p_order for update;
  if not found then raise exception '找不到交易單' using errcode = 'P0001'; end if;
  v_is_buyer := v_uid = v_o.buyer_id;
  v_is_seller := v_uid = v_o.seller_id;
  if not (v_is_buyer or v_is_seller) then raise exception '你不是這筆交易的當事人' using errcode = 'P0001'; end if;

  if p_action = 'accept' and v_is_seller and v_o.status = 'requested' then
    if not exists (select 1 from public.order_payment_info where order_id = p_order) then
      raise exception '請先填寫收款資訊再接受訂單' using errcode = 'P0001';
    end if;
    perform 1 from public.listings where id = v_o.listing_id and status = 'active' for update;
    if not found then raise exception '商品已不在上架中' using errcode = 'P0001'; end if;
    update public.listings set status = 'reserved' where id = v_o.listing_id;
    v_to := 'awaiting_payment'; v_title := '賣家已接受訂單，請於 3 天內付款並回報';
    update public.orders set status = v_to, pay_by = now() + interval '3 days' where id = p_order;
    -- 同一商品的其他待確認訂單自動取消
    for r in select * from public.orders where listing_id = v_o.listing_id and status = 'requested' and id <> p_order for update loop
      update public.orders set status = 'cancelled', closed_at = now() where id = r.id;
      perform private.order_event(r, null, 'auto_cancel', 'cancelled', '商品已由其他買家成交，訂單自動取消');
    end loop;

  elsif p_action = 'decline' and v_is_seller and v_o.status = 'requested' then
    v_to := 'cancelled'; v_title := '賣家婉拒了訂單';
    update public.orders set status = v_to, closed_at = now() where id = p_order;

  elsif p_action = 'cancel' and v_o.status in ('requested','awaiting_payment') then
    v_to := 'cancelled';
    v_title := case when v_is_buyer then '買家取消了交易' else '賣家取消了交易' end;
    v_detail := jsonb_build_object('reason', left(p_payload->>'reason', 300));
    update public.orders set status = v_to, closed_at = now() where id = p_order;
    if v_o.status = 'awaiting_payment' then
      if v_is_buyer then perform private.penalize_unpaid(v_o);
      else perform private.apply_credit(v_o.seller_id, -5, '成立交易後賣家取消', v_o.id); end if;
    end if;
    perform private.settle_listing(v_o, 'cancelled');

  elsif p_action = 'report_payment' and v_is_buyer and v_o.status = 'awaiting_payment' then
    if not exists (select 1 from public.order_payment_info where order_id = p_order) then
      raise exception '賣家尚未提供收款資訊' using errcode = 'P0001';
    end if;
    v_amount := (p_payload->>'amount')::int;
    v_paid_at := coalesce((p_payload->>'paid_at')::timestamptz, now());
    if v_amount is null or v_amount <= 0 then raise exception '請填寫付款金額' using errcode = 'P0001'; end if;
    if v_paid_at > now() + interval '10 minutes' then raise exception '付款時間不能是未來' using errcode = 'P0001'; end if;
    if p_payload->>'screenshot_path' is not null
       and p_payload->>'screenshot_path' not like v_uid::text || '/%' then
      raise exception '截圖路徑不正確' using errcode = 'P0001';
    end if;
    insert into public.payment_reports (order_id, amount, paid_at, last5, method, screenshot_path)
    values (p_order, v_amount, v_paid_at, nullif(p_payload->>'last5',''),
            (select method from public.order_payment_info where order_id = p_order),
            nullif(p_payload->>'screenshot_path',''));
    v_to := 'payment_reported'; v_title := '買家已回報付款 NT$' || v_amount || '，請賣家確認';
    v_detail := jsonb_build_object('paid_at', v_paid_at, 'last5', p_payload->>'last5',
                                   'has_screenshot', p_payload->>'screenshot_path' is not null);
    update public.orders set status = v_to where id = p_order;

  elsif p_action = 'confirm_payment' and v_is_seller and v_o.status = 'payment_reported' then
    v_to := 'paid'; v_title := '賣家已確認收款，準備出貨';
    select amount into v_amount from public.payment_reports where order_id = p_order order by id desc limit 1;
    update public.orders set status = v_to where id = p_order;

  elsif p_action = 'reject_payment' and v_is_seller and v_o.status = 'payment_reported' then
    v_to := 'awaiting_payment'; v_title := '賣家表示尚未收到款項，請買家確認後重新回報';
    v_detail := jsonb_build_object('reason', left(p_payload->>'reason', 300));
    update public.orders set status = v_to, pay_by = greatest(pay_by, now() + interval '1 day') where id = p_order;

  elsif p_action = 'report_unpaid' and v_is_seller and v_o.status = 'awaiting_payment' then
    if v_o.pay_by > now() then raise exception '付款期限尚未到期' using errcode = 'P0001'; end if;
    v_to := 'cancelled'; v_title := '買家逾期未付款，交易取消';
    update public.orders set status = v_to, closed_at = now() where id = p_order;
    perform private.penalize_unpaid(v_o);
    perform private.settle_listing(v_o, 'cancelled');

  elsif p_action = 'ship' and v_is_seller and v_o.status = 'paid' then
    v_to := 'shipped'; v_title := '賣家已出貨';
    v_detail := jsonb_build_object('tracking_no', left(p_payload->>'tracking_no', 40));
    update public.orders set status = v_to, shipped_at = now(), tracking_no = left(p_payload->>'tracking_no', 40),
           auto_complete_at = now() + interval '7 days' where id = p_order;

  elsif p_action = 'confirm_receipt' and v_is_buyer and v_o.status = 'shipped' then
    v_to := 'completed'; v_title := '買家已確認收貨，交易完成';
    update public.orders set status = v_to, closed_at = now() where id = p_order;
    perform private.complete_order(v_o);

  elsif p_action = 'open_dispute' and v_o.status in ('payment_reported','paid','shipped') then
    if p_payload->>'kind' = 'doa' then
      if not (v_is_buyer and v_o.status = 'shipped') then
        raise exception '到貨死亡申訴需由買家在出貨後、確認收貨前提出' using errcode = 'P0001';
      end if;
      select * into v_vid from public.video_uploads where id = (p_payload->>'video_upload_id')::bigint;
      if not found or v_vid.owner_id <> v_uid or v_vid.purpose <> 'doa' or v_vid.status in ('error','deleted') then
        raise exception '到貨死亡申訴必須附上一刀未剪的開箱影片' using errcode = 'P0001';
      end if;
    end if;
    insert into public.disputes (order_id, opener_id, kind, description, video_upload_id, prev_status)
    values (p_order, v_uid, coalesce(p_payload->>'kind', 'other'), p_payload->>'description', v_vid.id, v_o.status);
    v_to := 'disputed';
    v_title := case when p_payload->>'kind' = 'doa' then '買家提出到貨死亡申訴，等待站方處理'
                    else '已提出交易糾紛申訴，等待站方處理' end;
    v_detail := jsonb_build_object('kind', coalesce(p_payload->>'kind', 'other'));
    update public.orders set status = v_to, auto_complete_at = null where id = p_order;

  else
    raise exception '目前的交易狀態不能執行這個操作' using errcode = 'P0001';
  end if;

  perform private.order_event(v_o, v_uid, p_action, v_to, v_title, v_amount, v_detail);
  return v_to;
end $$;

-- 版主裁決糾紛
create or replace function public.resolve_dispute(p_order bigint, p_outcome text, p_fault text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_o public.orders;
begin
  if not public.is_mod() then raise exception '需要版主權限' using errcode = 'P0001'; end if;
  if p_outcome not in ('completed','cancelled') or p_fault not in ('buyer','seller','none') then
    raise exception '裁決內容不正確' using errcode = 'P0001';
  end if;
  select * into v_o from public.orders where id = p_order for update;
  if not found or v_o.status <> 'disputed' then raise exception '此交易單不在糾紛狀態' using errcode = 'P0001'; end if;
  if v_uid in (v_o.buyer_id, v_o.seller_id) then raise exception '不能裁決自己的交易' using errcode = 'P0001'; end if;
  update public.disputes set status = 'resolved', outcome = p_outcome, fault = p_fault,
         resolution_note = left(p_note, 2000), resolved_by = v_uid, resolved_at = now()
   where order_id = p_order and status = 'open';
  update public.orders set status = p_outcome, closed_at = now() where id = p_order;
  if p_outcome = 'completed' then perform private.complete_order(v_o);
  else perform private.settle_listing(v_o, 'cancelled'); end if;
  if p_fault = 'buyer' then perform private.apply_credit(v_o.buyer_id, -15, '交易糾紛經站方判定為買方責任', v_o.id);
  elsif p_fault = 'seller' then perform private.apply_credit(v_o.seller_id, -15, '交易糾紛經站方判定為賣方責任', v_o.id);
  end if;
  perform private.order_event(v_o, v_uid, 'resolve', p_outcome,
    '站方已裁決：' || case p_outcome when 'completed' then '交易成立' else '交易取消' end, null,
    jsonb_build_object('fault', p_fault, 'note', left(p_note, 2000)));
  insert into public.moderation_log (mod_id, action, target_type, target_id, note)
  values (v_uid, 'resolve_dispute', 'order', p_order::text, p_outcome || '/' || p_fault);
end $$;

-- 評價：完成的交易雙方各一次
create or replace function public.submit_review(p_order bigint, p_rating int, p_body text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_o public.orders;
  v_reviewee uuid;
begin
  select * into v_o from public.orders where id = p_order;
  if not found or v_uid not in (v_o.buyer_id, v_o.seller_id) then raise exception '你不是這筆交易的當事人' using errcode = 'P0001'; end if;
  if v_o.status <> 'completed' then raise exception '交易完成後才能評價' using errcode = 'P0001'; end if;
  if p_rating not between 1 and 5 then raise exception '評分需為 1 到 5 星' using errcode = 'P0001'; end if;
  if exists (select 1 from public.reviews where order_id = p_order and reviewer_id = v_uid) then
    raise exception '你已評價過這筆交易' using errcode = 'P0001';
  end if;
  perform private.content_guard(coalesce(p_body, ''), v_uid);
  v_reviewee := case when v_uid = v_o.buyer_id then v_o.seller_id else v_o.buyer_id end;
  insert into public.reviews (order_id, reviewer_id, reviewee_id, reviewee_role, rating, body)
  values (p_order, v_uid, v_reviewee, case when v_uid = v_o.buyer_id then 'seller' else 'buyer' end,
          p_rating, coalesce(left(p_body, 500), ''));
  if p_rating >= 4 then perform private.apply_credit(v_reviewee, 1, '獲得好評', p_order);
  elsif p_rating <= 2 then perform private.apply_credit(v_reviewee, -2, '獲得負評', p_order); end if;
  perform private.notify(v_reviewee, 'review', private.username(v_uid) || ' 給了你 ' || p_rating || ' 星評價',
                         p_body, '/u/' || v_reviewee, v_uid);
end $$;

create or replace view public.profile_ratings with (security_invoker = true) as
  select reviewee_id as user_id, round(avg(rating), 1) as avg_rating, count(*)::int as review_count
    from public.reviews group by reviewee_id;
grant select on public.profile_ratings to anon, authenticated;

-- ═════════════════════ 拍賣 ═════════════════════
create or replace function public.create_auction(
  p_listing bigint, p_start_price int, p_min_increment int, p_ends_at timestamptz,
  p_buy_now int default null, p_reserve int default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_l public.listings;
begin
  select * into v_l from public.listings where id = p_listing for update;
  if not found or v_l.seller_id <> v_uid or v_l.sale_type <> 'auction' then
    raise exception '找不到可設定的拍賣商品' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.auctions where listing_id = p_listing) then
    raise exception '此商品已設定拍賣' using errcode = 'P0001';
  end if;
  if p_ends_at < now() + interval '1 hour' or p_ends_at > now() + interval '14 days' then
    raise exception '結標時間需在 1 小時後、14 天內' using errcode = 'P0001';
  end if;
  if p_reserve is not null and p_reserve <= p_start_price then
    raise exception '底價需高於起標價' using errcode = 'P0001';
  end if;
  insert into public.auctions (listing_id, start_price, min_increment, buy_now_price, has_reserve, reserve_met,
                               ends_at, current_price)
  values (p_listing, p_start_price, p_min_increment, p_buy_now, p_reserve is not null, p_reserve is null,
          p_ends_at, p_start_price);
  if p_reserve is not null then
    insert into public.auction_secrets (listing_id, reserve_price) values (p_listing, p_reserve);
  end if;
  update public.listings set price = p_start_price where id = p_listing;
end $$;

-- 出價。p_max 是出價者願意出的最高金額，系統以最低必要金額代為出價（自動出價）。
-- FOR UPDATE 鎖住拍賣列：同時進來的出價會排隊，逐一檢查。
create or replace function public.place_bid(p_listing bigint, p_max int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_a public.auctions;
  v_l public.listings;
  v_leader_max int;
  v_need int;
  v_new_price int;
  v_prev_leader uuid;
  v_extended boolean := false;
  v_reserve int;
  v_leading boolean;
begin
  select * into v_a from public.auctions where listing_id = p_listing for update;
  if not found then raise exception '找不到這場拍賣' using errcode = 'P0001'; end if;
  select * into v_l from public.listings where id = p_listing;

  if v_a.status <> 'open' or v_l.status <> 'active' then raise exception '拍賣已結束' using errcode = 'P0001'; end if;
  if v_a.ends_at <= now() then raise exception '拍賣已結標' using errcode = 'P0001'; end if;
  if v_l.seller_id = v_uid then raise exception '不能對自己的拍賣出價' using errcode = 'P0001'; end if;
  if public.is_blocked_between(v_uid, v_l.seller_id) then raise exception '無法參與此賣家的拍賣' using errcode = 'P0001'; end if;
  if private.account_age(v_uid) < interval '24 hours' then
    raise exception '註冊滿 24 小時後才能出價' using errcode = 'P0001';
  end if;
  if (select strikes from public.profiles where id = v_uid) >= 3 then
    raise exception '棄標紀錄達 3 次，已停止出價權限' using errcode = 'P0001';
  end if;
  if (select count(*) from public.bids where bidder_id = v_uid and not is_auto
        and created_at > now() - interval '10 minutes') >= 30 then
    raise exception '出價太頻繁，請稍後再試' using errcode = 'P0001';
  end if;
  if p_max is null or p_max > 10000000 then raise exception '出價金額不正確' using errcode = 'P0001'; end if;

  v_prev_leader := v_a.current_bidder_id;
  if v_prev_leader is not null then
    select max_amount into v_leader_max from public.auto_bids
     where listing_id = p_listing and bidder_id = v_prev_leader;
  end if;

  if v_prev_leader = v_uid then
    -- 已是最高出價者：只能提高自己的自動出價上限
    if p_max <= v_leader_max then
      raise exception '你目前是最高出價者，新的上限需高於 NT$%', v_leader_max using errcode = 'P0001';
    end if;
    v_new_price := v_a.current_price;
  else
    v_need := case when v_a.bid_count = 0 then v_a.start_price else v_a.current_price + v_a.min_increment end;
    if p_max < v_need then raise exception '出價需至少 NT$%', v_need using errcode = 'P0001'; end if;

    if v_prev_leader is null then
      v_new_price := v_a.start_price;
      insert into public.bids (listing_id, bidder_id, amount) values (p_listing, v_uid, v_new_price);
      v_a.bid_count := v_a.bid_count + 1;
      v_a.current_bidder_id := v_uid;
    elsif p_max > v_leader_max then
      -- 超過原最高者的上限：原最高者被推到上限，新出價者以「上限＋一口」得標價領先
      if v_leader_max > v_a.current_price then
        insert into public.bids (listing_id, bidder_id, amount, is_auto) values (p_listing, v_prev_leader, v_leader_max, true);
        v_a.bid_count := v_a.bid_count + 1;
      end if;
      v_new_price := least(p_max, v_leader_max + v_a.min_increment);
      insert into public.bids (listing_id, bidder_id, amount) values (p_listing, v_uid, v_new_price);
      v_a.bid_count := v_a.bid_count + 1;
      v_a.current_bidder_id := v_uid;
      perform private.notify(v_prev_leader, 'auction', '你的出價被超過了：' || v_l.title,
                             '目前價 NT$' || v_new_price, '/market/' || p_listing, null);
    else
      -- 未超過原最高者的上限：系統替原最高者自動加價
      insert into public.bids (listing_id, bidder_id, amount) values (p_listing, v_uid, p_max);
      v_new_price := least(v_leader_max, p_max + v_a.min_increment);
      insert into public.bids (listing_id, bidder_id, amount, is_auto) values (p_listing, v_prev_leader, v_new_price, true);
      v_a.bid_count := v_a.bid_count + 2;
    end if;
  end if;

  insert into public.auto_bids (listing_id, bidder_id, max_amount) values (p_listing, v_uid, p_max)
  on conflict (listing_id, bidder_id) do update set max_amount = excluded.max_amount, updated_at = now();

  -- 結標前 5 分鐘內有人出價：延長到「現在 + 5 分鐘」
  if v_a.ends_at - now() < interval '5 minutes' then
    v_a.ends_at := now() + interval '5 minutes';
    v_extended := true;
  end if;

  select reserve_price into v_reserve from public.auction_secrets where listing_id = p_listing;
  update public.auctions set current_price = v_new_price, current_bidder_id = v_a.current_bidder_id,
         bid_count = v_a.bid_count, ends_at = v_a.ends_at,
         reserve_met = (v_reserve is null or v_new_price >= v_reserve)
   where listing_id = p_listing;
  update public.listings set price = v_new_price where id = p_listing;

  v_leading := v_a.current_bidder_id = v_uid;
  return jsonb_build_object('leading', v_leading, 'current_price', v_new_price,
                            'ends_at', v_a.ends_at, 'extended', v_extended);
end $$;

-- 結標一場拍賣（呼叫前需已鎖住該列）
create or replace function private.close_auction(p_a public.auctions) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_l public.listings;
  v_o public.orders;
begin
  select * into v_l from public.listings where id = p_a.listing_id for update;
  if p_a.current_bidder_id is not null and p_a.reserve_met and v_l.status = 'active' then
    update public.auctions set status = 'ended_sold' where listing_id = p_a.listing_id;
    update public.listings set status = 'reserved' where id = p_a.listing_id;
    insert into public.orders (listing_id, buyer_id, seller_id, source, amount, status, pay_by)
    values (p_a.listing_id, p_a.current_bidder_id, v_l.seller_id, 'auction', p_a.current_price,
            'awaiting_payment', now() + interval '3 days')
    returning * into v_o;
    v_o.status := null;
    perform private.order_event(v_o, null, 'auction_won', 'awaiting_payment',
      '拍賣結標「' || v_l.title || '」，得標價 NT$' || p_a.current_price || '。請賣家填寫收款資訊，買家於 3 天內付款',
      p_a.current_price);
    -- 通知其他出價者
    perform private.notify(b.bidder_id, 'auction', '拍賣已結標：' || v_l.title, '很可惜，這次沒有得標',
                           '/market/' || p_a.listing_id, null)
       from (select distinct bidder_id from public.bids
              where listing_id = p_a.listing_id and bidder_id <> p_a.current_bidder_id) b;
  else
    update public.auctions set status = 'ended_unsold' where listing_id = p_a.listing_id;
    update public.listings set status = 'closed' where id = p_a.listing_id and status = 'active';
    perform private.notify(v_l.seller_id, 'auction', '拍賣流標：' || v_l.title,
      case when p_a.current_bidder_id is null then '沒有人出價' else '最高出價未達底價' end,
      '/market/' || p_a.listing_id, null);
    if p_a.current_bidder_id is not null then
      perform private.notify(p_a.current_bidder_id, 'auction', '拍賣流標：' || v_l.title, '最高出價未達賣家底價',
                             '/market/' || p_a.listing_id, null);
    end if;
  end if;
end $$;

-- 排程每分鐘呼叫；SKIP LOCKED 讓正在出價中的拍賣留到下一輪
create or replace function private.close_due_auctions() returns int
language plpgsql security definer set search_path = '' as $$
declare r public.auctions; n int := 0;
begin
  for r in select * from public.auctions where status = 'open' and ends_at <= now()
           order by ends_at for update skip locked loop
    perform private.close_auction(r);
    n := n + 1;
  end loop;
  return n;
end $$;

-- 直購價：尚無人出價時可直接買下
create or replace function public.buy_now(p_listing bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_a public.auctions;
  v_l public.listings;
  v_order bigint;
begin
  select * into v_a from public.auctions where listing_id = p_listing for update;
  select * into v_l from public.listings where id = p_listing;
  if not found or v_a.status <> 'open' or v_a.ends_at <= now() or v_l.status <> 'active' then
    raise exception '拍賣已結束' using errcode = 'P0001';
  end if;
  if v_a.buy_now_price is null then raise exception '此拍賣沒有直購價' using errcode = 'P0001'; end if;
  if v_a.bid_count > 0 then raise exception '已有人出價，不能再使用直購價' using errcode = 'P0001'; end if;
  if v_l.seller_id = v_uid then raise exception '不能購買自己的商品' using errcode = 'P0001'; end if;
  if public.is_blocked_between(v_uid, v_l.seller_id) then raise exception '無法與此賣家交易' using errcode = 'P0001'; end if;
  if private.account_age(v_uid) < interval '24 hours' then
    raise exception '註冊滿 24 小時後才能出價' using errcode = 'P0001';
  end if;
  insert into public.bids (listing_id, bidder_id, amount) values (p_listing, v_uid, v_a.buy_now_price);
  update public.auctions set current_price = v_a.buy_now_price, current_bidder_id = v_uid, bid_count = 1,
         reserve_met = true, ends_at = now() where listing_id = p_listing returning * into v_a;
  update public.listings set price = v_a.current_price where id = p_listing;
  perform private.close_auction(v_a);
  select id into v_order from public.orders where listing_id = p_listing and buyer_id = v_uid order by id desc limit 1;
  return v_order;
end $$;

create or replace function public.cancel_auction(p_listing bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_a public.auctions;
  v_l public.listings;
begin
  select * into v_a from public.auctions where listing_id = p_listing for update;
  select * into v_l from public.listings where id = p_listing;
  if not found or (v_l.seller_id <> v_uid and not public.is_mod()) then
    raise exception '找不到這場拍賣' using errcode = 'P0001';
  end if;
  if v_a.status <> 'open' then raise exception '拍賣已結束' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_reason, '')) < 5 then raise exception '請填寫取消原因（至少 5 個字）' using errcode = 'P0001'; end if;
  update public.auctions set status = 'cancelled', cancelled_reason = left(p_reason, 300) where listing_id = p_listing;
  update public.listings set status = 'closed' where id = p_listing;
  if v_a.bid_count > 0 and v_l.seller_id = v_uid then
    perform private.apply_credit(v_uid, -5, '已有人出價後取消拍賣', null);
  end if;
  perform private.notify(b.bidder_id, 'auction', '拍賣已取消：' || v_l.title, p_reason, '/market/' || p_listing, v_uid)
     from (select distinct bidder_id from public.bids where listing_id = p_listing) b;
end $$;

-- 公開的出價紀錄：暱稱遮蔽
create or replace function public.auction_bid_history(p_listing bigint)
returns table (id bigint, bidder text, is_me boolean, amount int, is_auto boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.id,
         left(p.username, 1) || '***' || case when char_length(p.username) > 2 then right(p.username, 1) else '' end,
         b.bidder_id = (select auth.uid()),
         b.amount, b.is_auto, b.created_at
    from public.bids b join public.profiles p on p.id = b.bidder_id
   where b.listing_id = p_listing
   order by b.id desc limit 100;
$$;

-- ═════════════════════ 好友 ═════════════════════
create or replace function public.send_friend_request(p_target uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_f public.friendships;
begin
  if p_target = v_uid then raise exception '不能加自己為好友' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then raise exception '找不到這位會員' using errcode = 'P0001'; end if;
  if public.is_blocked_between(v_uid, p_target) then raise exception '無法送出好友邀請' using errcode = 'P0001'; end if;
  select * into v_f from public.friendships
   where (requester_id = v_uid and addressee_id = p_target) or (requester_id = p_target and addressee_id = v_uid)
   for update;
  if found then
    if v_f.status = 'accepted' then return 'accepted'; end if;
    if v_f.requester_id = v_uid then return 'pending'; end if;
    -- 對方已先邀請我：直接成為好友
    update public.friendships set status = 'accepted', responded_at = now() where id = v_f.id;
    perform private.notify(p_target, 'friend', private.username(v_uid) || ' 接受了你的好友邀請', null, '/u/' || v_uid, v_uid);
    return 'accepted';
  end if;
  if (select count(*) from public.friendships where requester_id = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception '今日好友邀請次數已達上限' using errcode = 'P0001';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (v_uid, p_target);
  perform private.notify(p_target, 'friend', private.username(v_uid) || ' 想加你為好友', null, '/friends', v_uid);
  return 'pending';
end $$;

create or replace function public.respond_friend_request(p_id bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_f public.friendships;
begin
  select * into v_f from public.friendships where id = p_id for update;
  if not found or v_f.addressee_id <> v_uid or v_f.status <> 'pending' then
    raise exception '找不到這則好友邀請' using errcode = 'P0001';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now() where id = p_id;
    perform private.notify(v_f.requester_id, 'friend', private.username(v_uid) || ' 接受了你的好友邀請', null, '/u/' || v_uid, v_uid);
  else
    delete from public.friendships where id = p_id;
  end if;
end $$;

-- 解除好友或收回邀請
create or replace function public.remove_friend(p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception '請先登入' using errcode = 'P0001'; end if;
  delete from public.friendships
   where (requester_id = v_uid and addressee_id = p_target) or (requester_id = p_target and addressee_id = v_uid);
end $$;

-- ═════════════════════ 私訊 ═════════════════════
create or replace function public.send_message(p_recipient uuid, p_body text, p_image_path text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active();
  v_a uuid; v_b uuid;
  v_conv bigint;
  v_r public.profiles;
  v_friend boolean;
begin
  if p_recipient = v_uid then raise exception '不能傳訊息給自己' using errcode = 'P0001'; end if;
  select * into v_r from public.profiles where id = p_recipient;
  if not found then raise exception '找不到這位會員' using errcode = 'P0001'; end if;
  if public.is_blocked_between(v_uid, p_recipient) then raise exception '無法傳送訊息給這位會員' using errcode = 'P0001'; end if;
  v_friend := public.are_friends(v_uid, p_recipient);
  if v_r.dm_friends_only and not v_friend and not public.is_mod() then
    raise exception '對方只接受好友的私訊' using errcode = 'P0001';
  end if;
  p_body := coalesce(btrim(p_body), '');
  if p_body = '' and p_image_path is null then raise exception '訊息不能是空的' using errcode = 'P0001'; end if;
  if char_length(p_body) > 2000 then raise exception '訊息太長' using errcode = 'P0001'; end if;
  if p_image_path is not null and p_image_path not like v_uid::text || '/%' then
    raise exception '圖片路徑不正確' using errcode = 'P0001';
  end if;
  perform private.content_guard(p_body, v_uid);
  if (select count(*) from public.messages where sender_id = v_uid and created_at > now() - interval '10 minutes') >= 60 then
    raise exception '訊息傳送太頻繁，請稍後再試' using errcode = 'P0001';
  end if;

  v_a := least(v_uid, p_recipient); v_b := greatest(v_uid, p_recipient);
  select id into v_conv from public.conversations where user_a = v_a and user_b = v_b;
  if v_conv is null then
    -- 防廣告：新帳號每天最多主動聯絡 5 位非好友
    if not v_friend and private.account_age(v_uid) < interval '7 days' and not public.is_mod() and
       (select count(*) from public.conversations c
         where v_uid in (c.user_a, c.user_b) and c.created_at > now() - interval '1 day'
           and exists (select 1 from public.messages m where m.conversation_id = c.id and m.sender_id = v_uid
                        and m.id = (select min(id) from public.messages where conversation_id = c.id))) >= 5 then
      raise exception '新帳號每天最多主動私訊 5 位非好友會員' using errcode = 'P0001';
    end if;
    insert into public.conversations (user_a, user_b) values (v_a, v_b)
    on conflict (user_a, user_b) do update set last_message_at = now() returning id into v_conv;
  end if;
  insert into public.messages (conversation_id, sender_id, body, image_path)
  values (v_conv, v_uid, p_body, p_image_path);
  update public.conversations set last_message_at = now(),
         last_message_preview = case when p_body = '' then '[圖片]' else left(p_body, 60) end
   where id = v_conv;
  -- 同一對話未讀通知只留一則
  if not exists (select 1 from public.notifications where user_id = p_recipient and type = 'message'
                 and actor_id = v_uid and read_at is null) then
    perform private.notify(p_recipient, 'message', private.username(v_uid) || ' 傳了訊息給你',
                           case when p_body = '' then '[圖片]' else p_body end, '/messages/' || v_conv, v_uid);
  end if;
  return v_conv;
end $$;

create or replace function public.mark_conversation_read(p_conv bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (select 1 from public.conversations where id = p_conv and v_uid in (user_a, user_b)) then return; end if;
  update public.messages set read_at = now()
   where conversation_id = p_conv and sender_id <> v_uid and read_at is null;
  update public.notifications set read_at = now()
   where user_id = v_uid and type = 'message' and link = '/messages/' || p_conv and read_at is null;
end $$;

create or replace function public.unread_counts() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'notifications', (select count(*) from public.notifications
                       where user_id = (select auth.uid()) and read_at is null and type <> 'message'),
    'messages', (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id
                  where (select auth.uid()) in (c.user_a, c.user_b) and m.sender_id <> (select auth.uid())
                    and m.read_at is null));
$$;

-- ═════════════════════ 版主操作 ═════════════════════
create or replace function public.mod_set_hidden(p_type text, p_id bigint, p_hidden boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  if not public.is_mod() then raise exception '需要版主權限' using errcode = 'P0001'; end if;
  if p_type = 'post' then
    update public.posts set status = case when p_hidden then 'hidden' else 'published' end where id = p_id returning author_id into v_owner;
  elsif p_type = 'comment' then
    update public.comments set status = case when p_hidden then 'hidden' else 'published' end where id = p_id returning author_id into v_owner;
  elsif p_type = 'listing' then
    update public.listings set status = case when p_hidden then 'hidden' else 'closed' end
     where id = p_id and status in ('active','closed','hidden') returning seller_id into v_owner;
    if p_hidden then
      update public.auctions set status = 'cancelled', cancelled_reason = '站方下架' where listing_id = p_id and status = 'open';
    end if;
  elsif p_type = 'wanted' then
    update public.wanted_listings set status = case when p_hidden then 'hidden' else 'open' end where id = p_id returning user_id into v_owner;
  else
    raise exception '不支援的類型' using errcode = 'P0001';
  end if;
  insert into public.moderation_log (mod_id, action, target_type, target_id, note)
  values (auth.uid(), case when p_hidden then 'hide' else 'restore' end, p_type, p_id::text, p_note);
  if p_hidden then
    perform private.notify(v_owner, 'moderation', '你的內容已被站方隱藏', p_note, '/rules', null);
  end if;
end $$;

create or replace function public.mod_ban(p_user uuid, p_days int, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_mod() then raise exception '需要版主權限' using errcode = 'P0001'; end if;
  if exists (select 1 from public.profiles where id = p_user and role <> 'user') and not public.is_admin() then
    raise exception '只有管理員可以停權版主' using errcode = 'P0001';
  end if;
  update public.profiles
     set banned_until = case when p_days is null or p_days <= 0 then null
                             else now() + make_interval(days => p_days) end,
         ban_reason = case when p_days is null or p_days <= 0 then null else left(p_reason, 300) end
   where id = p_user;
  insert into public.moderation_log (mod_id, action, target_type, target_id, note)
  values (auth.uid(), case when p_days > 0 then 'ban' else 'unban' end, 'user', p_user::text,
          coalesce(p_days::text, '0') || ' 天：' || coalesce(p_reason, ''));
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception '需要管理員權限' using errcode = 'P0001'; end if;
  if p_role not in ('user','moderator','admin') then raise exception '角色不正確' using errcode = 'P0001'; end if;
  if p_user = auth.uid() then raise exception '不能變更自己的角色' using errcode = 'P0001'; end if;
  update public.profiles set role = p_role where id = p_user;
  insert into public.moderation_log (mod_id, action, target_type, target_id, note)
  values (auth.uid(), 'set_role', 'user', p_user::text, p_role);
end $$;

create or replace function public.mod_handle_report(p_id bigint, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_r public.reports;
begin
  if not public.is_mod() then raise exception '需要版主權限' using errcode = 'P0001'; end if;
  if p_status not in ('resolved','dismissed') then raise exception '狀態不正確' using errcode = 'P0001'; end if;
  select * into v_r from public.reports where id = p_id;
  if not found then raise exception '找不到檢舉' using errcode = 'P0001'; end if;
  -- 同一對象的所有未處理檢舉一併結案
  update public.reports set status = p_status, handled_by = auth.uid(), handled_at = now(), note = left(p_note, 500)
   where target_type = v_r.target_type and target_id = v_r.target_id and status = 'open';
  perform private.notify(r.reporter_id, 'report', '你的檢舉已處理',
            case p_status when 'resolved' then '站方已採取處置，感謝協助' else '經查未違反站規' end, null, null)
     from public.reports r
    where r.target_type = v_r.target_type and r.target_id = v_r.target_id and r.handled_at = now();
  insert into public.moderation_log (mod_id, action, target_type, target_id, note)
  values (auth.uid(), 'report_' || p_status, v_r.target_type, v_r.target_id, p_note);
end $$;

create or replace function public.mod_review_submission(p_id bigint, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_s public.species_submissions;
begin
  if not public.is_mod() then raise exception '需要版主權限' using errcode = 'P0001'; end if;
  select * into v_s from public.species_submissions where id = p_id and status = 'pending' for update;
  if not found then raise exception '找不到待審的提報' using errcode = 'P0001'; end if;
  if p_approve then
    insert into public.species (common_name, scientific_name, japanese_name, family_group, genus)
    values (v_s.common_name, v_s.scientific_name, v_s.japanese_name, v_s.family_group, split_part(v_s.scientific_name, ' ', 1))
    on conflict (scientific_name) do nothing;
  end if;
  update public.species_submissions set status = case when p_approve then 'approved' else 'rejected' end where id = p_id;
  perform private.notify(v_s.user_id, 'report', '你提報的物種「' || v_s.common_name || '」' ||
            case when p_approve then '已加入物種表' else '未被採用' end, null, '/species', null);
end $$;

-- ═════════════════════ 排程維護 ═════════════════════
create or replace function private.run_maintenance() returns void
language plpgsql security definer set search_path = '' as $$
declare r public.orders; b record;
begin
  perform private.close_due_auctions();

  -- 已出貨滿 7 天買家未確認：自動完成
  for r in select * from public.orders where status = 'shipped' and auto_complete_at <= now() for update skip locked loop
    update public.orders set status = 'completed', closed_at = now() where id = r.id;
    perform private.complete_order(r);
    perform private.order_event(r, null, 'auto_complete', 'completed', '出貨滿 7 天，系統自動完成交易');
  end loop;

  -- 付款期限到期提醒賣家（只提醒一次）
  for r in select o.* from public.orders o where o.status = 'awaiting_payment' and o.pay_by <= now()
             and not exists (select 1 from public.order_events e where e.order_id = o.id and e.action = 'pay_overdue'
                             and e.created_at > o.pay_by) loop
    perform private.order_event(r, null, 'pay_overdue', r.status, '付款期限已過，賣家可回報「買家未付款」');
  end loop;

  -- 換瓶提醒
  for b in select bc.id, bc.specimen_id, s.owner_id, s.label from public.bottle_changes bc
             join public.specimens s on s.id = bc.specimen_id
            where bc.next_due_on <= current_date and not bc.reminded and s.stage <> 'dead' loop
    perform private.notify(b.owner_id, 'breeding', '換瓶提醒：' || b.label, '已到預定換瓶日',
                           '/breeding/' || b.specimen_id, null);
    update public.bottle_changes set reminded = true where id = b.id;
  end loop;
end $$;

-- ═════════════════════ 函式執行權限 ═════════════════════
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on function public.auction_bid_history(bigint), public.is_mod(), public.is_admin(),
  public.is_active(), public.can_view_specimen(bigint), public.owns_specimen(bigint),
  public.is_order_party(bigint), public.is_blocked_between(uuid, uuid), public.are_friends(uuid, uuid) to anon;
alter default privileges in schema public revoke execute on functions from public, anon;
