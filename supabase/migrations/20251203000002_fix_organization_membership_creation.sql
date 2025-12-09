-- ============================================
-- 組織作成時のメンバーシップ作成を確実に修正
-- ============================================
-- 実行日: 2025-12-03
-- ============================================
-- このマイグレーションは、組織作成時にメンバーシップが作成できない問題を修正します
-- ============================================

-- ============================================
-- 1. 既存の競合するポリシーを削除
-- ============================================
DO $$
BEGIN
  -- 競合する可能性のあるポリシーを削除
  DROP POLICY IF EXISTS "自分自身のメンバーシップを挿入可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織作成者は自分自身をadminとして追加可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織の作成者はメンバーシップを管理可能" ON user_group_memberships;
  
  RAISE NOTICE '✅ 既存の競合するポリシーを削除しました';
END $$;

-- ============================================
-- 2. 組織作成者が自分自身をadminとして追加できるポリシーを作成
-- ============================================
DO $$
BEGIN
  -- 組織作成者が自分自身をadminとしてメンバーシップに追加できるポリシー
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
  
  RAISE NOTICE '✅ 組織作成者が自分自身をadminとして追加できるポリシーを作成しました';
END $$;

-- ============================================
-- 3. 組織の作成者はメンバーシップを管理可能なポリシーを作成
-- ============================================
DO $$
BEGIN
  -- 組織の作成者は、その組織のメンバーシップを管理可能
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
  
  RAISE NOTICE '✅ 「組織の作成者はメンバーシップを管理可能」ポリシーを作成しました';
END $$;

-- ============================================
-- 4. 自分自身のメンバーシップを挿入可能なポリシーを作成（memberロール用）
-- ============================================
DO $$
BEGIN
  -- 自分自身のメンバーシップを挿入可能（組織参加時、memberロール）
  CREATE POLICY "自分自身のメンバーシップを挿入可能" ON user_group_memberships
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid() 
      AND role = 'member'
    );
  
  RAISE NOTICE '✅ 「自分自身のメンバーシップを挿入可能」ポリシーを作成しました';
END $$;

-- ============================================
-- 5. 組織作成時のトリガー関数を確認・更新
-- ============================================
DO $$
BEGIN
  -- 既存のトリガー関数を削除
  DROP TRIGGER IF EXISTS on_organization_created ON organizations;
  DROP FUNCTION IF EXISTS auto_add_organization_creator();
  
  -- 組織作成時に自動的に作成者をadminとしてメンバーシップに追加する関数
  -- SECURITY DEFINERでRLSをバイパス
  CREATE OR REPLACE FUNCTION auto_add_organization_creator()
  RETURNS TRIGGER AS $$
  BEGIN
    -- 組織作成者をadminとしてメンバーシップに追加
    -- SECURITY DEFINERなので、RLSポリシーをバイパスできる
    INSERT INTO user_group_memberships (user_id, organization_id, role)
    VALUES (NEW.created_by, NEW.id, 'admin')
    ON CONFLICT (user_id, organization_id) 
    DO UPDATE SET role = 'admin';
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- トリガーを作成
  CREATE TRIGGER on_organization_created
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_organization_creator();
  
  RAISE NOTICE '✅ 組織作成時のトリガーを更新しました';
END $$;

-- ============================================
-- 6. 確認メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '組織作成時のメンバーシップ作成修正が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. 競合するポリシーを削除';
  RAISE NOTICE '2. 組織作成者が自分自身をadminとして追加できるポリシーを作成';
  RAISE NOTICE '3. 組織の作成者はメンバーシップを管理可能なポリシーを作成';
  RAISE NOTICE '4. 自分自身のメンバーシップを挿入可能なポリシーを作成（memberロール用）';
  RAISE NOTICE '5. 組織作成時のトリガーを更新（SECURITY DEFINER）';
  RAISE NOTICE '========================================';
END $$;




