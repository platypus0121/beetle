-- ═════════════════════ 瀏覽統計 ═════════════════════
-- 不記錄 IP 或任何個資：訪客只用一個隨機的匿名 cookie 編號，用來算「不重複訪客」與避免同一人重複灌文章瀏覽數。
-- 只能經由伺服器（service_role）呼叫 record_view() 寫入；瀏覽數另存一張表，
-- 不直接改 posts／listings（避免觸發「更新時間」與內容檢查觸發器）。

create table public.site_daily_stats (
  day date primary key,
  views int not null default 0,
  visitors int not null default 0
);

create table public.page_views_daily (
  day date not null,
  path text not null check (char_length(path) <= 200),
  views int not null default 0,
  primary key (day, path)
);

create table public.content_views (
  kind text not null check (kind in ('post', 'listing')),
  target_id bigint not null,
  views int not null default 0,
  primary key (kind, target_id)
);

-- 去重用：同一訪客同一天只算一次訪客、每篇內容只算一次瀏覽。保留 2 天後清除。
create table private.view_dedupe (
  day date not null,
  visitor uuid not null,
  key text not null,
  primary key (day, visitor, key)
);

alter table public.site_daily_stats enable row level security;
alter table public.page_views_daily enable row level security;
alter table public.content_views enable row level security;

revoke all on public.site_daily_stats, public.page_views_daily, public.content_views from anon, authenticated;
grant select on public.site_daily_stats, public.page_views_daily to authenticated;
grant select on public.content_views to anon, authenticated;
create policy site_stats_mod on public.site_daily_stats for select to authenticated using (public.is_mod());
create policy page_views_mod on public.page_views_daily for select to authenticated using (public.is_mod());
create policy content_views_read on public.content_views for select using (true);

create or replace function public.record_view(p_visitor uuid, p_path text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'Asia/Taipei')::date;
  v_new_visitor int;
  v_kind text;
  v_id bigint;
  v_new_content int;
begin
  if p_visitor is null or p_path is null or p_path !~ '^/[^\s]{0,199}$' then return; end if;

  insert into private.view_dedupe (day, visitor, key) values (v_day, p_visitor, 'site') on conflict do nothing;
  get diagnostics v_new_visitor = row_count;

  insert into public.site_daily_stats (day, views, visitors) values (v_day, 1, v_new_visitor)
  on conflict (day) do update set views = public.site_daily_stats.views + 1,
                                  visitors = public.site_daily_stats.visitors + excluded.visitors;

  insert into public.page_views_daily (day, path, views) values (v_day, p_path, 1)
  on conflict (day, path) do update set views = public.page_views_daily.views + 1;

  if p_path ~ '^/posts/\d{1,18}$' then
    v_kind := 'post'; v_id := substring(p_path from '\d+')::bigint;
    if not exists (select 1 from public.posts where id = v_id and status = 'published') then return; end if;
  elsif p_path ~ '^/market/\d{1,18}$' then
    v_kind := 'listing'; v_id := substring(p_path from '\d+')::bigint;
    if not exists (select 1 from public.listings where id = v_id and status <> 'hidden') then return; end if;
  else
    return;
  end if;

  insert into private.view_dedupe (day, visitor, key) values (v_day, p_visitor, v_kind || ':' || v_id) on conflict do nothing;
  get diagnostics v_new_content = row_count;
  if v_new_content = 1 then
    insert into public.content_views (kind, target_id, views) values (v_kind, v_id, 1)
    on conflict (kind, target_id) do update set views = public.content_views.views + 1;
  end if;
end $$;

revoke execute on function public.record_view(uuid, text) from public, anon, authenticated;
grant execute on function public.record_view(uuid, text) to service_role;

-- 公開顯示用：今日瀏覽、今日訪客、累計瀏覽
create or replace function public.site_totals()
returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'today_views', coalesce((select views from public.site_daily_stats where day = (now() at time zone 'Asia/Taipei')::date), 0),
    'today_visitors', coalesce((select visitors from public.site_daily_stats where day = (now() at time zone 'Asia/Taipei')::date), 0),
    'total_views', coalesce((select sum(views) from public.site_daily_stats), 0)
  );
$$;
revoke execute on function public.site_totals() from public;
grant execute on function public.site_totals() to anon, authenticated;

-- 每天清掉去重紀錄與半年前的逐頁統計
select cron.schedule('beetle-view-cleanup', '17 4 * * *', $$
  delete from private.view_dedupe where day < (now() at time zone 'Asia/Taipei')::date - 2;
  delete from public.page_views_daily where day < (now() at time zone 'Asia/Taipei')::date - 180;
$$);

-- ═════════════════════ 甲蟲店：代客溫控寄養 ═════════════════════
-- null = 尚未確認；true = 有提供；false = 確認不提供
alter table public.shops add column boarding boolean;
alter table public.shops add column boarding_note text check (char_length(boarding_note) <= 200);
