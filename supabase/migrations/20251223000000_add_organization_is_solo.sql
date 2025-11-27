-- organizationsテーブルにis_soloカラムを追加
-- ソロモードの組織（個人練習日程管理用）を識別するため
-- 2025-12-23

DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'is_solo') THEN
      ALTER TABLE organizations ADD COLUMN is_solo BOOLEAN DEFAULT false;
      COMMENT ON COLUMN organizations.is_solo IS 'ソロモードの組織かどうか（個人練習日程管理用）';
      
      -- 既存のレコードをfalseに設定
      UPDATE organizations SET is_solo = false WHERE is_solo IS NULL;
    END IF;
  END IF;
END $$;

