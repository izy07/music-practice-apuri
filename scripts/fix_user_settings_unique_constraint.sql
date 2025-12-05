-- user_settingsテーブルのUNIQUE制約を確認・修正するSQL
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. 既存のUNIQUE制約を確認
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  a.attname AS column_name
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
WHERE n.nspname = 'public'
  AND t.relname = 'user_settings'
  AND c.contype IN ('u', 'p'); -- u = unique, p = primary key

-- 2. user_idカラムにUNIQUE制約が存在しない場合は追加
DO $$
BEGIN
  -- user_idにUNIQUE制約が存在するか確認
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'user_settings'
      AND a.attname = 'user_id'
      AND c.contype = 'u'
  ) THEN
    -- UNIQUE制約を追加
    ALTER TABLE public.user_settings
    ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);
    
    RAISE NOTICE '✅ user_settingsテーブルにuser_idのUNIQUE制約を追加しました';
  ELSE
    RAISE NOTICE 'ℹ️ user_settingsテーブルには既にuser_idのUNIQUE制約が存在します';
  END IF;
END $$;

-- 3. 確認
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  a.attname AS column_name
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
WHERE n.nspname = 'public'
  AND t.relname = 'user_settings'
  AND c.contype IN ('u', 'p');


