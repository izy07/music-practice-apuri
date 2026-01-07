-- ============================================
-- recordingsテーブルにinstrument_idカラムを追加
-- ============================================
-- 日付: 2025-12-26
-- 目的: 録音を楽器ごとに分けて管理できるようにする
-- 注意: 初期スキーマ（20251219000000_initial_schema.sql）には既に含まれています
--       このマイグレーションは、初期スキーマ適用前の既存データベース用です

-- instrument_idカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recordings' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.recordings 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.recordings.instrument_id IS '楽器ID（楽器ごとに録音を分けて管理）';
  END IF;
END $$;

-- インデックスを追加（既に存在する場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_recordings_instrument_id ON public.recordings(instrument_id);

