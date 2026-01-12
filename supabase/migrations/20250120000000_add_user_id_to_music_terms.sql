-- ============================================
-- music_terms テーブルに user_id カラムを追加
-- ============================================
-- 日付: 2025-01-20
-- 目的: ユーザーが作成した用語を識別できるようにする
-- ============================================

-- user_id カラムを追加（NULL許可、既存データはNULLのまま）
ALTER TABLE public.music_terms 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_music_terms_user_id ON public.music_terms(user_id);

-- RLSポリシーを更新
-- ユーザーは自分の用語を更新・削除可能
DO $$
BEGIN
  -- ユーザーは自分の用語を更新可能
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_terms' AND policyname = 'Users can update own music terms') THEN
    CREATE POLICY "Users can update own music terms" ON public.music_terms
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分の用語を削除可能
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_terms' AND policyname = 'Users can delete own music terms') THEN
    CREATE POLICY "Users can delete own music terms" ON public.music_terms
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分の用語を追加可能
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_terms' AND policyname = 'Users can insert own music terms') THEN
    CREATE POLICY "Users can insert own music terms" ON public.music_terms
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
