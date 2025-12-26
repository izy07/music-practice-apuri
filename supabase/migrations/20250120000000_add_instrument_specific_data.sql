-- ============================================
-- instrument_specific_dataカラムの追加（安全版）
-- ============================================
-- 日付: 2025-01-20
-- 目的: user_profilesテーブルに楽器ごとのデータを保存するためのカラムを追加
-- 注意: このマイグレーションは既に20251219000000_initial_schema.sqlに統合されています
--       このファイルは、Supabaseのマイグレーション履歴との互換性のために残されています
-- ============================================

-- テーブルの存在を確認してからカラムを追加
DO $$
BEGIN
  -- user_profilesテーブルが存在する場合のみ実行
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    -- instrument_specific_dataカラムが存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles' 
      AND column_name = 'instrument_specific_data'
    ) THEN
      ALTER TABLE public.user_profiles 
      ADD COLUMN instrument_specific_data jsonb DEFAULT '{}'::jsonb;
      
      -- コメントを追加
      COMMENT ON COLUMN public.user_profiles.instrument_specific_data IS '楽器ごとのプロフィールデータ（JSONB形式）';
    END IF;
  END IF;
END $$;

