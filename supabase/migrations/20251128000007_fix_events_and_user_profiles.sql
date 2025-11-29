-- ============================================
-- eventsテーブルとuser_profilesテーブルの問題を根本的に解決
-- ============================================
-- 実行日: 2025-11-28
-- 目的: 
--   1. eventsテーブルにdateカラムを確実に追加
--   2. user_profilesテーブルのRLSポリシーと権限を確実に設定
--   3. すべての必要なインデックスとトリガーを確実に作成
-- ============================================

-- ============================================
-- 1. eventsテーブルの完全な修正
-- ============================================

-- eventsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- dateカラムの追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'date'
  ) THEN
    -- 既存のレコードがある場合は、デフォルト値を設定
    ALTER TABLE public.events ADD COLUMN date date;
    
    -- 既存のレコードにデフォルト値を設定
    UPDATE public.events 
    SET date = CURRENT_DATE 
    WHERE date IS NULL;
    
    -- NOT NULL制約を追加
    ALTER TABLE public.events ALTER COLUMN date SET NOT NULL;
    ALTER TABLE public.events ALTER COLUMN date SET DEFAULT CURRENT_DATE;
    
    RAISE NOTICE 'dateカラムを追加しました';
  ELSE
    RAISE NOTICE 'dateカラムは既に存在します';
  END IF;
END $$;

-- インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_is_completed ON public.events(is_completed);
CREATE INDEX IF NOT EXISTS idx_events_completed_at ON public.events(completed_at);

-- RLSポリシーの設定
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS events_select_own ON public.events;
DROP POLICY IF EXISTS events_insert_own ON public.events;
DROP POLICY IF EXISTS events_update_own ON public.events;
DROP POLICY IF EXISTS events_delete_own ON public.events;
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

-- 新しいRLSポリシーを作成
CREATE POLICY events_select_own ON public.events 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY events_insert_own ON public.events 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY events_update_own ON public.events 
  FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY events_delete_own ON public.events 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 権限の設定
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO anon, authenticated;

-- ============================================
-- 2. user_profilesテーブルの完全な修正
-- ============================================

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
  CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id)
);

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

-- 既存のポリシーをすべて削除（名前の違いに対応）
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_delete_own ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_own" ON public.user_profiles;

-- 新しいRLSポリシーを作成
CREATE POLICY user_profiles_select_own
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_profiles_insert_own
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_update_own
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_delete_own
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- 権限の付与
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO anon, authenticated;

-- ============================================
-- 3. 確認メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ eventsテーブルとuser_profilesテーブルの修正が完了しました';
  RAISE NOTICE '✅ すべてのRLSポリシーと権限が設定されました';
END $$;

