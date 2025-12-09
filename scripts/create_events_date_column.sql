-- ============================================
-- eventsテーブルのdateカラムを確実に作成するSQLスクリプト
-- ============================================
-- SupabaseダッシュボードのSQL Editorで実行してください
-- 実行日: 2025-11-28
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
    ALTER TABLE public.events ADD COLUMN date date NOT NULL DEFAULT CURRENT_DATE;
    RAISE NOTICE 'dateカラムを追加しました';
  ELSE
    RAISE NOTICE 'dateカラムは既に存在します';
  END IF;
END $$;

-- インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_is_completed ON public.events(is_completed);

-- RLSポリシーの設定
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select_own ON public.events;
DROP POLICY IF EXISTS events_insert_own ON public.events;
DROP POLICY IF EXISTS events_update_own ON public.events;
DROP POLICY IF EXISTS events_delete_own ON public.events;

CREATE POLICY events_select_own ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY events_insert_own ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY events_update_own ON public.events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY events_delete_own ON public.events FOR DELETE USING (auth.uid() = user_id);

-- 権限の設定
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO anon, authenticated;




