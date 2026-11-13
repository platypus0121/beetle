-- 0001 schema：所有資料表。RLS 在 0002，規則與函式在 0003。
create extension if not exists pg_trgm with schema extensions;

-- ───────────────────────── 會員 ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (char_length(username) between 2 and 20),
  avatar_path text,
  bio text check (char_length(bio) <= 500),
  city text check (char_length(city) <= 10),
  role text not null default 'user' check (role in ('user','moderator','admin')),
  banned_until timestamptz,
  ban_reason text,
  credit_score int not null default 100,
  completed_orders int not null default 0,
  strikes int not null default 0,
  dm_friends_only boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── 物種 ─────────────────────────
create table public.species (
  id bigint generated always as identity primary key,
  common_name text not null,
  scientific_name text not null unique,
  japanese_name text,
  aliases text not null default '',
  family_group text not null check (family_group in ('stag','rhino','scarab')),
  genus text not null,
  is_protected boolean not null default false,
  is_native_tw boolean not null default false,
  search_text text generated always as (
    lower(common_name || ' ' || scientific_name || ' ' || coalesce(japanese_name,'') || ' ' || aliases)
  ) stored,
  created_at timestamptz not null default now()
);
create index species_search_idx on public.species using gin (search_text extensions.gin_trgm_ops);

create table public.species_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  common_name text not null check (char_length(common_name) between 1 and 40),
  scientific_name text not null check (char_length(scientific_name) between 3 and 80),
  japanese_name text check (char_length(japanese_name) <= 40),
  family_group text not null check (family_group in ('stag','rhino','scarab')),
  note text check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── 文章／留言 ─────────────────────────
