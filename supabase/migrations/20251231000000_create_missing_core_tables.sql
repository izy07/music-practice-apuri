-- 安全策: 本番・ローカルを問わず、欠落している場合のみ core テーブルを作成する
-- 目的: PostgREST 404（テーブル未存在）を解消する

-- recordings
CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id uuid,
  title text,
  memo text,
  file_path text NOT NULL,
  duration_seconds integer NOT NULL,
  is_favorite boolean DEFAULT false,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- goals
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('personal_short', 'personal_long', 'group')),
  title text NOT NULL,
  description text,
  target_date date,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_active boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  show_on_calendar boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- インデックス（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_instrument_id ON recordings(instrument_id);
CREATE INDEX IF NOT EXISTS idx_recordings_recorded_at ON recordings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_is_completed ON goals(is_completed);
CREATE INDEX IF NOT EXISTS idx_goals_completed_at ON goals(completed_at);


