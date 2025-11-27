-- マイライブラリ用の曲管理テーブルの作成
CREATE TABLE IF NOT EXISTS my_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  genre TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  status TEXT CHECK (status IN ('want_to_play', 'learning', 'played', 'mastered')) DEFAULT 'want_to_play',
  notes TEXT,
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_my_songs_user_id ON my_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_my_songs_status ON my_songs(status);
CREATE INDEX IF NOT EXISTS idx_my_songs_difficulty ON my_songs(difficulty);
CREATE INDEX IF NOT EXISTS idx_my_songs_created_at ON my_songs(created_at);

-- RLS（Row Level Security）の有効化
ALTER TABLE my_songs ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
CREATE POLICY "Users can view own songs" ON my_songs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own songs" ON my_songs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own songs" ON my_songs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs" ON my_songs
  FOR DELETE USING (auth.uid() = user_id);

-- 更新日時を自動更新するトリガー
CREATE TRIGGER update_my_songs_updated_at
  BEFORE UPDATE ON my_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 統計クエリ用のビュー作成
CREATE OR REPLACE VIEW my_songs_stats AS
SELECT 
  user_id,
  COUNT(*) as total_songs,
  COUNT(*) FILTER (WHERE status = 'want_to_play') as want_to_play_count,
  COUNT(*) FILTER (WHERE status = 'learning') as learning_count,
  COUNT(*) FILTER (WHERE status = 'played') as played_count,
  COUNT(*) FILTER (WHERE status = 'mastered') as mastered_count,
  COUNT(*) FILTER (WHERE difficulty = 'beginner') as beginner_count,
  COUNT(*) FILTER (WHERE difficulty = 'intermediate') as intermediate_count,
  COUNT(*) FILTER (WHERE difficulty = 'advanced') as advanced_count
FROM my_songs
GROUP BY user_id;
