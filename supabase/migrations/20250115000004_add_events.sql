-- イベント管理用のテーブルの作成
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_is_completed ON events(is_completed);
CREATE INDEX IF NOT EXISTS idx_events_completed_at ON events(completed_at);

-- RLS（Row Level Security）の有効化
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- 更新日時を自動更新するトリガー
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 統計クエリ用のビュー作成
CREATE OR REPLACE VIEW events_overview AS
SELECT 
  user_id,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE is_completed = false) as active_events,
  COUNT(*) FILTER (WHERE is_completed = true) as completed_events,
  COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming_events,
  COUNT(*) FILTER (WHERE date < CURRENT_DATE AND is_completed = false) as overdue_events
FROM events
GROUP BY user_id;
