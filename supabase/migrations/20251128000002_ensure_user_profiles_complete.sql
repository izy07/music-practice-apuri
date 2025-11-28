-- user_profilesテーブルと必要なカラムを確実に作成
-- このマイグレーションは、テーブルとカラムが存在しない場合に確実に作成します

-- 拡張機能の確認
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- user_profilesテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  selected_instrument_id uuid,
  practice_level text CHECK (practice_level IN ('beginner', 'intermediate', 'advanced')),
  level_selected_at timestamptz,
  total_practice_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- ユニーク制約を追加（1ユーザー1プロフィール）
  CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id)
);

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

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_selected_instrument_id ON public.user_profiles(selected_instrument_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION public.trg_set_updated_at_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_user_profiles ON public.user_profiles;
CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_updated_at_user_profiles();

-- RLSの有効化
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成（既存のポリシーを削除してから再作成）
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_delete_own ON public.user_profiles;

-- SELECTポリシー: ユーザーは自分のプロフィールを読み取れる
CREATE POLICY user_profiles_select_own
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERTポリシー: ユーザーは自分のプロフィールを作成できる
CREATE POLICY user_profiles_insert_own
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATEポリシー: ユーザーは自分のプロフィールを更新できる
CREATE POLICY user_profiles_update_own
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETEポリシー: ユーザーは自分のプロフィールを削除できる
CREATE POLICY user_profiles_delete_own
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- 権限の付与
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO anon, authenticated;

-- 既存のレコードにデフォルト値を設定
UPDATE public.user_profiles
SET 
  tutorial_completed = COALESCE(tutorial_completed, false),
  onboarding_completed = COALESCE(onboarding_completed, false)
WHERE tutorial_completed IS NULL OR onboarding_completed IS NULL;

