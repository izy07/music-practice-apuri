-- 音符トレーニング結果テーブルの作成
CREATE TABLE IF NOT EXISTS note_training_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode TEXT CHECK (mode IN ('basic', 'instrument', 'endless')) NOT NULL,
  level INTEGER NOT NULL,
  score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  max_streak INTEGER NOT NULL,
  play_time DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_note_training_results_user_id ON note_training_results(user_id);
CREATE INDEX IF NOT EXISTS idx_note_training_results_score ON note_training_results(score);
CREATE INDEX IF NOT EXISTS idx_note_training_results_created_at ON note_training_results(created_at);

-- RLS（Row Level Security）の有効化
ALTER TABLE note_training_results ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
CREATE POLICY "Users can view own note training results" ON note_training_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own note training results" ON note_training_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 統計クエリ用のビュー作成
CREATE OR REPLACE VIEW note_training_stats AS
SELECT 
  user_id,
  COUNT(*) as total_plays,
  AVG(score) as average_score,
  MAX(score) as best_score,
  AVG(correct_count::DECIMAL / total_count) * 100 as accuracy_percentage,
  AVG(max_streak) as average_max_streak,
  SUM(play_time) as total_play_time
FROM note_training_results
GROUP BY user_id;
