-- テストユーザー作成スクリプト（開発環境専用）
-- ⚠️ WARNING: このファイルは開発環境専用です
-- 本番環境では使用しないでください
-- 
-- 使用方法:
--   psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/create_test_user.sql
--   または
--   npm run supabase:create-test-user

-- 既存のテストユーザーを削除（存在する場合）
DELETE FROM public.user_profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'test@example.com');
DELETE FROM auth.users WHERE email = 'test@example.com';

-- テストユーザーを作成
-- 注意: トリガー（on_auth_user_created）が自動的にuser_profilesも作成する
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "テストユーザー", "display_name": "テストユーザー"}',
  false,
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- プロフィールが作成されたか確認（トリガーで自動作成される）
-- トリガーが動作しない場合に備えて、少し待ってから確認
DO $$
DECLARE
  v_user_id uuid;
  v_profile_exists boolean;
BEGIN
  -- ユーザーIDを取得
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'test@example.com';
  
  IF v_user_id IS NOT NULL THEN
    -- 少し待ってからプロフィールを確認（トリガーが動作する時間を確保）
    PERFORM pg_sleep(0.5);
    
    -- プロフィールが存在するか確認
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id = v_user_id) INTO v_profile_exists;
    
    -- プロフィールが存在しない場合は手動で作成
    IF NOT v_profile_exists THEN
      INSERT INTO public.user_profiles (
        user_id,
        display_name,
        created_at,
        updated_at
      )
      SELECT 
        au.id,
        COALESCE(
          au.raw_user_meta_data->>'display_name',
          au.raw_user_meta_data->>'name',
          SPLIT_PART(au.email, '@', 1)
        ) as display_name,
        au.created_at,
        now()
      FROM auth.users au
      WHERE au.id = v_user_id
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- 作成結果を確認
SELECT 
  '✅ テストユーザー作成完了' as status,
  au.email,
  au.id as user_id,
  CASE WHEN up.user_id IS NOT NULL THEN '✅' ELSE '❌' END as profile_exists,
  up.display_name
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE au.email = 'test@example.com';

