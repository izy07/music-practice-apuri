-- ============================================
-- user_profilesテーブルにリワード広告録音数を追加
-- ============================================
-- 月間のリワード広告録音数を記録するカラムを追加
-- JSONB形式: { "instrument_id": count, ... }
-- ============================================

-- monthly_rewarded_ad_recordingsカラムを追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'monthly_rewarded_ad_recordings'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN monthly_rewarded_ad_recordings JSONB DEFAULT '{}'::jsonb;
    
    COMMENT ON COLUMN public.user_profiles.monthly_rewarded_ad_recordings IS 
    '月間のリワード広告録音数（楽器ごと）。JSONB形式で{ "instrument_id": count }を格納。月ごとにリセットされる。';
    
    -- 既存データの初期化（既存ユーザーに対して空のJSONオブジェクトを設定）
    UPDATE public.user_profiles 
    SET monthly_rewarded_ad_recordings = '{}'::jsonb 
    WHERE monthly_rewarded_ad_recordings IS NULL;
    
    RAISE NOTICE 'monthly_rewarded_ad_recordingsカラムを追加しました';
  ELSE
    RAISE NOTICE 'monthly_rewarded_ad_recordingsカラムは既に存在します';
  END IF;
END $$;

-- 確認クエリ
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles' 
  AND column_name = 'monthly_rewarded_ad_recordings';
