-- ============================================
-- user_profilesテーブルに必要なカラムを追加
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ============================================

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
    ADD COLUMN tutorial_completed boolean DEFAULT false NOT NULL;
    RAISE NOTICE 'tutorial_completedカラムを追加しました';
  ELSE
    RAISE NOTICE 'tutorial_completedカラムは既に存在します';
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
    RAISE NOTICE 'tutorial_completed_atカラムを追加しました';
  ELSE
    RAISE NOTICE 'tutorial_completed_atカラムは既に存在します';
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
    ADD COLUMN onboarding_completed boolean DEFAULT false NOT NULL;
    RAISE NOTICE 'onboarding_completedカラムを追加しました';
  ELSE
    RAISE NOTICE 'onboarding_completedカラムは既に存在します';
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
    RAISE NOTICE 'onboarding_completed_atカラムを追加しました';
  ELSE
    RAISE NOTICE 'onboarding_completed_atカラムは既に存在します';
  END IF;
END $$;

-- 既存のレコードにデフォルト値を設定
UPDATE public.user_profiles
SET 
  tutorial_completed = COALESCE(tutorial_completed, false),
  onboarding_completed = COALESCE(onboarding_completed, false)
WHERE tutorial_completed IS NULL OR onboarding_completed IS NULL;

-- 確認: カラムが正しく追加されたか確認
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
  AND column_name IN ('tutorial_completed', 'tutorial_completed_at', 'onboarding_completed', 'onboarding_completed_at')
ORDER BY column_name;

