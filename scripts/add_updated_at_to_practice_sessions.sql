-- practice_sessionsテーブルにupdated_atカラムを追加するスクリプト
-- Supabase SQL Editorで実行してください

-- 1. updated_atカラムが存在するか確認
DO $$
BEGIN
  -- updated_atカラムが存在しない場合のみ追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_sessions' 
    AND column_name = 'updated_at'
  ) THEN
    -- updated_atカラムを追加
    ALTER TABLE practice_sessions 
    ADD COLUMN updated_at timestamptz DEFAULT now();
    
    -- 既存のレコードのupdated_atをcreated_atと同じ値に設定
    UPDATE practice_sessions 
    SET updated_at = created_at 
    WHERE updated_at IS NULL;
    
    RAISE NOTICE 'updated_atカラムを追加しました';
  ELSE
    RAISE NOTICE 'updated_atカラムは既に存在します';
  END IF;
END $$;

-- 2. updated_atカラムにコメントを追加
COMMENT ON COLUMN practice_sessions.updated_at IS 'レコードの最終更新日時';

-- 3. updated_atカラムを自動更新するトリガー関数を作成（既に存在する場合は置き換え）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. practice_sessionsテーブルにトリガーを追加（既に存在する場合は置き換え）
DROP TRIGGER IF EXISTS update_practice_sessions_updated_at ON practice_sessions;
CREATE TRIGGER update_practice_sessions_updated_at
    BEFORE UPDATE ON practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 確認: updated_atカラムが正しく追加されたか確認
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'practice_sessions' 
AND column_name = 'updated_at';





