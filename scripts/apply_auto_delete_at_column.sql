-- recordingsテーブルにauto_delete_atカラムを追加
-- レッスン録音を30日後に自動削除するためのカラム
-- Supabase StudioのSQL Editorで実行してください

-- カラムが既に存在する場合は何もしない（安全な実行）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recordings' 
    AND column_name = 'auto_delete_at'
  ) THEN
    -- カラムを追加
    ALTER TABLE public.recordings 
    ADD COLUMN auto_delete_at timestamptz NULL;
    
    -- カラムにコメントを追加
    COMMENT ON COLUMN public.recordings.auto_delete_at IS '自動削除日時（レッスン録音の場合、30日後に設定。お気に入りは削除対象外）';
    
    -- 自動削除対象の録音を効率的に検索するためのインデックス
    CREATE INDEX IF NOT EXISTS idx_recordings_auto_delete_at ON public.recordings(auto_delete_at) 
    WHERE auto_delete_at IS NOT NULL;
    
    RAISE NOTICE 'recordingsテーブルにauto_delete_atカラムを追加しました';
  ELSE
    RAISE NOTICE 'auto_delete_atカラムは既に存在します';
  END IF;
END $$;

-- 適用結果を確認
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'recordings'
  AND column_name = 'auto_delete_at';
