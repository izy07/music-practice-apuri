-- 元のRLSポリシーを復元
-- 問題のあるマイグレーションで削除された可能性のあるポリシーを復元します

-- ============================================
-- 1. user_settingsとtutorial_progressの元のポリシーを確認・復元
-- ============================================

-- user_settingsの元のポリシーを確認
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
    
    -- 元のポリシーが存在しない場合のみ作成
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'Users can view own settings') THEN
      CREATE POLICY "Users can view own settings"
        ON user_settings
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'Users can insert own settings') THEN
      CREATE POLICY "Users can insert own settings"
        ON user_settings
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'Users can update own settings') THEN
      CREATE POLICY "Users can update own settings"
        ON user_settings
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- tutorial_progressの元のポリシーを確認
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tutorial_progress') THEN
    ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;
    
    -- 元のポリシーが存在しない場合のみ作成
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tutorial_progress' AND policyname = 'Users can view own tutorial progress') THEN
      CREATE POLICY "Users can view own tutorial progress"
        ON tutorial_progress
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tutorial_progress' AND policyname = 'Users can insert own tutorial progress') THEN
      CREATE POLICY "Users can insert own tutorial progress"
        ON tutorial_progress
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tutorial_progress' AND policyname = 'Users can update own tutorial progress') THEN
      CREATE POLICY "Users can update own tutorial progress"
        ON tutorial_progress
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- 2. すべてのテーブルでRLSが有効化されていることを確認（既存のポリシーは保持）
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
      -- RLSを有効化（既存のポリシーは保持される）
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================
-- 3. ビューを確認（既存のビューは保持）
-- ============================================

-- ビューは既存のものを保持し、必要に応じて所有者のみ変更
DO $$
DECLARE
  view_record RECORD;
BEGIN
  FOR view_record IN 
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_schema = 'public'
    ORDER BY table_name
  LOOP
    BEGIN
      -- ビューの所有者をpostgresに設定（セキュリティ定義者ビューの問題を回避）
      EXECUTE format('ALTER VIEW %I OWNER TO postgres', view_record.table_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

