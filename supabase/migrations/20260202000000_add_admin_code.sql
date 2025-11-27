-- 組織に管理者コード機能を追加
-- 組織作成者が4桁の数字で管理者コードを設定し、他のユーザーがそのコードを入力して管理者になれる

DO $$
BEGIN
  -- organizationsテーブルが存在する場合のみ処理
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) THEN
    -- admin_codeカラムが存在しない場合は追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'admin_code'
    ) THEN
      ALTER TABLE organizations ADD COLUMN admin_code VARCHAR(4);
    END IF;
    
    -- admin_code_hashカラムが存在しない場合は追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name = 'admin_code_hash'
    ) THEN
      ALTER TABLE organizations ADD COLUMN admin_code_hash TEXT;
    END IF;
    
    -- admin_codeにインデックスを追加（検索性能向上）
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'organizations' 
      AND indexname = 'idx_organizations_admin_code'
    ) THEN
      CREATE INDEX idx_organizations_admin_code ON organizations(admin_code);
    END IF;
  END IF;
END $$;

