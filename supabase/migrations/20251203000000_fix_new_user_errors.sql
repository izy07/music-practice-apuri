-- 新規登録後のエラー修正マイグレーション
-- 目的: 新規登録ユーザーがメイン画面にアクセスした際のエラーを根本的に解決
-- 日付: 2025-12-03

-- ============================================
-- 1. goalsテーブルにshow_on_calendarカラムを追加（存在しない場合）
-- ============================================
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar') THEN
      ALTER TABLE goals ADD COLUMN show_on_calendar BOOLEAN DEFAULT false;
      COMMENT ON COLUMN goals.show_on_calendar IS 'カレンダーに表示するかどうか（true: 表示, false: 非表示）';
      
      -- 既存のレコードをfalseに設定
      UPDATE goals SET show_on_calendar = false WHERE show_on_calendar IS NULL;
      
      -- インデックスを作成
      CREATE INDEX IF NOT EXISTS idx_goals_show_on_calendar ON goals(show_on_calendar) WHERE show_on_calendar = true;
      
      RAISE NOTICE 'goalsテーブルにshow_on_calendarカラムを追加しました';
    ELSE
      RAISE NOTICE 'goalsテーブルのshow_on_calendarカラムは既に存在します';
    END IF;
  ELSE
    RAISE NOTICE 'goalsテーブルが存在しません。先にgoalsテーブルを作成してください';
  END IF;
END $$;

-- ============================================
-- 2. user_profilesテーブルのRLSポリシーを確認・修正
-- ============================================
DO $$
BEGIN
  -- user_profilesテーブルが存在することを確認
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    -- RLSを有効化
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    
    -- 古いポリシーを削除（存在する場合）
    DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
    
    -- UPDATEポリシーを作成（存在しない場合のみ）
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'user_profiles' 
      AND policyname = 'Users can update own profile'
    ) THEN
      CREATE POLICY "Users can update own profile" ON public.user_profiles
        FOR UPDATE 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);
      
      RAISE NOTICE 'user_profilesテーブルのUPDATEポリシーを作成しました';
    ELSE
      RAISE NOTICE 'user_profilesテーブルのUPDATEポリシーは既に存在します';
    END IF;
    
    -- SELECTポリシーを作成（存在しない場合のみ）
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'user_profiles' 
      AND policyname = 'Users can view own profile'
    ) THEN
      CREATE POLICY "Users can view own profile" ON public.user_profiles
        FOR SELECT 
        USING (auth.uid() = user_id);
      
      RAISE NOTICE 'user_profilesテーブルのSELECTポリシーを作成しました';
    END IF;
    
    -- INSERTポリシーを作成（存在しない場合のみ）
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'user_profiles' 
      AND policyname = 'Users can insert own profile'
    ) THEN
      CREATE POLICY "Users can insert own profile" ON public.user_profiles
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
      
      RAISE NOTICE 'user_profilesテーブルのINSERTポリシーを作成しました';
    END IF;
    
    -- 権限を付与
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO anon, authenticated;
    
    RAISE NOTICE 'user_profilesテーブルの権限を付与しました';
  ELSE
    RAISE NOTICE 'user_profilesテーブルが存在しません';
  END IF;
END $$;

-- ============================================
-- 3. instrumentsテーブルの存在確認（参照エラーを防ぐため）
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instruments') THEN
    -- instrumentsテーブルが存在しない場合は作成
    CREATE TABLE IF NOT EXISTS public.instruments (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      name_en text NOT NULL,
      color_primary text NOT NULL,
      color_secondary text NOT NULL,
      color_accent text NOT NULL,
      starting_note text,
      tuning_notes text[],
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- RLSの有効化
    ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
    
    -- RLSポリシーの作成
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'instruments' 
      AND policyname = 'Anyone can view instruments'
    ) THEN
      CREATE POLICY "Anyone can view instruments" ON public.instruments
        FOR SELECT USING (true);
    END IF;
    
    -- 権限を付与
    GRANT SELECT ON TABLE public.instruments TO anon, authenticated;
    
    RAISE NOTICE 'instrumentsテーブルを作成しました（楽器データは別途投入が必要です）';
  ELSE
    RAISE NOTICE 'instrumentsテーブルは既に存在します';
  END IF;
END $$;

-- ============================================
-- 4. PostgRESTのスキーマキャッシュをリロード（PostgRESTが使用されている場合）
-- ============================================
-- NOTIFY pgrst, 'reload schema';

-- マイグレーション完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '新規登録後のエラー修正マイグレーションが完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. goals.show_on_calendarカラムの追加';
  RAISE NOTICE '2. user_profilesテーブルのRLSポリシー修正';
  RAISE NOTICE '3. instrumentsテーブルの存在確認';
  RAISE NOTICE '========================================';
END $$;




