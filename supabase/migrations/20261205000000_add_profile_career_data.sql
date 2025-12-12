-- user_profilesテーブルに経歴・実績データを保存するためのJSONBカラムを追加
-- FirebaseからSupabaseへの移行のため

-- 経歴・実績データ用のJSONBカラムを追加
DO $$
BEGIN
  -- pastOrganizationsUiカラムの追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'career_data'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN career_data JSONB DEFAULT '{
      "pastOrganizationsUi": [],
      "awardsUi": [],
      "performancesUi": []
    }'::jsonb;
    
    COMMENT ON COLUMN public.user_profiles.career_data IS '経歴・実績データ（過去の所属団体、受賞歴、演奏経験）をJSONB形式で保存';
  END IF;
END $$;

