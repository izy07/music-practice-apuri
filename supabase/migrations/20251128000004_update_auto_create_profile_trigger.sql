-- user_profiles自動作成トリガーの更新
-- tutorial_completedとonboarding_completedカラムが存在する場合に含める

-- 関数: 新規ユーザー作成時にuser_profilesを自動作成（更新版）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  has_tutorial_completed boolean;
  has_onboarding_completed boolean;
BEGIN
  -- user_profilesに既に存在するかチェック（重複防止）
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = NEW.id
  ) THEN
    -- tutorial_completedとonboarding_completedカラムの存在確認
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles' 
      AND column_name = 'tutorial_completed'
    ) INTO has_tutorial_completed;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles' 
      AND column_name = 'onboarding_completed'
    ) INTO has_onboarding_completed;
    
    -- user_profilesを作成（カラムが存在する場合のみ含める）
    IF has_tutorial_completed AND has_onboarding_completed THEN
      INSERT INTO public.user_profiles (
        user_id,
        display_name,
        tutorial_completed,
        onboarding_completed,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        COALESCE(
          NEW.raw_user_meta_data->>'display_name',
          NEW.raw_user_meta_data->>'name',
          SPLIT_PART(NEW.email, '@', 1)
        ),
        false,
        false,
        NOW(),
        NOW()
      );
    ELSE
      -- カラムが存在しない場合は基本カラムのみで作成
      INSERT INTO public.user_profiles (
        user_id,
        display_name,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        COALESCE(
          NEW.raw_user_meta_data->>'display_name',
          NEW.raw_user_meta_data->>'name',
          SPLIT_PART(NEW.email, '@', 1)
        ),
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

