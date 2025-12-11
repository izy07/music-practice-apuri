-- practice_sessionsテーブルにupdated_atカラムを追加（存在チェック付き）

-- updated_atカラムが存在しない場合のみ追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_sessions' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE practice_sessions 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- updated_atカラムにコメントを追加
    COMMENT ON COLUMN practice_sessions.updated_at IS 'レコードの最終更新日時';
    
    -- 既存のレコードのupdated_atをcreated_atと同じ値に設定
    UPDATE practice_sessions 
    SET updated_at = created_at 
    WHERE updated_at IS NULL;
  END IF;
END $$;

-- updated_atカラムを自動更新するトリガー関数を作成（存在しない場合のみ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- practice_sessionsテーブルにトリガーを追加（存在しない場合のみ）
DROP TRIGGER IF EXISTS update_practice_sessions_updated_at ON practice_sessions;
CREATE TRIGGER update_practice_sessions_updated_at
    BEFORE UPDATE ON practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

