-- ============================================
-- user_profilesテーブルにtutorial_completedカラムを追加（既存のDB用）
-- ============================================
-- 日付: 2025-12-27
-- 目的: 既存のデータベースにtutorial_completedとtutorial_completed_atカラムが確実に存在するようにする
-- 注意: 初期スキーマ（20251219000000_initial_schema.sql）には既に定義されています
--       このマイグレーションは、初期スキーマ適用前の既存データベース用です
--       新しい環境では、初期スキーマに既に含まれているため、このマイグレーションは実行されません

-- tutorial_completedカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'tutorial_completed'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN tutorial_completed boolean DEFAULT false;
    
    COMMENT ON COLUMN public.user_profiles.tutorial_completed IS 'チュートリアル完了フラグ';
  END IF;
END $$;

-- tutorial_completed_atカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'tutorial_completed_at'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN tutorial_completed_at timestamptz;
    
    COMMENT ON COLUMN public.user_profiles.tutorial_completed_at IS 'チュートリアル完了日時';
  END IF;
END $$;

