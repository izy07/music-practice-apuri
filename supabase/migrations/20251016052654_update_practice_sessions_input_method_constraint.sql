-- practice_sessions テーブルの input_method 制約を更新
-- 'timer' を追加して、タイマー機能で記録された練習も保存できるようにする

-- 既存の制約を削除
ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_input_method_check;

-- 新しい制約を追加（'timer' を含む）
ALTER TABLE practice_sessions ADD CONSTRAINT practice_sessions_input_method_check 
CHECK (input_method IN ('manual', 'preset', 'voice', 'timer'));
