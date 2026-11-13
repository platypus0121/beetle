-- 0002 RLS：所有資料表開啟 RLS，並以「先全部收回、再逐項授權」的方式設定權限。
-- 敏感資料表（訂單、出價、信用分、通知…）不給前端直接寫入，只能透過 0003 的資料庫函式。

-- ───────────── 輔助函式 ─────────────
create or replace function public.is_mod() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and role in ('moderator','admin'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and role = 'admin');
$$;

-- 已登入且未被停權
create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid())
                   and (banned_until is null or banned_until < now()));
$$;

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks
                 where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friendships
                 where status = 'accepted'
                   and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a)));
$$;

create or replace function public.is_order_party(oid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders
                 where id = oid and (select auth.uid()) in (buyer_id, seller_id));
$$;

create or replace function public.owns_specimen(sid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.specimens where id = sid and owner_id = (select auth.uid()));
$$;

create or replace function public.can_view_specimen(sid bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.specimens
                 where id = sid and (visibility = 'public' or owner_id = (select auth.uid())));
$$;

-- ───────────── 開啟 RLS、收回預設權限 ─────────────
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- ───────────── profiles ─────────────
grant select on public.profiles to anon, authenticated;
grant update (username, avatar_path, bio, city, dm_friends_only, onboarded) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ───────────── species ─────────────
grant select on public.species to anon, authenticated;
grant insert, update, delete on public.species to authenticated;
create policy species_read on public.species for select using (true);
create policy species_mod_write on public.species for all to authenticated
  using (public.is_mod()) with check (public.is_mod());

grant select, update on public.species_submissions to authenticated;
grant insert (user_id, common_name, scientific_name, japanese_name, family_group, note)
  on public.species_submissions to authenticated;
create policy subs_read on public.species_submissions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_mod());
create policy subs_insert on public.species_submissions for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active());
create policy subs_mod on public.species_submissions for update to authenticated
  using (public.is_mod()) with check (public.is_mod());

-- ───────────── posts ─────────────
grant select on public.posts to anon, authenticated;
grant insert (author_id, category, species_id, title, body, youtube_id, status) on public.posts to authenticated;
grant update (category, species_id, title, body, youtube_id, status) on public.posts to authenticated;
grant delete on public.posts to authenticated;
create policy posts_read on public.posts for select
  using (status = 'published' or author_id = (select auth.uid()) or public.is_mod());
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and status in ('draft','published') and public.is_active());
-- 被隱藏的文章作者不能自己改回公開
create policy posts_update on public.posts for update to authenticated
  using ((author_id = (select auth.uid()) and status <> 'hidden' and public.is_active()) or public.is_mod())
  with check ((author_id = (select auth.uid()) and status in ('draft','published')) or public.is_mod());
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_mod());

-- ───────────── comments ─────────────
grant select on public.comments to anon, authenticated;
grant insert (post_id, author_id, parent_id, body) on public.comments to authenticated;
grant update (body, status) on public.comments to authenticated;
grant delete on public.comments to authenticated;
create policy comments_read on public.comments for select
  using (status = 'published' or author_id = (select auth.uid()) or public.is_mod());
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_active());
create policy comments_update on public.comments for update to authenticated
  using ((author_id = (select auth.uid()) and status = 'published' and public.is_active()) or public.is_mod())
  with check ((author_id = (select auth.uid()) and status = 'published') or public.is_mod());
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_mod());

-- ───────────── likes / bookmarks ─────────────
grant select on public.post_likes, public.comment_likes to anon, authenticated;
grant insert (post_id, user_id), delete on public.post_likes to authenticated;
grant insert (comment_id, user_id), delete on public.comment_likes to authenticated;
create policy post_likes_read on public.post_likes for select using (true);
create policy post_likes_insert on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active());
create policy post_likes_delete on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));
create policy comment_likes_read on public.comment_likes for select using (true);
create policy comment_likes_insert on public.comment_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active());
create policy comment_likes_delete on public.comment_likes for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.bookmarks to authenticated;
grant insert (user_id, target_type, target_id) on public.bookmarks to authenticated;
create policy bookmarks_own on public.bookmarks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────────── listings ─────────────
grant select on public.listings to anon, authenticated;
grant insert (seller_id, sale_type, species_id, title, description, origin, origin_is_taiwan, generation,
              emerged_on, size_mm, sex, stage, price, shipping_methods, city, breeding_proof_path)
  on public.listings to authenticated;
