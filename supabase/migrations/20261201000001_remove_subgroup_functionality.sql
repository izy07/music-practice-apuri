-- サブグループ機能を完全に削除するマイグレーション
-- このマイグレーションは、サブグループ関連のすべての機能を削除します

-- ============================================
-- Phase 1: 外部キー制約を削除
-- ============================================

-- user_group_memberships.sub_group_idの外部キー制約を削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%sub_group%' 
    AND table_name = 'user_group_memberships'
  ) THEN
    ALTER TABLE user_group_memberships 
    DROP CONSTRAINT IF EXISTS user_group_memberships_sub_group_id_fkey;
  END IF;
END $$;

-- tasks.sub_group_idの外部キー制約を削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%sub_group%' 
    AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks 
    DROP CONSTRAINT IF EXISTS tasks_sub_group_id_fkey;
  END IF;
END $$;

-- practice_schedules.target_sub_group_idの外部キー制約を削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%target_sub_group%' 
    AND table_name = 'practice_schedules'
  ) THEN
    ALTER TABLE practice_schedules 
    DROP CONSTRAINT IF EXISTS practice_schedules_target_sub_group_id_fkey;
  END IF;
END $$;

-- ============================================
-- Phase 2: カラムを削除
-- ============================================

-- user_group_memberships.sub_group_idカラムを削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_group_memberships' 
    AND column_name = 'sub_group_id'
  ) THEN
    ALTER TABLE user_group_memberships DROP COLUMN sub_group_id;
    RAISE NOTICE '✅ user_group_memberships.sub_group_idカラムを削除しました';
  END IF;
END $$;

-- tasks.sub_group_idカラムを削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'sub_group_id'
  ) THEN
    ALTER TABLE tasks DROP COLUMN sub_group_id;
    RAISE NOTICE '✅ tasks.sub_group_idカラムを削除しました';
  END IF;
END $$;

-- practice_schedules.target_sub_group_idカラムを削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'practice_schedules' 
    AND column_name = 'target_sub_group_id'
  ) THEN
    ALTER TABLE practice_schedules DROP COLUMN target_sub_group_id;
    RAISE NOTICE '✅ practice_schedules.target_sub_group_idカラムを削除しました';
  END IF;
END $$;

-- ============================================
-- Phase 3: ユニーク制約を更新
-- ============================================

-- user_group_membershipsのユニーク制約を更新（sub_group_idを除外）
DO $$
BEGIN
  -- 既存のユニーク制約を削除
  ALTER TABLE user_group_memberships 
  DROP CONSTRAINT IF EXISTS user_group_memberships_user_org_subgroup_unique;
  
  -- 新しいユニーク制約を作成（user_id, organization_idのみ）
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_group_memberships_user_org_unique'
  ) THEN
    ALTER TABLE user_group_memberships 
    ADD CONSTRAINT user_group_memberships_user_org_unique 
    UNIQUE (user_id, organization_id);
    RAISE NOTICE '✅ user_group_membershipsのユニーク制約を更新しました';
  END IF;
END $$;

-- ============================================
-- Phase 4: sub_groupsテーブルを削除
-- ============================================

-- sub_groupsテーブルに関連するトリガーを削除
DROP TRIGGER IF EXISTS update_sub_groups_updated_at ON sub_groups;
DROP TRIGGER IF EXISTS set_updated_at_sub_groups ON sub_groups;

-- sub_groupsテーブルに関連する関数を削除
DROP FUNCTION IF EXISTS trg_set_updated_at_sub_groups();

-- sub_groupsテーブルのRLSポリシーを削除
DROP POLICY IF EXISTS "Users can view sub_groups" ON sub_groups;
DROP POLICY IF EXISTS "組織のメンバーはサブグループを閲覧可能" ON sub_groups;
DROP POLICY IF EXISTS "管理者のみサブグループを作成可能" ON sub_groups;
DROP POLICY IF EXISTS "管理者のみサブグループを更新可能" ON sub_groups;
DROP POLICY IF EXISTS "管理者のみサブグループを削除可能" ON sub_groups;

-- sub_groupsテーブルを削除
DROP TABLE IF EXISTS sub_groups CASCADE;

-- ============================================
-- Phase 5: インデックスを削除
-- ============================================

DROP INDEX IF EXISTS idx_user_group_memberships_sub_group_id;
DROP INDEX IF EXISTS idx_sub_groups_organization_id;
DROP INDEX IF EXISTS idx_practice_tasks_sub_group_id;

-- ============================================
-- Phase 6: 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ サブグループ機能の削除が完了しました';
  RAISE NOTICE '   - sub_groupsテーブルを削除';
  RAISE NOTICE '   - user_group_memberships.sub_group_idカラムを削除';
  RAISE NOTICE '   - tasks.sub_group_idカラムを削除';
  RAISE NOTICE '   - practice_schedules.target_sub_group_idカラムを削除';
END $$;




