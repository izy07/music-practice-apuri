-- user_profiles にオンボーディング関連カラムを追加（既存DB用）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'tutorial_completed'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN tutorial_completed boolean NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.user_profiles.tutorial_completed IS 'チュートリアル完了フラグ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'tutorial_completed_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN tutorial_completed_at timestamptz;
    COMMENT ON COLUMN public.user_profiles.tutorial_completed_at IS 'チュートリアル完了日時';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.user_profiles.onboarding_completed IS 'オンボーディング完了フラグ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN onboarding_completed_at timestamptz;
    COMMENT ON COLUMN public.user_profiles.onboarding_completed_at IS 'オンボーディング完了日時';
  END IF;
END $$;
