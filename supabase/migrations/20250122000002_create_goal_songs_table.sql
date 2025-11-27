-- goal_songsテーブルの作成
-- 目標と楽曲を関連付けるテーブル

-- my_songsテーブルが存在する場合のみgoal_songsテーブルを作成
CREATE TABLE IF NOT EXISTS goal_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID,
  song_id UUID,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, song_id)
);

-- 外部キー制約を追加（テーブルが存在する場合のみ）
DO $$
BEGIN
  -- goalsテーブルが存在する場合、外部キー制約を追加
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'goal_songs_goal_id_fkey'
    ) THEN
      ALTER TABLE goal_songs 
      ADD CONSTRAINT goal_songs_goal_id_fkey 
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- my_songsテーブルが存在する場合、外部キー制約を追加
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'my_songs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'goal_songs_song_id_fkey'
    ) THEN
      ALTER TABLE goal_songs 
      ADD CONSTRAINT goal_songs_song_id_fkey 
      FOREIGN KEY (song_id) REFERENCES my_songs(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

-- インデックスとポリシーの作成（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_songs') THEN
    -- インデックスの作成
    CREATE INDEX IF NOT EXISTS idx_goal_songs_user_id ON goal_songs(user_id);
    CREATE INDEX IF NOT EXISTS idx_goal_songs_goal_id ON goal_songs(goal_id);
    CREATE INDEX IF NOT EXISTS idx_goal_songs_song_id ON goal_songs(song_id);
    CREATE INDEX IF NOT EXISTS idx_goal_songs_priority ON goal_songs(priority);

    -- RLS（Row Level Security）の有効化
    ALTER TABLE goal_songs ENABLE ROW LEVEL SECURITY;

    -- RLSポリシーの作成
    CREATE POLICY "Users can view own goal songs" ON goal_songs
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own goal songs" ON goal_songs
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own goal songs" ON goal_songs
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own goal songs" ON goal_songs
      FOR DELETE USING (auth.uid() = user_id);

    -- 更新日時を自動更新するトリガー
    CREATE TRIGGER update_goal_songs_updated_at
      BEFORE UPDATE ON goal_songs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;
