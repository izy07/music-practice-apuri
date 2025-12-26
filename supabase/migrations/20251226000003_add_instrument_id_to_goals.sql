-- ============================================
-- goalsテーブルにinstrument_idカラムを追加
-- ============================================
-- 日付: 2025-12-26
-- 目的: 目標を楽器ごとに分けて管理できるようにする
-- 注意: initial_schema.sqlに既に含まれているが、既存のデータベースに適用するための安全なマイグレーション

-- instrument_idカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.goals 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.goals.instrument_id IS '楽器ID（楽器ごとに目標を分けて管理）';
  END IF;
END $$;

-- インデックスを追加（既に存在する場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_goals_instrument_id ON public.goals(instrument_id);

-- RLSポリシーは既に存在するため、更新は不要
-- ただし、instrument_idを考慮したポリシーが必要な場合は追加で実装する

