-- user_profilesテーブルに不足しているカラムを追加
-- birthday, current_organization, current_age, music_start_age, music_experience_yearsカラムを追加

-- birthdayカラムの追加（誕生日：DATE型）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'birthday') THEN
      ALTER TABLE public.user_profiles ADD COLUMN birthday DATE;
      COMMENT ON COLUMN public.user_profiles.birthday IS 'ユーザーの誕生日（YYYY-MM-DD形式）';
    END IF;
  END IF;
END $$;

-- current_ageカラムの追加（現在の年齢：INTEGER型）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'current_age') THEN
      ALTER TABLE public.user_profiles ADD COLUMN current_age INTEGER;
      COMMENT ON COLUMN public.user_profiles.current_age IS 'ユーザーの現在の年齢';
    END IF;
  END IF;
END $$;

-- music_start_ageカラムの追加（音楽開始年齢：INTEGER型）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'music_start_age') THEN
      ALTER TABLE public.user_profiles ADD COLUMN music_start_age INTEGER;
      COMMENT ON COLUMN public.user_profiles.music_start_age IS '音楽を始めた年齢';
    END IF;
  END IF;
END $$;

-- music_experience_yearsカラムの追加（演奏歴年数：INTEGER型）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'music_experience_years') THEN
      ALTER TABLE public.user_profiles ADD COLUMN music_experience_years INTEGER DEFAULT 0;
      COMMENT ON COLUMN public.user_profiles.music_experience_years IS '演奏歴年数（現在の年齢 - 音楽開始年齢）';
    END IF;
  END IF;
END $$;

-- custom_instrument_nameカラムの追加（カスタム楽器名：TEXT型）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'custom_instrument_name') THEN
      ALTER TABLE public.user_profiles ADD COLUMN custom_instrument_name TEXT;
      COMMENT ON COLUMN public.user_profiles.custom_instrument_name IS 'その他楽器選択時のカスタム楽器名';
    END IF;
  END IF;
END $$;

-- current_organizationカラムの追加（現在の所属団体：TEXT型）
-- organizationカラムとの互換性のため、両方のカラムをサポート
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'current_organization') THEN
      ALTER TABLE public.user_profiles ADD COLUMN current_organization TEXT;
      COMMENT ON COLUMN public.user_profiles.current_organization IS '現在の所属団体（カンマ区切りで複数可）';
    END IF;
  END IF;
END $$;

-- organizationカラムが存在しない場合は追加（後方互換性のため）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'organization') THEN
      ALTER TABLE public.user_profiles ADD COLUMN organization TEXT;
      COMMENT ON COLUMN public.user_profiles.organization IS '所属団体（カンマ区切りで複数可、current_organizationとの互換性のため）';
    END IF;
  END IF;
END $$;

-- current_organizationとorganizationを同期するトリガー関数（オプション）
-- organizationが更新されたらcurrent_organizationも更新、その逆も同様
CREATE OR REPLACE FUNCTION public.sync_organization_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- organizationが更新された場合、current_organizationも更新
  IF TG_OP = 'UPDATE' AND (OLD.organization IS DISTINCT FROM NEW.organization) THEN
    NEW.current_organization = NEW.organization;
  END IF;
  
  -- current_organizationが更新された場合、organizationも更新
  IF TG_OP = 'UPDATE' AND (OLD.current_organization IS DISTINCT FROM NEW.current_organization) THEN
    NEW.organization = NEW.current_organization;
  END IF;
  
  -- INSERT時は両方を同期
  IF TG_OP = 'INSERT' THEN
    IF NEW.organization IS NOT NULL AND NEW.current_organization IS NULL THEN
      NEW.current_organization = NEW.organization;
    ELSIF NEW.current_organization IS NOT NULL AND NEW.organization IS NULL THEN
      NEW.organization = NEW.current_organization;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（既存のトリガーを削除してから再作成）
DROP TRIGGER IF EXISTS sync_organization_columns_trigger ON public.user_profiles;
CREATE TRIGGER sync_organization_columns_trigger
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_organization_columns();


