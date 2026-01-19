-- ============================================
-- my_songsテーブルにdeleted_atカラムを追加
-- ============================================
-- 日付: 2026-01-31
-- 目的: マイライブラリの曲を論理削除（非表示）できるようにする
--       プレミアム解約時に古い曲を非表示にするために使用

-- deleted_atカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'my_songs' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.my_songs 
    ADD COLUMN deleted_at timestamptz NULL;
    
    COMMENT ON COLUMN public.my_songs.deleted_at IS '論理削除日時（NULLの場合は表示中、値がある場合は非表示）';
    
    -- インデックスを追加（deleted_atがNULLのレコードの検索を高速化）
    CREATE INDEX IF NOT EXISTS idx_my_songs_deleted_at ON public.my_songs(deleted_at) 
    WHERE deleted_at IS NOT NULL;
    
    RAISE NOTICE 'my_songsテーブルにdeleted_atカラムを追加しました';
  ELSE
    RAISE NOTICE 'deleted_atカラムは既に存在します';
  END IF;
END $$;
