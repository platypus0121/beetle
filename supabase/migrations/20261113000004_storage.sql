-- 0004 Storage：bucket 的大小與格式限制由 Storage 服務強制，前端繞不過。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  -- 公開照片：壓縮後約 0.5 MB，上限 1.5 MB（原圖傳不上來）
  ('media',   'media',   true,  1572864, array['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', true,  524288,  array['image/jpeg','image/png','image/webp']),
  -- 私有：飼育證明、付款截圖、私訊圖片
  ('private', 'private', false, 1572864, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 每人每天最多上傳 300 個檔案
create or replace function private.storage_quota_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from storage.objects
           where owner_id = (select auth.uid())::text and created_at > now() - interval '1 day') < 300;
$$;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.storage_quota_ok() to authenticated;
alter default privileges in schema private revoke execute on functions from public;

-- 只能寫入自己的 {user_id}/ 資料夾；停權者不能上傳
create policy storage_insert_own on storage.objects for insert to authenticated
  with check (bucket_id in ('media','avatars','private')
              and (storage.foldername(name))[1] = (select auth.uid())::text
              and public.is_active()
              and private.storage_quota_ok());

create policy storage_delete_own on storage.objects for delete to authenticated
  using (bucket_id in ('media','avatars','private')
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_mod()));

create policy storage_read_public on storage.objects for select
  using (bucket_id in ('media','avatars'));

-- 私有檔案：本人、版主，或是相關交易／對話的另一方
create or replace function private.can_read_private(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select (storage.foldername(p_name))[1] = (select auth.uid())::text
      or public.is_mod()
      or exists (select 1 from public.payment_reports r join public.orders o on o.id = r.order_id
                  where r.screenshot_path = p_name and (select auth.uid()) in (o.buyer_id, o.seller_id))
      or exists (select 1 from public.messages m join public.conversations c on c.id = m.conversation_id
                  where m.image_path = p_name and (select auth.uid()) in (c.user_a, c.user_b));
$$;
grant execute on function private.can_read_private(text) to authenticated;

create policy storage_read_private on storage.objects for select to authenticated
  using (bucket_id = 'private' and private.can_read_private(name));

-- Realtime：私訊、通知、拍賣價格即時更新（仍受 RLS 限制）
alter publication supabase_realtime add table public.messages, public.notifications, public.auctions;
