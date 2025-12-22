-- ============================================
-- instrument_specific_dataカラムの追加
-- ============================================
-- 日付: 2025-01-20
-- 目的: user_profilesテーブルに楽器ごとのデータを保存するためのカラムを追加
-- ============================================

-- instrument_specific_dataカラムを追加（JSONB型）
DO $$
BEGIN
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
END $$;

-- 既存のデータをマイグレーション（既存の楽器固有データをinstrument_specific_dataに移行）
-- 注意: 既存のデータがある場合は、手動で移行する必要がある場合があります

