-- user_profilesテーブルのカラム追加（簡易版）
-- SupabaseダッシュボードのSQL Editorで実行してください

-- オンボーディング進捗管理カラムを確実に追加
DO $$
BEGIN
  -- tutorial_completedカラムの追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'tutorial_completed'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN tutorial_completed boolean DEFAULT false;
  END IF;

  -- tutorial_completed_atカラムの追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'tutorial_completed_at'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN tutorial_completed_at timestamptz;
  END IF;

  -- onboarding_completedカラムの追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  -- onboarding_completed_atカラムの追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN onboarding_completed_at timestamptz;
  END IF;
END $$;

-- 既存のレコードにデフォルト値を設定
UPDATE public.user_profiles
SET 
  tutorial_completed = COALESCE(tutorial_completed, false),
  onboarding_completed = COALESCE(onboarding_completed, false)
WHERE tutorial_completed IS NULL OR onboarding_completed IS NULL;

