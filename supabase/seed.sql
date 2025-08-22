-- Seed data for supabase-line-handson-series
-- エンコーディング: UTF-8

-- 自動的にユーザーデータを生成するシードファイル

-- 1. auth.usersテーブルに直接ユーザーを挿入（開発環境用）
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES 
  ('00000000-0000-0000-0000-000000000000', '550e8400-e29b-41d4-a716-446655440001', 'authenticated', 'authenticated', 'tanaka@example.com', crypt('password123', gen_salt('bf')), NOW(), NULL, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"田中太郎"}', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 2. auth.identitiesテーブルにidentityデータを挿入
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '{"sub":"550e8400-e29b-41d4-a716-446655440001","email":"tanaka@example.com"}', 'email', '550e8400-e29b-41d4-a716-446655440001', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. public.usersテーブルにプロフィールデータを挿入
INSERT INTO public.users (id, line_user_id, display_name, avatar_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'line_user_001', '田中太郎', 'https://example.com/avatar1.jpg')
ON CONFLICT (id) DO UPDATE SET 
  line_user_id = EXCLUDED.line_user_id,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url;

-- 4. サンプル投稿データ（福岡の場所）
INSERT INTO public.posts (id, user_id, comment, latitude, longitude, image_url, address) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '福岡タワーからの眺めが最高！', 33.5969, 130.3991, 'https://example.com/post1.jpg', '福岡県福岡市早良区百道浜'),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '博多ラーメンうまか〜！', 33.5958, 130.4058, 'https://example.com/post2.jpg', '福岡県福岡市博多区'),
  ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '太宰府天満宮で合格祈願✨', 33.5206, 130.5339, 'https://example.com/post3.jpg', '福岡県太宰府市宰府'),
  ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '中洲の夜景がきれい〜', 33.5903, 130.4071, 'https://example.com/post4.jpg', '福岡県福岡市博多区中洲'),
  ('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', '天神でお買い物♪', 33.5907, 130.4017, 'https://example.com/post5.jpg', '福岡県福岡市中央区天神')
ON CONFLICT (id) DO NOTHING;
