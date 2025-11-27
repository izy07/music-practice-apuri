-- 目標設定のアップグレード用の新しいテーブルを作成

-- 1. 目標曲テーブルの作成
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

-- 2. 憧れの演奏テーブルの作成
CREATE TABLE IF NOT EXISTS inspirational_performances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  notes TEXT,
  slot INTEGER CHECK (slot IN (1, 2)) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slot)
);

-- 3. 既存のgoalsテーブルに新しいカラムを追加（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    ALTER TABLE goals ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
    ALTER TABLE goals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END$$;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_target_songs_user_id ON target_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirational_performances_user_id ON inspirational_performances(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirational_performances_slot ON inspirational_performances(slot);

-- goalsテーブルが存在する場合のみインデックスを作成
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    CREATE INDEX IF NOT EXISTS idx_goals_is_completed ON goals(is_completed);
    CREATE INDEX IF NOT EXISTS idx_goals_completed_at ON goals(completed_at);
  END IF;
END$$;

-- RLS（Row Level Security）の有効化
ALTER TABLE target_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspirational_performances ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
CREATE POLICY "Users can view own target songs" ON target_songs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own target songs" ON target_songs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own target songs" ON target_songs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own target songs" ON target_songs
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own inspirational performances" ON inspirational_performances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inspirational performances" ON inspirational_performances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inspirational performances" ON inspirational_performances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inspirational performances" ON inspirational_performances
  FOR DELETE USING (auth.uid() = user_id);

-- 更新日時を自動更新するトリガー関数（存在しない場合のみ作成）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新日時を自動更新するトリガー
CREATE TRIGGER update_target_songs_updated_at
  BEFORE UPDATE ON target_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspirational_performances_updated_at
  BEFORE UPDATE ON inspirational_performances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 統計クエリ用のビュー作成（goalsテーブルが存在する場合のみ）
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
