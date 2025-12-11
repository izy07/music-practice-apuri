-- 管理者コード機能を削除
-- admin_codeとadmin_code_hashカラムを削除

DO $$
BEGIN
  -- organizationsテーブルが存在する場合のみ処理
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) THEN
    -- admin_codeカラムが存在する場合は削除
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'admin_code'
    ) THEN
      ALTER TABLE organizations DROP COLUMN admin_code;
      RAISE NOTICE '✅ admin_codeカラムを削除しました';
    ELSE
      RAISE NOTICE 'ℹ️ admin_codeカラムは存在しません';
    END IF;
    
    -- admin_code_hashカラムが存在する場合は削除
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'admin_code_hash'
    ) THEN
      ALTER TABLE organizations DROP COLUMN admin_code_hash;
      RAISE NOTICE '✅ admin_code_hashカラムを削除しました';
    ELSE
      RAISE NOTICE 'ℹ️ admin_code_hashカラムは存在しません';
    END IF;
    
    -- admin_codeインデックスが存在する場合は削除
    IF EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'organizations' 
      AND indexname = 'idx_organizations_admin_code'
    ) THEN
      DROP INDEX idx_organizations_admin_code;
      RAISE NOTICE '✅ admin_codeインデックスを削除しました';
    ELSE
      RAISE NOTICE 'ℹ️ admin_codeインデックスは存在しません';
    END IF;
  END IF;
END $$;

