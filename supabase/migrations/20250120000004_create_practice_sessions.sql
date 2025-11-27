-- practice_sessionsテーブルを作成するマイグレーション

-- 練習セッションテーブル
CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id uuid REFERENCES instruments(id),
  practice_date date NOT NULL,
  duration_minutes integer NOT NULL,
  content text,
  audio_url text,
  input_method text DEFAULT 'manual' CHECK (input_method IN ('manual', 'preset', 'voice', 'timer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_practice_date ON practice_sessions(practice_date);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_instrument_id ON practice_sessions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_date ON practice_sessions(user_id, practice_date DESC);

-- RLSを有効化
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
DO $$
BEGIN
  -- ユーザーは自分の練習セッションを閲覧可能
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can read own practice sessions'
  ) THEN
    CREATE POLICY "Users can read own practice sessions"
      ON practice_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分の練習セッションを挿入可能
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can insert own practice sessions'
  ) THEN
    CREATE POLICY "Users can insert own practice sessions"
      ON practice_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分の練習セッションを更新可能
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can update own practice sessions'
  ) THEN
    CREATE POLICY "Users can update own practice sessions"
      ON practice_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分の練習セッションを削除可能
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can delete own practice sessions'
  ) THEN
    CREATE POLICY "Users can delete own practice sessions"
      ON practice_sessions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;

-- updated_atカラムのトリガーを作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_practice_sessions_updated_at
  BEFORE UPDATE ON practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
