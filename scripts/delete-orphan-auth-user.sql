-- 特定のメールアドレスのauth.usersエントリを削除するスクリプト
-- 注意: このスクリプトはauth.usersからユーザーを完全に削除します
-- 使用方法: psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/delete-orphan-auth-user.sql

-- メールアドレスを指定（例: 'izuru261512345@gmail.com'）
-- 実際に使用する際は、以下のメールアドレスを変更してください

-- 1. 削除対象のユーザーを確認
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'izuru261512345@gmail.com';

-- 2. ユーザーを削除（CASCADEによりuser_profilesも自動削除される）
-- 注意: このコマンドを実行する前に、上記のSELECTで確認してください
-- DELETE FROM auth.users WHERE email = 'izuru261512345@gmail.com';

-- 3. 削除後の確認
SELECT 
  COUNT(*) as remaining_users
FROM auth.users
WHERE email = 'izuru261512345@gmail.com';

