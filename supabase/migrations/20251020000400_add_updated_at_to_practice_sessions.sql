-- practice_sessionsテーブルにupdated_atカラムを追加

-- updated_atカラムを追加
ALTER TABLE practice_sessions 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- updated_atカラムにコメントを追加
COMMENT ON COLUMN practice_sessions.updated_at IS 'レコードの最終更新日時';

-- updated_atカラムを自動更新するトリガー関数を作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- practice_sessionsテーブルにトリガーを追加
DROP TRIGGER IF EXISTS update_practice_sessions_updated_at ON practice_sessions;
CREATE TRIGGER update_practice_sessions_updated_at
    BEFORE UPDATE ON practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
