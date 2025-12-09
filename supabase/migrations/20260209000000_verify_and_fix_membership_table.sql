-- ============================================
-- メンバーシップテーブルの状態確認と修正
-- 実行日: 2025-02-09
-- ============================================
-- このマイグレーションは以下を確認・修正します:
-- 1. sub_group_idカラムの削除状態確認・削除
-- 2. UNIQUE制約の更新確認・修正
-- 3. RLSポリシーの確認・修正
-- ============================================

-- ============================================
-- Phase 1: sub_group_idカラムの状態確認と削除
-- ============================================
DO $$
BEGIN
  -- sub_group_idカラムの存在確認
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_group_memberships' 
    AND column_name = 'sub_group_id'
  ) THEN
    RAISE NOTICE '⚠️ sub_group_idカラムが存在します。削除を実行します...';
    
    -- 外部キー制約を削除
    ALTER TABLE user_group_memberships 
    DROP CONSTRAINT IF EXISTS user_group_memberships_sub_group_id_fkey;
    
    -- インデックスを削除
    DROP INDEX IF EXISTS idx_user_group_memberships_sub_group_id;
    
    -- カラムを削除
    ALTER TABLE user_group_memberships DROP COLUMN sub_group_id;
    
    RAISE NOTICE '✅ sub_group_idカラムを削除しました';
  ELSE
    RAISE NOTICE '✅ sub_group_idカラムは既に削除されています';
  END IF;
END $$;

-- ============================================
-- Phase 2: UNIQUE制約の確認と修正
-- ============================================
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  -- 既存のUNIQUE制約をすべて確認して削除
  FOR constraint_rec IN
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'user_group_memberships'
      AND c.contype = 'u'
  LOOP
    RAISE NOTICE '⚠️ 既存のUNIQUE制約 % を確認しました。削除します...', constraint_rec.conname;
    EXECUTE format('ALTER TABLE user_group_memberships DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
    RAISE NOTICE '✅ 既存のUNIQUE制約を削除しました: %', constraint_rec.conname;
  END LOOP;
  
  -- 新しいUNIQUE制約を作成（user_id, organization_idのみ）
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_group_memberships_user_org_unique'
  ) THEN
    ALTER TABLE user_group_memberships 
    ADD CONSTRAINT user_group_memberships_user_org_unique 
    UNIQUE (user_id, organization_id);
    RAISE NOTICE '✅ 新しいUNIQUE制約を作成しました: (user_id, organization_id)';
  ELSE
    RAISE NOTICE '✅ UNIQUE制約 (user_id, organization_id) は既に存在します';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ UNIQUE制約の処理中にエラーが発生しました: %', SQLERRM;
    -- エラーが発生しても処理を続行
END $$;

-- ============================================
-- Phase 3: RLSポリシーの確認と修正
-- ============================================
DO $$
BEGIN
  -- 既存のポリシーを削除
  DROP POLICY IF EXISTS "自分のメンバーシップ情報は閲覧可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織の管理者は全メンバーシップを閲覧可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "自分自身のメンバーシップを挿入可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織の管理者はメンバーシップを挿入可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織の管理者はメンバーシップを更新可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織の管理者はメンバーシップを削除可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "自分のメンバーシップを更新可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "自分のメンバーシップを削除可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織作成者は自分自身をadminとして追加可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織の作成者はメンバーシップを管理可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "Users can view their own memberships" ON user_group_memberships;
  
  RAISE NOTICE '✅ 既存のRLSポリシーを削除しました';
END $$;

-- ============================================
-- Phase 4: 新しいRLSポリシーを作成
-- ============================================

-- 1. 自分のメンバーシップ情報は閲覧可能
CREATE POLICY "自分のメンバーシップ情報は閲覧可能" ON user_group_memberships
  FOR SELECT USING (user_id = auth.uid());

-- 2. 自分自身のメンバーシップを挿入可能（組織参加時、memberロールのみ）
CREATE POLICY "自分自身のメンバーシップを挿入可能" ON user_group_memberships
  FOR INSERT 
  WITH CHECK (
    user_id = auth.uid() 
    AND role = 'member'
  );

-- 3. 自分のメンバーシップを更新可能
CREATE POLICY "自分のメンバーシップを更新可能" ON user_group_memberships
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. 自分のメンバーシップを削除可能
CREATE POLICY "自分のメンバーシップを削除可能" ON user_group_memberships
  FOR DELETE USING (user_id = auth.uid());

-- 5. 組織作成者は自分自身をadminとして追加可能
CREATE POLICY "組織作成者は自分自身をadminとして追加可能" ON user_group_memberships
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND role = 'admin'
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = user_group_memberships.organization_id
      AND organizations.created_by = auth.uid()
    )
  );

-- 6. 組織の作成者はメンバーシップを管理可能（ALL: SELECT, INSERT, UPDATE, DELETE）
CREATE POLICY "組織の作成者はメンバーシップを管理可能" ON user_group_memberships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = user_group_memberships.organization_id
      AND organizations.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = user_group_memberships.organization_id
      AND organizations.created_by = auth.uid()
    )
  );

-- ============================================
-- Phase 5: 確認とレポート
-- ============================================
DO $$
DECLARE
  column_exists BOOLEAN;
  constraint_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- sub_group_idカラムの存在確認
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_group_memberships' 
    AND column_name = 'sub_group_id'
  ) INTO column_exists;
  
  -- UNIQUE制約の存在確認
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_group_memberships_user_org_unique'
  ) INTO constraint_exists;
  
  -- RLSポリシーの数を確認
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_group_memberships';
  
  -- レポート
  RAISE NOTICE '========================================';
  RAISE NOTICE 'メンバーシップテーブルの状態確認結果';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'sub_group_idカラム: %', CASE WHEN column_exists THEN '❌ 存在する（削除が必要）' ELSE '✅ 存在しない（正常）' END;
  RAISE NOTICE 'UNIQUE制約 (user_id, organization_id): %', CASE WHEN constraint_exists THEN '✅ 存在する（正常）' ELSE '❌ 存在しない（作成が必要）' END;
  RAISE NOTICE 'RLSポリシー数: %', policy_count;
  RAISE NOTICE '========================================';
  
  IF column_exists THEN
    RAISE WARNING '⚠️ sub_group_idカラムがまだ存在します。手動で削除してください。';
  END IF;
  
  IF NOT constraint_exists THEN
    RAISE WARNING '⚠️ UNIQUE制約が存在しません。手動で作成してください。';
  END IF;
END $$;

-- PostgRESTのスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';
