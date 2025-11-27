-- Auth RLS Initialization Planの警告を修正
-- user_settingsとtutorial_progressテーブルのRLSポリシーを確実に設定

-- ============================================
-- 1. user_settingsテーブルのRLSポリシーを確実に設定
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings'
  ) THEN
    -- RLSを確実に有効化
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
    
    -- すべての既存ポリシーを削除
    DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
    DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
    DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
    DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
    
    -- SELECTポリシーを作成
    CREATE POLICY "Users can view own settings"
      ON user_settings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
    
    -- INSERTポリシーを作成
    CREATE POLICY "Users can insert own settings"
      ON user_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    
    -- UPDATEポリシーを作成
    CREATE POLICY "Users can update own settings"
      ON user_settings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    -- DELETEポリシーを作成
    CREATE POLICY "Users can delete own settings"
      ON user_settings
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
    
    -- RLSが確実に有効化されていることを確認
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- 2. tutorial_progressテーブルのRLSポリシーを確実に設定
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tutorial_progress'
  ) THEN
    -- RLSを確実に有効化
    ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;
    
    -- すべての既存ポリシーを削除
    DROP POLICY IF EXISTS "Users can view own tutorial progress" ON tutorial_progress;
    DROP POLICY IF EXISTS "Users can insert own tutorial progress" ON tutorial_progress;
    DROP POLICY IF EXISTS "Users can update own tutorial progress" ON tutorial_progress;
    DROP POLICY IF EXISTS "Users can delete own tutorial progress" ON tutorial_progress;
    
    -- SELECTポリシーを作成
    CREATE POLICY "Users can view own tutorial progress"
      ON tutorial_progress
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
    
    -- INSERTポリシーを作成
    CREATE POLICY "Users can insert own tutorial progress"
      ON tutorial_progress
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    
    -- UPDATEポリシーを作成
    CREATE POLICY "Users can update own tutorial progress"
      ON tutorial_progress
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    -- DELETEポリシーを作成
    CREATE POLICY "Users can delete own tutorial progress"
      ON tutorial_progress
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
    
    -- RLSが確実に有効化されていることを確認
    ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- 3. すべてのuser_idカラムを持つテーブルでRLSポリシーを確認
-- ============================================

DO $$
DECLARE
  table_record RECORD;
  has_user_id BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- publicスキーマ内のすべてのテーブルをループ
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    -- user_idカラムが存在するか確認
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_record.table_name 
      AND column_name = 'user_id'
    ) INTO has_user_id;
    
    -- user_idカラムが存在する場合
    IF has_user_id THEN
      -- RLSを有効化
      BEGIN
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
        
        -- ポリシーの数を確認
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = table_record.table_name;
        
        -- ポリシーが存在しない場合、デフォルトのポリシーを作成
        IF policy_count = 0 THEN
          BEGIN
            -- SELECTポリシーを作成
            EXECUTE format('
              CREATE POLICY "Users can view own %I"
                ON %I
                FOR SELECT
                TO authenticated
                USING (auth.uid() = user_id)',
              table_record.table_name, table_record.table_name);
            
            -- INSERTポリシーを作成
            EXECUTE format('
              CREATE POLICY "Users can insert own %I"
                ON %I
                FOR INSERT
                TO authenticated
                WITH CHECK (auth.uid() = user_id)',
              table_record.table_name, table_record.table_name);
            
            -- UPDATEポリシーを作成
            EXECUTE format('
              CREATE POLICY "Users can update own %I"
                ON %I
                FOR UPDATE
                TO authenticated
                USING (auth.uid() = user_id)
                WITH CHECK (auth.uid() = user_id)',
              table_record.table_name, table_record.table_name);
            
            -- DELETEポリシーを作成
            EXECUTE format('
              CREATE POLICY "Users can delete own %I"
                ON %I
                FOR DELETE
                TO authenticated
                USING (auth.uid() = user_id)',
              table_record.table_name, table_record.table_name);
          EXCEPTION WHEN OTHERS THEN
            -- エラーが発生した場合はスキップ
            NULL;
          END;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- エラーが発生した場合はスキップ
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

