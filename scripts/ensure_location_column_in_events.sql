-- ============================================
-- eventsテーブルにlocationカラムを追加（存在しない場合のみ）
-- ============================================
-- このスクリプトは、eventsテーブルにlocationカラムが存在しない場合に自動的に追加します。
-- Supabase StudioのSQL Editorで実行してください。
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'location'
  ) THEN
    ALTER TABLE public.events 
    ADD COLUMN location text;
    
    COMMENT ON COLUMN public.events.location IS 'イベントの場所（例：ホール名、会場名など）';
    
    RAISE NOTICE '✅ eventsテーブルにlocationカラムを追加しました';
  ELSE
    RAISE NOTICE 'ℹ️ eventsテーブルのlocationカラムは既に存在します';
  END IF;
END $$;

-- 確認クエリ
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'events' 
  AND column_name = 'location';
