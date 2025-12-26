-- ============================================
-- my_songsテーブルにinstrument_idカラムを追加
-- ============================================
-- 日付: 2025-12-26
-- 目的: マイライブラリの曲を楽器ごとに分けて管理できるようにする

-- instrument_idカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'my_songs' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.my_songs 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.my_songs.instrument_id IS '楽器ID（楽器ごとに曲を分けて管理）';
  END IF;
END $$;

-- インデックスを追加（既に存在する場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_my_songs_instrument_id ON public.my_songs(instrument_id);

