-- ============================================
-- practice_schedulesテーブルのカラム修正
-- ============================================
-- 実行日: 2025-12-09
-- ============================================
-- このマイグレーションは、以下の問題を修正します：
-- 1. notesカラムが存在しない（アプリケーションコードがnotesを使用）
-- 2. created_byが自動設定されていない
-- ============================================

-- ============================================
-- 1. notesカラムの追加
-- ============================================
DO $$
BEGIN
  -- notesカラムが存在しない場合は追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_schedules' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE practice_schedules ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ practice_schedulesテーブルにnotesカラムを追加しました';
  ELSE
    RAISE NOTICE 'ℹ️ practice_schedulesテーブルのnotesカラムは既に存在します';
  END IF;
END $$;

-- ============================================
-- 2. created_byのNOT NULL制約の確認（既存データがある場合は緩和）
-- ============================================
DO $$
BEGIN
  -- created_byがNOT NULLの場合、制約を確認
  -- 実際には、リポジトリ層で自動設定されるため、NOT NULLのままでも問題ない
  -- ただし、既存のNULLデータがある場合は制約を緩和
  IF EXISTS (
    SELECT 1 FROM practice_schedules WHERE created_by IS NULL
  ) THEN
    -- NULLデータがある場合のみ制約を緩和
    ALTER TABLE practice_schedules ALTER COLUMN created_by DROP NOT NULL;
    RAISE NOTICE '✅ practice_schedulesテーブルのcreated_byのNOT NULL制約を緩和しました（NULLデータが存在するため）';
  ELSE
    RAISE NOTICE 'ℹ️ practice_schedulesテーブルのcreated_byはNOT NULLのままです（リポジトリ層で自動設定）';
  END IF;
END $$;

-- ============================================
-- 3. 確認メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'practice_schedulesテーブルのカラム修正が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. notesカラムの追加';
  RAISE NOTICE '2. created_byのNOT NULL制約の緩和';
  RAISE NOTICE '========================================';
END $$;

