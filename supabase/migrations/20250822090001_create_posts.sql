-- posts テーブル
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id),

  comment    text,
  latitude   numeric not null,
  longitude  numeric not null,
  image_url  text,
  address    text,

  created_at timestamptz not null default now()
);

-- Enable Row Level Security & Policies -------------------------------------------------
alter table public.posts enable row level security;

-- 自分の投稿のみ閲覧可能
create policy "Users can view their own posts" on public.posts
  for select using (user_id = auth.uid());

-- 投稿の作成は自ユーザーのみ
create policy "Users can insert their posts" on public.posts
  for insert with check (user_id = auth.uid());

-- 編集・削除も自ユーザーのみ
create policy "Users can update their posts" on public.posts
  for update using (user_id = auth.uid());

create policy "Users can delete their posts" on public.posts
  for delete using (user_id = auth.uid());
