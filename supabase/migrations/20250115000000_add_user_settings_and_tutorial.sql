-- ユーザー設定テーブルの作成
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  language TEXT CHECK (language IN ('ja', 'en')) DEFAULT 'ja',
  theme TEXT CHECK (theme IN ('light', 'dark', 'auto')) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  metronome_settings JSONB DEFAULT '{
    "bpm": 120,
    "time_signature": "4/4",
    "volume": 0.7,
    "sound_type": "click",
    "subdivision": "quarter"
  }',
  tuner_settings JSONB DEFAULT '{
    "reference_pitch": 440,
    "temperament": "equal",
    "volume": 0.7
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- チュートリアル進捗テーブルの作成
CREATE TABLE IF NOT EXISTS tutorial_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_user_id ON tutorial_progress(user_id);

-- RLS（Row Level Security）の有効化
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tutorial progress" ON tutorial_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tutorial progress" ON tutorial_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tutorial progress" ON tutorial_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tutorial_progress_updated_at
  BEFORE UPDATE ON tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