grant update (species_id, title, description, origin, origin_is_taiwan, generation, emerged_on, size_mm,
              sex, stage, price, shipping_methods, city, breeding_proof_path, status)
  on public.listings to authenticated;
grant delete on public.listings to authenticated;
create policy listings_read on public.listings for select
  using (status <> 'hidden' or seller_id = (select auth.uid()) or public.is_mod());
create policy listings_insert on public.listings for insert to authenticated
  with check (seller_id = (select auth.uid()) and public.is_active());
create policy listings_update on public.listings for update to authenticated
  using ((seller_id = (select auth.uid()) and status <> 'hidden' and public.is_active()) or public.is_mod())
  with check ((seller_id = (select auth.uid()) and status <> 'hidden') or public.is_mod());
create policy listings_delete on public.listings for delete to authenticated
  using (seller_id = (select auth.uid()) or public.is_mod());

grant select on public.wanted_listings to anon, authenticated;
grant insert (user_id, species_id, title, description, budget, city) on public.wanted_listings to authenticated;
grant update (species_id, title, description, budget, city, status) on public.wanted_listings to authenticated;
grant delete on public.wanted_listings to authenticated;
create policy wanted_read on public.wanted_listings for select
  using (status <> 'hidden' or user_id = (select auth.uid()) or public.is_mod());
create policy wanted_insert on public.wanted_listings for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active());
create policy wanted_update on public.wanted_listings for update to authenticated
  using ((user_id = (select auth.uid()) and status <> 'hidden') or public.is_mod())
  with check ((user_id = (select auth.uid()) and status <> 'hidden') or public.is_mod());
create policy wanted_delete on public.wanted_listings for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_mod());

-- ───────────── 拍賣：只能讀，寫入一律走函式 ─────────────
grant select on public.auctions to anon, authenticated;
create policy auctions_read on public.auctions for select using (true);

grant select on public.auction_secrets to authenticated;
create policy auction_secrets_seller on public.auction_secrets for select to authenticated
  using (exists (select 1 from public.listings l
                 where l.id = listing_id and l.seller_id = (select auth.uid())));

-- 出價紀錄：本人看得到自己的；公開的遮蔽版本由 auction_bid_history() 提供
grant select on public.bids to authenticated;
create policy bids_own on public.bids for select to authenticated
  using (bidder_id = (select auth.uid()) or public.is_mod());

grant select on public.auto_bids to authenticated;
create policy auto_bids_own on public.auto_bids for select to authenticated
  using (bidder_id = (select auth.uid()));

-- ───────────── 交易單：只能讀，寫入一律走函式 ─────────────
grant select on public.orders, public.order_payment_info, public.payment_reports,
                public.order_events, public.order_messages, public.disputes to authenticated;
create policy orders_read on public.orders for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id) or public.is_mod());
create policy opi_read on public.order_payment_info for select to authenticated
  using (public.is_order_party(order_id) or public.is_mod());
create policy payrep_read on public.payment_reports for select to authenticated
  using (public.is_order_party(order_id) or public.is_mod());
create policy order_events_read on public.order_events for select to authenticated
  using (public.is_order_party(order_id) or public.is_mod());
create policy order_messages_read on public.order_messages for select to authenticated
  using (public.is_order_party(order_id) or public.is_mod());
create policy disputes_read on public.disputes for select to authenticated
  using (public.is_order_party(order_id) or public.is_mod());

grant insert (order_id, sender_id, body) on public.order_messages to authenticated;
create policy order_messages_insert on public.order_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_active()
              and (public.is_order_party(order_id) or public.is_mod()));

grant select, delete on public.seller_payout_accounts to authenticated;
grant insert (user_id, bank_code, account_no, account_name) on public.seller_payout_accounts to authenticated;
create policy payout_own on public.seller_payout_accounts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on public.reviews to anon, authenticated;
create policy reviews_read on public.reviews for select using (true);

