-- ============================================
-- practice_sessionsテーブルにinstrument_idカラムを追加
-- ============================================
-- 日付: 2025-12-26
-- 目的: 練習記録を楽器ごとに分けて管理できるようにする
-- 注意: 初期スキーマ（20251219000000_initial_schema.sql）には既に含まれています
--       このマイグレーションは、初期スキーマ適用前の既存データベース用です

-- instrument_idカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_sessions' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.practice_sessions 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.practice_sessions.instrument_id IS '楽器ID（楽器ごとに練習記録を分けて管理）';
  END IF;
END $$;

-- インデックスを追加（既に存在する場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_practice_sessions_instrument_id ON public.practice_sessions(instrument_id);

