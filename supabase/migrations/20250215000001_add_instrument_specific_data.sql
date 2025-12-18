-- 楽器ごとのデータ分離対応
-- user_profilesテーブルとuser_settingsテーブルに楽器ごとのデータを保存するJSONBカラムを追加

-- user_profilesテーブルにinstrument_specific_dataカラムを追加
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'instrument_specific_data') THEN
      ALTER TABLE public.user_profiles ADD COLUMN instrument_specific_data JSONB DEFAULT '{}'::jsonb;
      COMMENT ON COLUMN public.user_profiles.instrument_specific_data IS '楽器ごとのプロフィールデータ（JSONB形式）。キーはinstrument_id、値は楽器ごとの設定データ（音楽開始年齢、演奏歴、楽器の種類、経歴・実績など）';
    END IF;
  END IF;
END $$;

-- user_settingsテーブルにinstrument_specific_settingsカラムを追加
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'instrument_specific_settings') THEN
      ALTER TABLE public.user_settings ADD COLUMN instrument_specific_settings JSONB DEFAULT '{}'::jsonb;
      COMMENT ON COLUMN public.user_settings.instrument_specific_settings IS '楽器ごとの設定データ（JSONB形式）。キーはinstrument_id、値は楽器ごとの設定（言語設定、音楽団体設定など）';
    END IF;
  END IF;
END $$;

-- インデックスの作成（JSONBクエリのパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_user_profiles_instrument_specific_data ON public.user_profiles USING GIN (instrument_specific_data);
CREATE INDEX IF NOT EXISTS idx_user_settings_instrument_specific_settings ON public.user_settings USING GIN (instrument_specific_settings);