grant select on public.credit_events to authenticated;
create policy credit_events_read on public.credit_events for select to authenticated
  using (user_id = (select auth.uid()) or public.is_mod());

-- ───────────── 媒體 ─────────────
grant select on public.media to anon, authenticated;
grant insert (owner_id, kind, path) on public.media to authenticated;
grant delete on public.media to authenticated;
create policy media_read on public.media for select
  using (status = 'ready' or owner_id = (select auth.uid()) or public.is_mod());
-- 前端只能登記「待驗證」的照片；驗證與掛載由伺服器端完成
create policy media_insert on public.media for insert to authenticated
  with check (owner_id = (select auth.uid()) and kind = 'image' and public.is_active()
              and path like (select auth.uid())::text || '/%');
create policy media_delete on public.media for delete to authenticated
  using (owner_id = (select auth.uid()) or public.is_mod());

grant select on public.video_uploads to authenticated;
create policy video_uploads_read on public.video_uploads for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_mod());

-- ───────────── 社群 ─────────────
grant select on public.friendships to authenticated;
create policy friendships_read on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

grant select on public.user_follows to anon, authenticated;
grant insert (follower_id, followee_id), delete on public.user_follows to authenticated;
create policy user_follows_read on public.user_follows for select using (true);
create policy user_follows_insert on public.user_follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and public.is_active()
              and not public.is_blocked_between(follower_id, followee_id));
create policy user_follows_delete on public.user_follows for delete to authenticated
  using (follower_id = (select auth.uid()));

grant select, delete on public.species_follows to authenticated;
grant insert (user_id, species_id) on public.species_follows to authenticated;
create policy species_follows_own on public.species_follows for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, delete on public.blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;
create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

grant select on public.conversations, public.messages to authenticated;
create policy conversations_read on public.conversations for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy messages_read on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id and (select auth.uid()) in (c.user_a, c.user_b))
         or public.is_mod() and exists (select 1 from public.reports r
                 where r.target_type = 'message' and r.target_id = messages.id::text));

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;
create policy notifications_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_mark on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.notification_settings to authenticated;
create policy notification_settings_own on public.notification_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────────── 飼育紀錄 ─────────────
grant select on public.specimens, public.specimen_measurements, public.bottle_changes,
                public.specimen_events to anon, authenticated;
grant select on public.temperature_logs to authenticated;
grant insert, update, delete on public.specimens, public.specimen_measurements, public.bottle_changes,
                public.specimen_events, public.temperature_logs to authenticated;

create policy specimens_read on public.specimens for select
  using (visibility = 'public' or owner_id = (select auth.uid()));
create policy specimens_insert on public.specimens for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_active());
create policy specimens_update on public.specimens for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy specimens_delete on public.specimens for delete to authenticated
  using (owner_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['specimen_measurements','bottle_changes','specimen_events'] loop
    execute format('create policy %I on public.%I for select using (public.can_view_specimen(specimen_id))', t || '_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.owns_specimen(specimen_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.owns_specimen(specimen_id)) with check (public.owns_specimen(specimen_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.owns_specimen(specimen_id))', t || '_delete', t);
  end loop;
end $$;

create policy temperature_logs_own on public.temperature_logs for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid())
              and (specimen_id is null or public.owns_specimen(specimen_id)));

-- ───────────── 管理 ─────────────
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, detail) on public.reports to authenticated;
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_mod());
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and public.is_active());

grant select, insert, delete on public.banned_words to authenticated;
create policy banned_words_mod on public.banned_words for all to authenticated
  using (public.is_mod()) with check (public.is_mod());

grant select on public.moderation_log to authenticated;
create policy moderation_log_mod on public.moderation_log for select to authenticated
  using (public.is_mod());

grant select on public.shops to anon, authenticated;
grant insert, update, delete on public.shops to authenticated;
create policy shops_read on public.shops for select using (status = 'open' or public.is_mod());
create policy shops_mod on public.shops for all to authenticated
  using (public.is_mod()) with check (public.is_mod());
