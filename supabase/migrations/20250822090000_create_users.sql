-- users テーブル
create table if not exists public.users (
  -- auth.users の PK をそのまま利用
  id uuid primary key references auth.users(id),

  -- LINE 連携用 ID
  line_user_id text unique,
  display_name text,
  avatar_url   text,

  created_at timestamptz not null default now(),
  updated_at timestamptz          default now()
);

-- Enable Row Level Security & Policies -------------------------------------------------
alter table public.users enable row level security;

-- 1. ユーザーは自分のレコードだけ閲覧できる
create policy "Users can view themselves" on public.users
  for select using (id = auth.uid());

-- 2. ユーザーは自分のレコードだけ挿入できる（サインアップ時）
create policy "Users can insert themselves" on public.users
  for insert with check (id = auth.uid());

-- 3. ユーザーは自分のレコードだけ更新できる
create policy "Users can update themselves" on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid());
