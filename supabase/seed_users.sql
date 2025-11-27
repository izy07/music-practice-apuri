-- ⚠️ WARNING: このファイルは開発環境専用です
-- 本番環境では使用しないでください
-- 使用方法: psql < seed_users_dev.sql

-- テスト用ユーザーアカウントの作成
-- パスワードは 'testpassword123' でハッシュ化されている

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "テストユーザー"}',
  false,
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- ユーザープロファイルの作成
INSERT INTO public.user_profiles (
  id,
  user_id,
  username,
  display_name,
  bio,
  avatar_url,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'test@example.com'),
  'testuser',
  'テストユーザー',
  'これはテスト用のアカウントです',
  null,
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;



