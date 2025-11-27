-- すべてのコアテーブルを確実に作成するマイグレーション
-- 目的: 新規登録後の404エラーを根本的に解決
-- 日付: 2026-02-03

-- ============================================
-- 1. goalsテーブルの作成（完全版）
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('personal_short', 'personal_long', 'group')),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  show_on_calendar BOOLEAN DEFAULT false,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- goalsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_goal_type ON goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_goals_is_completed ON goals(is_completed);
CREATE INDEX IF NOT EXISTS idx_goals_completed_at ON goals(completed_at);
CREATE INDEX IF NOT EXISTS idx_goals_instrument_id ON goals(instrument_id);
CREATE INDEX IF NOT EXISTS idx_goals_show_on_calendar ON goals(show_on_calendar) WHERE show_on_calendar = true;

-- goalsテーブルのRLSを有効化
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- goalsテーブルのRLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'goals' 
    AND policyname = 'Users can view own goals'
  ) THEN
    CREATE POLICY "Users can view own goals" ON goals
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'goals' 
    AND policyname = 'Users can insert own goals'
  ) THEN
    CREATE POLICY "Users can insert own goals" ON goals
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'goals' 
    AND policyname = 'Users can update own goals'
  ) THEN
    CREATE POLICY "Users can update own goals" ON goals
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'goals' 
    AND policyname = 'Users can delete own goals'
  ) THEN
    CREATE POLICY "Users can delete own goals" ON goals
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 2. practice_sessionsテーブルの作成（完全版）
-- ============================================
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  practice_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  content TEXT,
  audio_url TEXT,
  input_method TEXT DEFAULT 'manual' CHECK (input_method IN ('manual', 'preset', 'voice', 'timer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- practice_sessionsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_practice_date ON practice_sessions(practice_date);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_instrument_id ON practice_sessions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_date ON practice_sessions(user_id, practice_date);

-- practice_sessionsテーブルのRLSを有効化
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- practice_sessionsテーブルのRLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'practice_sessions' 
    AND policyname = 'Users can read own practice sessions'
  ) THEN
    CREATE POLICY "Users can read own practice sessions" ON practice_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'practice_sessions' 
    AND policyname = 'Users can insert own practice sessions'
  ) THEN
    CREATE POLICY "Users can insert own practice sessions" ON practice_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'practice_sessions' 
    AND policyname = 'Users can update own practice sessions'
  ) THEN
    CREATE POLICY "Users can update own practice sessions" ON practice_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'practice_sessions' 
    AND policyname = 'Users can delete own practice sessions'
  ) THEN
    CREATE POLICY "Users can delete own practice sessions" ON practice_sessions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 3. recordingsテーブルの作成（完全版）
-- ============================================
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  title TEXT,
  memo TEXT,
  file_path TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- recordingsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_instrument_id ON recordings(instrument_id);
CREATE INDEX IF NOT EXISTS idx_recordings_recorded_at ON recordings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_recordings_user_recorded_at ON recordings(user_id, recorded_at);

-- recordingsテーブルのRLSを有効化
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- recordingsテーブルのRLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'recordings' 
    AND policyname = 'Users can view own recordings'
  ) THEN
    CREATE POLICY "Users can view own recordings" ON recordings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'recordings' 
    AND policyname = 'Users can insert own recordings'
  ) THEN
    CREATE POLICY "Users can insert own recordings" ON recordings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'recordings' 
    AND policyname = 'Users can update own recordings'
  ) THEN
    CREATE POLICY "Users can update own recordings" ON recordings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'recordings' 
    AND policyname = 'Users can delete own recordings'
  ) THEN
    CREATE POLICY "Users can delete own recordings" ON recordings
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- PostgRESTのスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';

