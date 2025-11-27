-- 新規登録ユーザーの重複プロフィールをクリーンアップするスクリプト
-- 認証されていないユーザーのプロフィールを削除

-- 1. 認証されていないユーザーのプロフィールを確認
SELECT 
  up.user_id,
  up.display_name,
  up.created_at,
  au.email,
  au.email_confirmed_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE au.email_confirmed_at IS NULL
ORDER BY up.created_at DESC;

-- 2. 認証されていないユーザーのプロフィールを削除
DELETE FROM user_profiles 
WHERE user_id IN (
  SELECT up.user_id
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.user_id = au.id
  WHERE au.email_confirmed_at IS NULL
);

-- 3. 削除後の確認
SELECT 
  COUNT(*) as total_profiles,
  COUNT(au.email_confirmed_at) as confirmed_profiles,
  COUNT(*) - COUNT(au.email_confirmed_at) as unconfirmed_profiles
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id;
