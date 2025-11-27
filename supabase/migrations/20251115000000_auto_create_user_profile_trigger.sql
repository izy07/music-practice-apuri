-- auth.usersにユーザーが作成されたときに自動的にuser_profilesを作成するトリガー
-- これにより、新規登録時に必ずuser_profilesが作成される

-- 関数: 新規ユーザー作成時にuser_profilesを自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- user_profilesに既に存在するかチェック（重複防止）
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = NEW.id
  ) THEN
    -- user_profilesを作成
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー: auth.usersにINSERTされたときに発火
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 既存のユーザーでuser_profilesが存在しない場合の修復処理
-- 注意: この処理は一度だけ実行されることを想定
DO $$
DECLARE
  missing_user RECORD;
BEGIN
  -- auth.usersに存在するがuser_profilesに存在しないユーザーを検索
  FOR missing_user IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.user_id
    WHERE up.user_id IS NULL
  LOOP
    -- user_profilesを作成
    INSERT INTO public.user_profiles (
      user_id,
      display_name,
      created_at,
      updated_at
    ) VALUES (
      missing_user.id,
      COALESCE(
        missing_user.raw_user_meta_data->>'display_name',
        missing_user.raw_user_meta_data->>'name',
        SPLIT_PART(missing_user.email, '@', 1)
      ),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

