-- music_termsテーブルにuser_idとis_user_addedカラムを追加
-- ユーザーが独自の用語を追加できるようにする

-- user_idカラムを追加（NULL許可、ユーザーが追加した用語のみ設定）
ALTER TABLE music_terms 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- is_user_addedカラムを追加（ユーザーが追加した用語かどうかを示すフラグ）
ALTER TABLE music_terms 
ADD COLUMN IF NOT EXISTS is_user_added BOOLEAN DEFAULT false;

-- インデックスを追加（ユーザーが追加した用語の検索を高速化）
CREATE INDEX IF NOT EXISTS idx_music_terms_user_id ON music_terms(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_music_terms_is_user_added ON music_terms(is_user_added) WHERE is_user_added = true;

-- RLSポリシーを更新
-- 既存の読み取りポリシーは維持（全ユーザーが全用語を読み取り可能）
-- ユーザーが追加した用語の挿入・更新・削除を許可

-- ユーザーが自分の用語を挿入できるポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'music_terms' 
    AND policyname = 'Users can insert own terms'
  ) THEN
    CREATE POLICY "Users can insert own terms"
      ON music_terms
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = user_id 
        AND is_user_added = true
      );
  END IF;
END $$;

-- ユーザーが自分の用語を更新できるポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'music_terms' 
    AND policyname = 'Users can update own terms'
  ) THEN
    CREATE POLICY "Users can update own terms"
      ON music_terms
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = user_id 
        AND is_user_added = true
      )
      WITH CHECK (
        auth.uid() = user_id 
        AND is_user_added = true
      );
  END IF;
END $$;

-- ユーザーが自分の用語を削除できるポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'music_terms' 
    AND policyname = 'Users can delete own terms'
  ) THEN
    CREATE POLICY "Users can delete own terms"
      ON music_terms
      FOR DELETE
      TO authenticated
      USING (
        auth.uid() = user_id 
        AND is_user_added = true
      );
  END IF;
END $$;

