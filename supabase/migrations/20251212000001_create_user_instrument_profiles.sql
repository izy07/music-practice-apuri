-- user_instrument_profilesテーブルの作成
-- 楽器ごとの練習レベルを保存するためのテーブル

-- 拡張機能の確認
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- user_instrument_profilesテーブルの作成
CREATE TABLE IF NOT EXISTS public.user_instrument_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
  practice_level text CHECK (practice_level IN ('beginner', 'intermediate', 'advanced')),
  level_selected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- 1ユーザー1楽器につき1レコードのみ（複合ユニーク制約）
  CONSTRAINT user_instrument_profiles_user_instrument_unique UNIQUE (user_id, instrument_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_user_instrument_profiles_user_id ON public.user_instrument_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_instrument_profiles_instrument_id ON public.user_instrument_profiles(instrument_id);
CREATE INDEX IF NOT EXISTS idx_user_instrument_profiles_user_instrument ON public.user_instrument_profiles(user_id, instrument_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION public.trg_set_updated_at_user_instrument_profiles()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_user_instrument_profiles ON public.user_instrument_profiles;
CREATE TRIGGER set_updated_at_user_instrument_profiles
  BEFORE UPDATE ON public.user_instrument_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_updated_at_user_instrument_profiles();

-- RLSの有効化
ALTER TABLE public.user_instrument_profiles ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
-- ユーザーは自分のレコードのみ選択可能
DROP POLICY IF EXISTS user_instrument_profiles_select_own ON public.user_instrument_profiles;
CREATE POLICY user_instrument_profiles_select_own
  ON public.user_instrument_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のレコードのみ挿入可能
DROP POLICY IF EXISTS user_instrument_profiles_insert_own ON public.user_instrument_profiles;
CREATE POLICY user_instrument_profiles_insert_own
  ON public.user_instrument_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のレコードのみ更新可能
DROP POLICY IF EXISTS user_instrument_profiles_update_own ON public.user_instrument_profiles;
CREATE POLICY user_instrument_profiles_update_own
  ON public.user_instrument_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のレコードのみ削除可能
DROP POLICY IF EXISTS user_instrument_profiles_delete_own ON public.user_instrument_profiles;
CREATE POLICY user_instrument_profiles_delete_own
  ON public.user_instrument_profiles
  FOR DELETE
  USING (auth.uid() = user_id);
