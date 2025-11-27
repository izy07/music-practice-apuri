-- テストユーザー削除スクリプト（開発環境専用）
-- ⚠️ WARNING: このファイルは開発環境専用です
-- 
-- 使用方法:
--   psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/delete_test_user.sql
--   または
--   npm run supabase:delete-test-user

-- テストユーザーを削除
DELETE FROM public.user_profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'test@example.com');
DELETE FROM auth.users WHERE email = 'test@example.com';

-- 削除結果を確認
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ テストユーザーは削除されました'
    ELSE '⚠️ テストユーザーがまだ存在します: ' || COUNT(*) || ' 件'
  END as status
FROM auth.users 
WHERE email = 'test@example.com';

