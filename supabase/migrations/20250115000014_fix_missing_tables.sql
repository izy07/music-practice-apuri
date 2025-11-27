-- 不足しているテーブルとカラムを修正するマイグレーション

-- 1. user_profilesテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  selected_instrument_id text,
  practice_level text DEFAULT 'beginner' CHECK (practice_level IN ('beginner', 'intermediate', 'advanced')),
  level_selected_at timestamptz,
  total_practice_minutes integer DEFAULT 0,
  organization TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- user_profilesテーブルのRLSを有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- user_profilesテーブルのRLSポリシーを作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile" ON user_profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON user_profiles
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 2. goalsテーブルの修正
-- is_completedとcompleted_atカラムを追加
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    ALTER TABLE goals ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
    ALTER TABLE goals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END$$;

-- 3. target_songsテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS target_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. inspirational_performancesテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS inspirational_performances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  performer_name TEXT,
  piece_name TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  genre TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_target_songs_user_id ON target_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirational_performances_user_id ON inspirational_performances(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirational_performances_created_at ON inspirational_performances(created_at);

-- goalsテーブルが存在する場合のみインデックスを作成
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    CREATE INDEX IF NOT EXISTS idx_goals_is_completed ON goals(is_completed);
    CREATE INDEX IF NOT EXISTS idx_goals_completed_at ON goals(completed_at);
  END IF;
END$$;

-- 6. RLS（Row Level Security）の有効化
ALTER TABLE target_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspirational_performances ENABLE ROW LEVEL SECURITY;

-- 7. RLSポリシーの作成
DO $$
BEGIN
  -- target_songsテーブルのポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'target_songs' AND policyname = 'Users can view own target songs'
  ) THEN
    CREATE POLICY "Users can view own target songs" ON target_songs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'target_songs' AND policyname = 'Users can insert own target songs'
  ) THEN
    CREATE POLICY "Users can insert own target songs" ON target_songs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'target_songs' AND policyname = 'Users can update own target songs'
  ) THEN
    CREATE POLICY "Users can update own target songs" ON target_songs
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'target_songs' AND policyname = 'Users can delete own target songs'
  ) THEN
    CREATE POLICY "Users can delete own target songs" ON target_songs
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- inspirational_performancesテーブルのポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspirational_performances' AND policyname = 'Users can view own inspirational performances'
  ) THEN
    CREATE POLICY "Users can view own inspirational performances" ON inspirational_performances
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspirational_performances' AND policyname = 'Users can insert own inspirational performances'
  ) THEN
    CREATE POLICY "Users can insert own inspirational performances" ON inspirational_performances
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspirational_performances' AND policyname = 'Users can update own inspirational performances'
  ) THEN
    CREATE POLICY "Users can update own inspirational performances" ON inspirational_performances
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspirational_performances' AND policyname = 'Users can delete own inspirational performances'
  ) THEN
    CREATE POLICY "Users can delete own inspirational performances" ON inspirational_performances
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;

-- 8. 更新日時を自動更新するトリガー関数（存在しない場合）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. トリガーの作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_target_songs_updated_at'
  ) THEN
    CREATE TRIGGER update_target_songs_updated_at
      BEFORE UPDATE ON target_songs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_inspirational_performances_updated_at'
  ) THEN
    CREATE TRIGGER update_inspirational_performances_updated_at
      BEFORE UPDATE ON inspirational_performances
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- 10. 統計クエリ用のビュー作成（goalsテーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    CREATE OR REPLACE VIEW goals_overview AS
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE is_completed = false) as active_goals,
      COUNT(*) FILTER (WHERE is_completed = true) as completed_goals,
      COUNT(*) FILTER (WHERE goal_type = 'personal_short') as short_term_goals,
      COUNT(*) FILTER (WHERE goal_type = 'personal_long') as long_term_goals,
      COUNT(*) FILTER (WHERE goal_type = 'group') as group_goals,
      AVG(progress_percentage) FILTER (WHERE is_completed = false) as average_progress
    FROM goals
    GROUP BY user_id;
  END IF;
END$$;
