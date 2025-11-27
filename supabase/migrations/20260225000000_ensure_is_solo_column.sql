-- organizationsテーブルにis_soloカラムが存在することを確認し、存在しない場合は追加
-- PostgRESTのスキーマキャッシュをリフレッシュするために必要

DO $$ 
BEGIN 
  -- organizationsテーブルが存在する場合のみ処理
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
  ) THEN
    -- is_soloカラムが存在しない場合は追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'organizations' 
      AND column_name = 'is_solo'
    ) THEN
      ALTER TABLE organizations ADD COLUMN is_solo BOOLEAN DEFAULT false;
      COMMENT ON COLUMN organizations.is_solo IS 'ソロモードの組織かどうか（個人練習日程管理用）';
      
      -- 既存のレコードをfalseに設定
      UPDATE organizations SET is_solo = false WHERE is_solo IS NULL;
    END IF;
  END IF;
END $$;

