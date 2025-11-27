-- 複数楽器対応のためのマイグレーション

-- user_profilesテーブルに楽器履歴を追加
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS instrument_history JSONB DEFAULT '[]'::jsonb;

-- 練習記録に楽器IDを追加
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL;

-- 目標に楽器IDを追加
ALTER TABLE goals ADD COLUMN IF NOT EXISTS instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL;

-- 録音に楽器IDを追加（既存のテーブルがある場合）
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recordings') THEN
    ALTER TABLE recordings ADD COLUMN IF NOT EXISTS instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 統計情報に楽器IDを追加（既存のテーブルがある場合）
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'statistics') THEN
    ALTER TABLE statistics ADD COLUMN IF NOT EXISTS instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_practice_sessions_instrument_id ON practice_sessions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_goals_instrument_id ON goals(instrument_id);

-- コメント追加
COMMENT ON COLUMN user_profiles.instrument_history IS '楽器変更履歴: [{"instrument_id": "uuid", "selected_at": "timestamp"}]';
COMMENT ON COLUMN practice_sessions.instrument_id IS '練習時に使用した楽器ID';
COMMENT ON COLUMN goals.instrument_id IS '目標に関連する楽器ID';
