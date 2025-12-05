-- ============================================
-- user_profilesテーブルの状態確認SQL
-- ============================================
-- SupabaseダッシュボードのSQL Editorで実行して、テーブルの状態を確認してください
-- ============================================

-- 1. テーブルの存在確認
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles';

-- 2. カラムの確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. RLSポリシーの確認
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';

-- 4. インデックスの確認
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';

-- 5. 外部キー制約の確認
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
  AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'user_profiles';

-- 6. 権限の確認
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles';

-- 7. 無効なselected_instrument_idの確認（存在しないinstruments.idを参照している場合）
SELECT 
  up.user_id,
  up.selected_instrument_id,
  up.display_name
FROM public.user_profiles up
LEFT JOIN public.instruments i ON up.selected_instrument_id = i.id
WHERE up.selected_instrument_id IS NOT NULL
  AND i.id IS NULL;

-- 8. RLSが有効になっているか確認
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';