create table public.posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles on delete cascade,
  category text not null check (category in ('breeding','share','question','field','beginner','specimen')),
  species_id bigint references public.species,
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) between 1 and 10000),
  youtube_id text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  status text not null default 'published' check (status in ('draft','published','hidden')),
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_feed_idx on public.posts (status, created_at desc);
create index posts_species_idx on public.posts (species_id, created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_search_idx on public.posts using gin ((title || ' ' || body) extensions.gin_trgm_ops);

create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  parent_id bigint references public.comments on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'published' check (status in ('published','hidden')),
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.post_likes (
  post_id bigint not null references public.posts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table public.comment_likes (
  comment_id bigint not null references public.comments on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create table public.bookmarks (
  user_id uuid not null references public.profiles on delete cascade,
  target_type text not null check (target_type in ('post','listing')),
  target_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

-- ───────────────────────── 交易 ─────────────────────────
create table public.listings (
  id bigint generated always as identity primary key,
  seller_id uuid not null references public.profiles on delete cascade,
  sale_type text not null default 'fixed' check (sale_type in ('fixed','auction')),
  species_id bigint references public.species,
  scientific_name text,
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 5000),
  origin text check (char_length(origin) <= 60),
  origin_is_taiwan boolean not null default false,
  generation text check (char_length(generation) <= 20),
  emerged_on date,
  size_mm numeric(5,1) check (size_mm > 0 and size_mm < 250),
  sex text not null default 'unknown' check (sex in ('male','female','pair','unknown')),
  stage text not null check (stage in ('adult','larva','pupa','egg','specimen','supply')),
  is_live boolean generated always as (stage in ('adult','larva','pupa','egg')) stored,
  price int not null check (price > 0 and price <= 10000000),
  shipping_methods text[] not null check (
    cardinality(shipping_methods) between 1 and 5
    and shipping_methods <@ array['blackcat','post','store','meetup','other']
  ),
  city text check (char_length(city) <= 10),
  breeding_proof_path text,
  status text not null default 'active' check (status in ('active','reserved','sold','closed','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stage = 'supply' or species_id is not null)
);
create index listings_feed_idx on public.listings (status, created_at desc);
create index listings_species_idx on public.listings (species_id);
create index listings_seller_idx on public.listings (seller_id);

create table public.wanted_listings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  species_id bigint references public.species,
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  budget int check (budget > 0),
  city text check (char_length(city) <= 10),
  status text not null default 'open' check (status in ('open','closed','hidden')),
  created_at timestamptz not null default now()
);

create table public.auctions (
  listing_id bigint primary key references public.listings on delete cascade,
  start_price int not null check (start_price > 0),
  min_increment int not null check (min_increment > 0),
  buy_now_price int check (buy_now_price > start_price),
  has_reserve boolean not null default false,
  reserve_met boolean not null default true,
  ends_at timestamptz not null,
  current_price int not null,
  current_bidder_id uuid references public.profiles,
  bid_count int not null default 0,
  status text not null default 'open' check (status in ('open','ended_sold','ended_unsold','cancelled')),
  cancelled_reason text,
  created_at timestamptz not null default now()
);
create index auctions_due_idx on public.auctions (ends_at) where status = 'open';

-- 底價不公開：獨立一張只有賣家看得到的表
create table public.auction_secrets (
  listing_id bigint primary key references public.auctions on delete cascade,
  reserve_price int not null check (reserve_price > 0)
);

create table public.bids (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.auctions on delete cascade,
  bidder_id uuid not null references public.profiles on delete cascade,
  amount int not null,
  is_auto boolean not null default false,
  created_at timestamptz not null default clock_timestamp()
);
create index bids_listing_idx on public.bids (listing_id, id desc);
create index bids_bidder_idx on public.bids (bidder_id, created_at desc);

create table public.auto_bids (
  listing_id bigint not null references public.auctions on delete cascade,
  bidder_id uuid not null references public.profiles on delete cascade,
  max_amount int not null,
  updated_at timestamptz not null default now(),
  primary key (listing_id, bidder_id)
);

create table public.orders (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings,
  buyer_id uuid not null references public.profiles,
  seller_id uuid not null references public.profiles,
  source text not null check (source in ('direct','auction')),
  amount int not null check (amount > 0),
  shipping_method text,
  buyer_note text check (char_length(buyer_note) <= 500),
  status text not null check (status in
    ('requested','awaiting_payment','payment_reported','paid','shipped','completed','disputed','cancelled')),
  pay_by timestamptz,
  auto_complete_at timestamptz,
  tracking_no text,
  shipped_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);
create index orders_listing_idx on public.orders (listing_id);

create table public.order_payment_info (
  order_id bigint primary key references public.orders on delete cascade,
  method text not null check (method in ('transfer','meetup')),
  bank_code text check (bank_code ~ '^[0-9]{3}$'),
  account_no text check (account_no ~ '^[0-9]{6,16}$'),
  account_name text check (char_length(account_name) <= 40),
  meetup_place text check (char_length(meetup_place) <= 200),
  meetup_time timestamptz,
  updated_at timestamptz not null default now()
);

create table public.seller_payout_accounts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  bank_code text not null check (bank_code ~ '^[0-9]{3}$'),
  account_no text not null check (account_no ~ '^[0-9]{6,16}$'),
  account_name text not null check (char_length(account_name) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (user_id, bank_code, account_no)
);

create table public.payment_reports (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders on delete cascade,
  amount int not null check (amount > 0),
  paid_at timestamptz not null,
  last5 text check (last5 ~ '^[0-9]{5}$'),
  method text not null check (method in ('transfer','meetup')),
  screenshot_path text,
  created_at timestamptz not null default now()
);

-- 交易時間軸：只能新增
create table public.order_events (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders on delete cascade,
  actor_id uuid references public.profiles,
  action text not null,
  from_status text,
  to_status text,
  amount int,
  detail jsonb not null default '{}',
  created_at timestamptz not null default clock_timestamp()
);
create index order_events_idx on public.order_events (order_id, id);

create table public.order_messages (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders on delete cascade,
  sender_id uuid not null references public.profiles,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index order_messages_idx on public.order_messages (order_id, id);

create table public.video_uploads (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles on delete cascade,
  stream_uid text not null unique,
  purpose text not null check (purpose in ('media','doa')),
  status text not null default 'pending' check (status in ('pending','ready','error','deleted')),
  duration_sec numeric,
  delete_after timestamptz,
  created_at timestamptz not null default now()
);
create index video_uploads_owner_idx on public.video_uploads (owner_id, created_at desc);

create table public.disputes (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders on delete cascade,
  opener_id uuid not null references public.profiles,
  kind text not null check (kind in ('doa','other')),
  description text not null check (char_length(description) between 10 and 3000),
  video_upload_id bigint references public.video_uploads,
  prev_status text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  outcome text check (outcome in ('completed','cancelled')),
  fault text check (fault in ('buyer','seller','none')),
  resolution_note text,
  resolved_by uuid references public.profiles,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  -- 到貨死亡申訴必須附開箱影片
  check (kind <> 'doa' or video_upload_id is not null)
);
create unique index disputes_one_open_idx on public.disputes (order_id) where status = 'open';

create table public.reviews (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders on delete cascade,
  reviewer_id uuid not null references public.profiles,
  reviewee_id uuid not null references public.profiles,
  reviewee_role text not null check (reviewee_role in ('buyer','seller')),
  rating int not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 500),
  created_at timestamptz not null default now(),
  unique (order_id, reviewer_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

create table public.credit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  delta int not null,
  reason text not null,
  order_id bigint references public.orders on delete set null,
  created_at timestamptz not null default now()
);
create index credit_events_user_idx on public.credit_events (user_id, created_at desc);

-- ───────────────────────── 媒體 ─────────────────────────
create table public.media (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('image','video')),
  path text,                                   -- 照片：Storage 路徑
  video_upload_id bigint references public.video_uploads on delete cascade,
  width int, height int,
  status text not null default 'pending' check (status in ('pending','ready')),
  attached_type text check (attached_type in ('post','listing','comment','specimen')),
  attached_id bigint,
  position int not null default 0,
  created_at timestamptz not null default now(),
  check ((kind = 'image' and path is not null) or (kind = 'video' and video_upload_id is not null))
);
create index media_attached_idx on public.media (attached_type, attached_id, position);
create index media_owner_idx on public.media (owner_id, created_at desc);
create unique index media_path_idx on public.media (path) where path is not null;

-- ───────────────────────── 社群 ─────────────────────────
create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles on delete cascade,
  addressee_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_idx on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table public.user_follows (
  follower_id uuid not null references public.profiles on delete cascade,
  followee_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create table public.species_follows (
  user_id uuid not null references public.profiles on delete cascade,
  species_id bigint not null references public.species on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, species_id)
);
create table public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.conversations (
  id bigint generated always as identity primary key,
  user_a uuid not null references public.profiles on delete cascade,
  user_b uuid not null references public.profiles on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  image_path text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (char_length(body) > 0 or image_path is not null)
);
create index messages_conv_idx on public.messages (conversation_id, id);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  actor_id uuid references public.profiles on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, id desc);
create table public.notification_settings (
  user_id uuid not null references public.profiles on delete cascade,
  type text not null,
  enabled boolean not null default true,
  primary key (user_id, type)
);

-- ───────────────────────── 飼育紀錄 ─────────────────────────
create table public.specimens (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles on delete cascade,
  species_id bigint not null references public.species,
  label text not null check (char_length(label) between 1 and 40),
  sex text not null default 'unknown' check (sex in ('male','female','unknown')),
  stage text not null default 'larva' check (stage in ('egg','larva','pupa','adult','dead')),
  bloodline_name text check (char_length(bloodline_name) <= 60),
  sire_id bigint references public.specimens on delete set null,
  dam_id bigint references public.specimens on delete set null,
  origin text check (char_length(origin) <= 60),
  generation text check (char_length(generation) <= 20),
  hatched_on date,
  emerged_on date,
  died_on date,
  final_size_mm numeric(5,1),
  notes text check (char_length(notes) <= 3000),
  visibility text not null default 'private' check (visibility in ('private','public')),
  created_at timestamptz not null default now()
);
create index specimens_owner_idx on public.specimens (owner_id, created_at desc);

create table public.specimen_measurements (
  id bigint generated always as identity primary key,
  specimen_id bigint not null references public.specimens on delete cascade,
  measured_on date not null,
  weight_g numeric(6,2) check (weight_g > 0),
  head_width_mm numeric(5,2) check (head_width_mm > 0),
  note text check (char_length(note) <= 300),
  check (weight_g is not null or head_width_mm is not null)
);
create index specimen_measurements_idx on public.specimen_measurements (specimen_id, measured_on);

create table public.bottle_changes (
  id bigint generated always as identity primary key,
  specimen_id bigint not null references public.specimens on delete cascade,
  changed_on date not null,
  substrate text check (char_length(substrate) <= 60),
  volume_ml int check (volume_ml > 0),
  next_due_on date,
  reminded boolean not null default false,
  note text check (char_length(note) <= 300)
);
create index bottle_changes_idx on public.bottle_changes (specimen_id, changed_on);

create table public.temperature_logs (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles on delete cascade,
  specimen_id bigint references public.specimens on delete cascade,
  location text check (char_length(location) <= 40),
  logged_on date not null,
  temp_c numeric(4,1) not null check (temp_c between -20 and 60),
  humidity int check (humidity between 0 and 100)
);
create index temperature_logs_idx on public.temperature_logs (owner_id, logged_on);

create table public.specimen_events (
  id bigint generated always as identity primary key,
  specimen_id bigint not null references public.specimens on delete cascade,
  event_type text not null check (event_type in ('hatch','molt','pupate','emerge','feed_start','pairing','oviposition','death','other')),
  occurred_on date not null,
  note text check (char_length(note) <= 500)
);
create index specimen_events_idx on public.specimen_events (specimen_id, occurred_on);

-- ───────────────────────── 管理 ─────────────────────────
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles on delete cascade,
  target_type text not null check (target_type in ('post','comment','listing','wanted','user','message','shop','order')),
  target_id text not null,
  reason text not null check (reason in ('spam','scam','protected','abuse','wrong_info','closed','other')),
  detail text check (char_length(detail) <= 1000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  handled_by uuid references public.profiles,
  handled_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_status_idx on public.reports (status, created_at);

create table public.banned_words (
  word text primary key check (char_length(word) between 2 and 40),
  created_at timestamptz not null default now()
);

create table public.moderation_log (
  id bigint generated always as identity primary key,
  mod_id uuid references public.profiles,
  action text not null,
  target_type text,
  target_id text,
  note text,
  created_at timestamptz not null default now()
);

create table public.shops (
  id bigint generated always as identity primary key,
  name text not null,
  city text not null,
  district text,
  address text,
  phone text,
  opening_hours jsonb,           -- {"mon":[["13:00","21:00"]], "tue":[], ...}；null = 請洽店家
  hours_note text,
  website text, facebook text, instagram text,
  items text,
  lat double precision, lng double precision,
  status text not null default 'open' check (status in ('open','closed')),
  source_url text,
  last_verified_on date,
  created_at timestamptz not null default now()
);
