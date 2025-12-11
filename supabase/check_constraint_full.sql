-- my_songsテーブルのstatus CHECK制約の完全な定義を確認

-- 方法1: pg_constraintを使用（完全な定義を取得）
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS full_constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.my_songs'::regclass
    AND conname = 'my_songs_status_check';

-- 方法2: 制約が正しく設定されているか確認（期待される値）
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_constraint
            WHERE conrelid = 'public.my_songs'::regclass
                AND conname = 'my_songs_status_check'
                AND pg_get_constraintdef(oid) LIKE '%played%'
        ) THEN '✅ 制約は正しく設定されています（playedを含む）'
        WHEN EXISTS (
            SELECT 1 
            FROM pg_constraint
            WHERE conrelid = 'public.my_songs'::regclass
                AND conname = 'my_songs_status_check'
        ) THEN '⚠️ 制約は存在しますが、playedが含まれていない可能性があります'
        ELSE '❌ 制約が存在しません - マイグレーションが必要です'
    END AS constraint_status;

-- もし制約が正しくない場合は、以下のSQLを実行してください：
-- ALTER TABLE my_songs DROP CONSTRAINT IF EXISTS my_songs_status_check;
-- ALTER TABLE my_songs ADD CONSTRAINT my_songs_status_check 
--   CHECK (status IN ('want_to_play', 'learning', 'played', 'mastered'));

