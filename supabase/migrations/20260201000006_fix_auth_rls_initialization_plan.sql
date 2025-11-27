-- Auth RLS Initialization Planの警告を修正
-- my_songsとtarget_songsテーブルのRLSポリシーを適切に再設定

-- ============================================
-- 1. my_songsテーブルのRLSポリシーを再設定
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'my_songs'
  ) THEN
    -- RLSを確実に有効化
    ALTER TABLE my_songs ENABLE ROW LEVEL SECURITY;
    
    -- 既存のポリシーを削除
    DROP POLICY IF EXISTS "Users can view own songs" ON my_songs;
    DROP POLICY IF EXISTS "Users can insert own songs" ON my_songs;
    DROP POLICY IF EXISTS "Users can update own songs" ON my_songs;
    DROP POLICY IF EXISTS "Users can delete own songs" ON my_songs;
    DROP POLICY IF EXISTS "Users can view own my_songs" ON my_songs;
    DROP POLICY IF EXISTS "Users can insert own my_songs" ON my_songs;
    DROP POLICY IF EXISTS "Users can update own my_songs" ON my_songs;
    DROP POLICY IF EXISTS "Users can delete own my_songs" ON my_songs;
    
    -- 新しいポリシーを作成（Auth RLS Initialization Planに対応）
    CREATE POLICY "Users can view own songs"
      ON my_songs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert own songs"
      ON my_songs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update own songs"
      ON my_songs
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete own songs"
      ON my_songs
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
    
    -- RLSが確実に有効化されていることを確認
    ALTER TABLE my_songs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- 2. target_songsテーブルのRLSポリシーを再設定
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'target_songs'
  ) THEN
    -- RLSを確実に有効化
    ALTER TABLE target_songs ENABLE ROW LEVEL SECURITY;
    
    -- 既存のポリシーを削除
    DROP POLICY IF EXISTS "Users can view own target songs" ON target_songs;
    DROP POLICY IF EXISTS "Users can insert own target songs" ON target_songs;
    DROP POLICY IF EXISTS "Users can update own target songs" ON target_songs;
    DROP POLICY IF EXISTS "Users can delete own target songs" ON target_songs;
    DROP POLICY IF EXISTS "Users can view own target_songs" ON target_songs;
    DROP POLICY IF EXISTS "Users can insert own target_songs" ON target_songs;
    DROP POLICY IF EXISTS "Users can update own target_songs" ON target_songs;
    DROP POLICY IF EXISTS "Users can delete own target_songs" ON target_songs;
    
    -- 新しいポリシーを作成（Auth RLS Initialization Planに対応）
    CREATE POLICY "Users can view own target songs"
      ON target_songs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert own target songs"
      ON target_songs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update own target songs"
      ON target_songs
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete own target songs"
      ON target_songs
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
    
    -- RLSが確実に有効化されていることを確認
    ALTER TABLE target_songs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- 3. すべてのuser_idカラムを持つテーブルでRLSポリシーを確認・修正
-- ============================================

DO $$
DECLARE
  table_record RECORD;
  has_user_id BOOLEAN;
  has_select_policy BOOLEAN;
  has_insert_policy BOOLEAN;
  has_update_policy BOOLEAN;
  has_delete_policy BOOLEAN;
  table_name_var TEXT;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('schema_migrations', 'supabase_migrations')
    ORDER BY table_name
  LOOP
    table_name_var := table_record.table_name;
    
    BEGIN
      -- user_idカラムが存在するか確認
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_name_var
        AND column_name = 'user_id'
      ) INTO has_user_id;
      
      -- user_idカラムがある場合のみ処理
      IF has_user_id THEN
        -- RLSを有効化
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name_var);
        
        -- 既存のポリシーの存在を確認
        SELECT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = table_name_var 
          AND cmd = 'SELECT'
        ) INTO has_select_policy;
        
        SELECT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = table_name_var 
          AND cmd = 'INSERT'
        ) INTO has_insert_policy;
        
        SELECT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = table_name_var 
          AND cmd = 'UPDATE'
        ) INTO has_update_policy;
        
        SELECT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename = table_name_var 
          AND cmd = 'DELETE'
        ) INTO has_delete_policy;
        
        -- 不足しているポリシーのみ作成（既存のポリシーは保持）
        IF NOT has_select_policy THEN
          BEGIN
            EXECUTE format('
              CREATE POLICY "Users can view own %I"
                ON %I
                FOR SELECT
                TO authenticated
                USING (auth.uid() = user_id)',
              table_name_var, table_name_var);
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
        
        IF NOT has_insert_policy THEN
          BEGIN
            EXECUTE format('
              CREATE POLICY "Users can insert own %I"
                ON %I
                FOR INSERT
                TO authenticated
                WITH CHECK (auth.uid() = user_id)',
              table_name_var, table_name_var);
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
        
        IF NOT has_update_policy THEN
          BEGIN
            EXECUTE format('
              CREATE POLICY "Users can update own %I"
                ON %I
                FOR UPDATE
                TO authenticated
                USING (auth.uid() = user_id)
                WITH CHECK (auth.uid() = user_id)',
              table_name_var, table_name_var);
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
        
        IF NOT has_delete_policy THEN
          BEGIN
            EXECUTE format('
              CREATE POLICY "Users can delete own %I"
                ON %I
                FOR DELETE
                TO authenticated
                USING (auth.uid() = user_id)',
              table_name_var, table_name_var);
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
        
        -- RLSが確実に有効化されていることを確認
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name_var);
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

