-- practice_sessions テーブルの input_method 制約を確実に更新
-- 'timer' を含むすべての有効な値を確実に許可する

-- 既存の制約を削除（複数の可能性があるため、すべて削除）
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- すべての practice_sessions_input_method_check 制約を削除
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'practice_sessions'::regclass 
        AND conname LIKE '%input_method%'
    LOOP
        EXECUTE format('ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- カラムが存在することを確認してから制約を追加
DO $$
BEGIN
    -- カラムが存在するか確認
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'practice_sessions' 
        AND column_name = 'input_method'
    ) THEN
        -- 新しい制約を追加（'timer' を含む）
        ALTER TABLE practice_sessions 
        ADD CONSTRAINT practice_sessions_input_method_check 
        CHECK (input_method IN ('manual', 'preset', 'voice', 'timer'));
        
        RAISE NOTICE 'Added constraint: practice_sessions_input_method_check';
    ELSE
        RAISE NOTICE 'Column input_method does not exist, skipping constraint creation';
    END IF;
END $$;

