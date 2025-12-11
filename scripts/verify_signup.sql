-- 新規登録の確認用SQLスクリプト
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. 最近登録されたユーザーを確認（過去24時間以内）
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 2. 最近作成されたプロフィールを確認（過去24時間以内）
SELECT 
  up.id,
  up.user_id,
  up.display_name,
  up.practice_level,
  up.selected_instrument_id,
  up.created_at,
  up.updated_at,
  au.email
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE up.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY up.created_at DESC
LIMIT 10;

-- 3. ユーザーとプロフィールの対応関係を確認
SELECT 
  au.id as user_id,
  au.email,
  au.created_at as user_created_at,
  up.id as profile_id,
  up.display_name,
  up.created_at as profile_created_at,
  CASE 
    WHEN up.id IS NULL THEN 'プロフィール未作成'
    ELSE 'プロフィール作成済み'
  END as profile_status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE au.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC
LIMIT 10;

-- 4. プロフィールが作成されていないユーザーを確認
SELECT 
  au.id as user_id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL
  AND au.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC;





