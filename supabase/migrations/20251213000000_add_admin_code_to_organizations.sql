-- organizationsテーブルにadmin_codeとadmin_code_hashカラムを追加
-- 組織作成時に管理者コードを設定するために必要

DO $$
BEGIN
  -- admin_codeカラムが存在しない場合は追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'admin_code'
  ) THEN
    ALTER TABLE organizations ADD COLUMN admin_code VARCHAR(4);
    RAISE NOTICE '✅ admin_codeカラムを追加しました';
  ELSE
    RAISE NOTICE 'ℹ️ admin_codeカラムは既に存在します';
  END IF;
  
  -- admin_code_hashカラムが存在しない場合は追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'admin_code_hash'
  ) THEN
    ALTER TABLE organizations ADD COLUMN admin_code_hash TEXT;
    RAISE NOTICE '✅ admin_code_hashカラムを追加しました';
  ELSE
    RAISE NOTICE 'ℹ️ admin_code_hashカラムは既に存在します';
  END IF;
  
  -- admin_codeにインデックスを追加（検索性能向上）
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND indexname = 'idx_organizations_admin_code'
  ) THEN
    CREATE INDEX idx_organizations_admin_code ON organizations(admin_code);
    RAISE NOTICE '✅ admin_codeインデックスを追加しました';
  ELSE
    RAISE NOTICE 'ℹ️ admin_codeインデックスは既に存在します';
  END IF;
END $$;


