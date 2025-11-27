-- auth.usersに存在するがuser_profilesに存在しないユーザーを修復するスクリプト
-- 使用方法: psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/fix-missing-profiles.sql

-- 1. 問題のあるユーザーを確認
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  up.user_id as profile_exists
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC;

-- 2. プロフィールが存在しないユーザーのプロフィールを作成
INSERT INTO public.user_profiles (
  user_id,
  display_name,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'name',
    SPLIT_PART(au.email, '@', 1)
  ) as display_name,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. 修復後の確認
SELECT 
  COUNT(*) as total_auth_users,
  COUNT(up.user_id) as users_with_profiles,
  COUNT(*) - COUNT(up.user_id) as users_without_profiles
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id;

