-- my_songsテーブルのstatus CHECK制約を確認するクエリ

-- 方法1: information_schemaを使用（推奨）
SELECT 
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'my_songs'
    AND tc.constraint_name = 'my_songs_status_check';

-- 方法2: pg_constraintシステムカタログを使用（より詳細）
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.my_songs'::regclass
    AND conname = 'my_songs_status_check';

-- 方法3: 制約が存在しない場合に備えた確認
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE table_schema = 'public' 
                AND table_name = 'my_songs'
                AND constraint_name = 'my_songs_status_check'
        ) THEN '制約は存在します'
        ELSE '制約が存在しません - マイグレーションが必要です'
    END AS constraint_status;

-- もし制約が存在しない場合は、以下のSQLを実行してください：
-- ALTER TABLE my_songs DROP CONSTRAINT IF EXISTS my_songs_status_check;
-- ALTER TABLE my_songs ADD CONSTRAINT my_songs_status_check 
--   CHECK (status IN ('want_to_play', 'learning', 'played', 'mastered'));

