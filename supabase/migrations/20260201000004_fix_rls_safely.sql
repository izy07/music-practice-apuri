-- 安全にRLSポリシーを修正（既存のポリシーを削除せず、不足している場合のみ追加）
-- このマイグレーションは、既存のポリシーを保持しながら、不足しているポリシーのみを追加します

-- ============================================
-- 1. すべてのテーブルでRLSを有効化（既存のポリシーは保持）
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
  -- publicスキーマ内のすべてのテーブルをループ
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
      -- RLSを有効化（既に有効化されている場合は何もしない）
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name_var);
      
      -- user_idカラムが存在するか確認
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_name_var
        AND column_name = 'user_id'
      ) INTO has_user_id;
      
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
      
      -- user_idカラムがある場合、不足しているポリシーのみを作成
      IF has_user_id THEN
        -- SELECTポリシーが存在しない場合のみ作成
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
        
        -- INSERTポリシーが存在しない場合のみ作成
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
        
        -- UPDATEポリシーが存在しない場合のみ作成
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
        
        -- DELETEポリシーが存在しない場合のみ作成
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
      ELSE
        -- user_idカラムがない場合（マスターデータなど）
        -- SELECTポリシーが存在しない場合のみ作成
        IF NOT has_select_policy THEN
          BEGIN
            EXECUTE format('
              CREATE POLICY "Authenticated users can read %I"
                ON %I
                FOR SELECT
                TO authenticated
                USING (true)',
              table_name_var, table_name_var);
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- エラーが発生した場合はスキップして続行
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================
-- 2. 主要なマスターデータテーブルのRLSポリシーを確認
-- ============================================

-- instrumentsテーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instruments') THEN
    ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'instruments' AND cmd = 'SELECT') THEN
      CREATE POLICY "Authenticated users can read instruments"
        ON instruments
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- music_termsテーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music_terms') THEN
    ALTER TABLE music_terms ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_terms' AND cmd = 'SELECT') THEN
      CREATE POLICY "Authenticated users can read music terms"
        ON music_terms
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- representative_songsテーブル
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'representative_songs') THEN
    ALTER TABLE representative_songs ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'representative_songs' AND cmd = 'SELECT') THEN
      CREATE POLICY "Authenticated users can read representative songs"
        ON representative_songs
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- ============================================
-- 3. user_settingsとtutorial_progressのポリシーを確認
-- ============================================

-- user_settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND cmd = 'SELECT') THEN
      CREATE POLICY "Users can view own settings"
        ON user_settings
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND cmd = 'INSERT') THEN
      CREATE POLICY "Users can insert own settings"
        ON user_settings
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND cmd = 'UPDATE') THEN
      CREATE POLICY "Users can update own settings"
        ON user_settings
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- tutorial_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tutorial_progress') THEN
    ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tutorial_progress' AND cmd = 'SELECT') THEN
      CREATE POLICY "Users can view own tutorial progress"
        ON tutorial_progress
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tutorial_progress' AND cmd = 'INSERT') THEN
      CREATE POLICY "Users can insert own tutorial progress"
        ON tutorial_progress
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tutorial_progress' AND cmd = 'UPDATE') THEN
      CREATE POLICY "Users can update own tutorial progress"
        ON tutorial_progress
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. すべてのテーブルでRLSが有効化されていることを最終確認
-- ============================================

DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('schema_migrations', 'supabase_migrations')
    ORDER BY table_name
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

