-- user_profilesテーブルのスキーマを統一
-- 複数のマイグレーションで異なる定義が存在するため、統一する

-- 1. テーブル構造の統一（id主キー版に統一）
DO $$ 
BEGIN
  -- user_id主キー版がある場合は、id主キー版に変更
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_pkey' 
    AND table_name = 'user_profiles'
    AND table_schema = 'public'
  ) THEN
    -- 既存の主キー制約を確認（user_idが主キーの場合）
    IF EXISTS (
      SELECT 1 FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'user_profiles'
        AND tc.table_schema = 'public'
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'user_id'
    ) THEN
      -- user_id主キーを削除
      ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
    END IF;
  END IF;
  
  -- idカラムがない場合は追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
      AND column_name = 'id'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN id uuid DEFAULT gen_random_uuid();
  END IF;
  
  -- idにNOT NULL制約を追加（NULLのレコードがある場合）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
      AND column_name = 'id'
      AND is_nullable = 'YES'
      AND table_schema = 'public'
  ) THEN
    UPDATE public.user_profiles SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE public.user_profiles ALTER COLUMN id SET NOT NULL;
  END IF;
  
  -- idを主キーに設定
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_pkey' 
      AND constraint_type = 'PRIMARY KEY'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_profiles ADD PRIMARY KEY (id);
  END IF;
  
  -- user_idに一意制約を追加（1ユーザー1プロフィール）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_user_id_key'
      AND table_schema = 'public'
  ) THEN
    -- 重複を削除（最新のレコードを残す）
    DELETE FROM public.user_profiles p1
    WHERE EXISTS (
      SELECT 1 FROM public.user_profiles p2
      WHERE p2.user_id = p1.user_id
        AND p2.created_at > p1.created_at
    );
    
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
  END IF;
  
  -- user_idにNOT NULL制約を追加
  ALTER TABLE public.user_profiles ALTER COLUMN user_id SET NOT NULL;
  
  -- selected_instrument_idをuuid型に統一
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
      AND column_name = 'selected_instrument_id'
      AND data_type = 'text'
      AND table_schema = 'public'
  ) THEN
    -- text型の場合はuuid型に変換（無効な値はNULLに）
    ALTER TABLE public.user_profiles 
      ALTER COLUMN selected_instrument_id TYPE uuid 
      USING CASE 
        WHEN selected_instrument_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN selected_instrument_id::uuid 
        ELSE NULL 
      END;
  END IF;
END $$;

-- 2. RLSポリシーの統一
DO $$
BEGIN
  -- 古いポリシーを削除
  DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_delete_own" ON public.user_profiles;
  
  -- 新しいポリシーを作成（統一された名前）
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_profiles' 
      AND policyname = 'user_profiles_select_own'
  ) THEN
    CREATE POLICY "user_profiles_select_own"
      ON public.user_profiles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_profiles' 
      AND policyname = 'user_profiles_insert_own'
  ) THEN
    CREATE POLICY "user_profiles_insert_own"
      ON public.user_profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_profiles' 
      AND policyname = 'user_profiles_update_own'
  ) THEN
    CREATE POLICY "user_profiles_update_own"
      ON public.user_profiles FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_profiles' 
      AND policyname = 'user_profiles_delete_own'
  ) THEN
    CREATE POLICY "user_profiles_delete_own"
      ON public.user_profiles FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. インデックスの統一
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- 4. 権限の確認
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO anon, authenticated;

