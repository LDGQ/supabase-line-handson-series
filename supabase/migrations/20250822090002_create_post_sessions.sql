-- post_sessions テーブル
create table if not exists public.post_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id),

  -- LINE との紐付け
  line_user_id  text not null,

  status text not null default 'photo_pending'
         check (status in ('photo_pending','gps_pending','comment_pending','completed','cancelled')),

  temp_image_url text,
  temp_latitude  numeric,
  temp_longitude numeric,
  temp_comment   text,
  temp_address   text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- Enable Row Level Security & Policies -------------------------------------------------
alter table public.post_sessions enable row level security;

-- セッションは所有ユーザーのみ全操作許可
create policy "Users manage their session" on public.post_sessions
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
