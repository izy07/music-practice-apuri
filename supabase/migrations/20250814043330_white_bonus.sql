/*
  # 楽器練習アプリ初期スキーマ

  1. 新しいテーブル
    - `instruments` - 楽器マスターデータ
    - `user_profiles` - ユーザープロフィール
    - `practice_sessions` - 練習セッション記録
    - `recordings` - 録音データ
    - `goals` - 目標設定
    - `events` - イベント管理
    - `practice_levels` - 基礎練レベル設定
    - `music_terms` - 音楽用語辞典
    - `ai_chat_history` - AIチャット履歴

  2. セキュリティ
    - 全テーブルでRLSを有効化
    - 認証ユーザーのみアクセス可能なポリシーを設定
*/

-- 楽器マスターテーブル
CREATE TABLE IF NOT EXISTS instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL,
  color_primary text DEFAULT '#8B4513',
  color_secondary text DEFAULT '#F8F9FA',
  color_accent text DEFAULT '#8B4513',
  starting_note text,
  tuning_notes jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- ユーザープロフィールテーブル
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  selected_instrument_id uuid REFERENCES instruments(id),
  practice_level text DEFAULT 'beginner' CHECK (practice_level IN ('beginner', 'intermediate', 'advanced')),
  level_selected_at timestamptz,
  total_practice_minutes integer DEFAULT 0,
  -- チュートリアル進捗管理
  tutorial_completed boolean DEFAULT false,
  tutorial_completed_at timestamptz,
  -- アプリの初期設定完了状況
  onboarding_completed boolean DEFAULT false,
  onboarding_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 練習セッションテーブル
CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id uuid REFERENCES instruments(id),
  practice_date date NOT NULL,
  duration_minutes integer NOT NULL,
  content text,
  audio_url text,
  input_method text DEFAULT 'manual' CHECK (input_method IN ('manual', 'preset', 'voice')),
  created_at timestamptz DEFAULT now()
);

-- 録音データテーブル
CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id uuid REFERENCES instruments(id),
  title text,
  memo text,
  file_path text NOT NULL,
  duration_seconds integer NOT NULL,
  is_favorite boolean DEFAULT false,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 目標設定テーブル
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('personal_short', 'personal_long', 'group')),
  title text NOT NULL,
  description text,
  target_date date,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- イベントテーブル
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 音楽用語辞典テーブル
CREATE TABLE IF NOT EXISTS music_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  reading text NOT NULL,
  category text NOT NULL CHECK (category IN ('tempo', 'dynamics', 'expression', 'articulation', 'accidental', 'technique', 'other')),
  meaning_ja text NOT NULL,
  meaning_en text NOT NULL,
  description_ja text,
  description_en text,
  created_at timestamptz DEFAULT now()
);

-- AIチャット履歴テーブル
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLSを有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

-- ポリシー設定
DO $$
BEGIN
  -- user_profilesテーブルのポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON user_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- practice_sessionsテーブルのポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can read own practice sessions'
  ) THEN
    CREATE POLICY "Users can read own practice sessions"
      ON practice_sessions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can insert own practice sessions'
  ) THEN
    CREATE POLICY "Users can insert own practice sessions"
      ON practice_sessions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can update own practice sessions'
  ) THEN
    CREATE POLICY "Users can update own practice sessions"
      ON practice_sessions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can delete own practice sessions'
  ) THEN
    CREATE POLICY "Users can delete own practice sessions"
      ON practice_sessions
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- recordingsテーブルのポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can read own recordings'
  ) THEN
    CREATE POLICY "Users can read own recordings"
      ON recordings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can insert own recordings'
  ) THEN
    CREATE POLICY "Users can insert own recordings"
      ON recordings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can update own recordings'
  ) THEN
    CREATE POLICY "Users can update own recordings"
      ON recordings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can delete own recordings'
  ) THEN
    CREATE POLICY "Users can delete own recordings"
      ON recordings
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- goalsテーブルのポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can read own goals'
  ) THEN
    CREATE POLICY "Users can read own goals"
      ON goals
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can insert own goals'
  ) THEN
    CREATE POLICY "Users can insert own goals"
      ON goals
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can update own goals'
  ) THEN
    CREATE POLICY "Users can update own goals"
      ON goals
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can delete own goals'
  ) THEN
    CREATE POLICY "Users can delete own goals"
      ON goals
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- eventsテーブルのポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can read own events'
  ) THEN
    CREATE POLICY "Users can read own events"
      ON events
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can insert own events'
  ) THEN
    CREATE POLICY "Users can insert own events"
      ON events
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can update own events'
  ) THEN
    CREATE POLICY "Users can update own events"
      ON events
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can delete own events'
  ) THEN
    CREATE POLICY "Users can delete own events"
      ON events
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- ai_chat_historyテーブルのポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_history' AND policyname = 'Users can read own chat history'
  ) THEN
    CREATE POLICY "Users can read own chat history"
      ON ai_chat_history
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_history' AND policyname = 'Users can insert own chat history'
  ) THEN
    CREATE POLICY "Users can insert own chat history"
      ON ai_chat_history
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_history' AND policyname = 'Users can update own chat history'
  ) THEN
    CREATE POLICY "Users can update own chat history"
      ON ai_chat_history
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_history' AND policyname = 'Users can delete own chat history'
  ) THEN
    CREATE POLICY "Users can delete own chat history"
      ON ai_chat_history
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- 楽器マスターデータと音楽用語は全ユーザーが読み取り可能
CREATE POLICY "Anyone can read instruments"
  ON instruments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read music terms"
  ON music_terms
  FOR SELECT
  TO authenticated
  USING (true);