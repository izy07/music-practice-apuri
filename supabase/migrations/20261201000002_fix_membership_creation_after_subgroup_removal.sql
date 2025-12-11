-- サブグループ機能削除後のメンバーシップ作成修正
-- 問題: データベーストリガーとRLSポリシーがsub_group_idを参照している
-- 解決策: sub_group_idを削除して、組織レベルでのみメンバーシップを管理

-- ============================================
-- 1. 組織作成時のメンバーシップ自動追加トリガーを更新
-- ============================================

-- 既存のトリガーと関数を削除
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
DROP TRIGGER IF EXISTS after_organization_insert ON organizations;
DROP FUNCTION IF EXISTS auto_add_organization_creator();
DROP FUNCTION IF EXISTS add_creator_as_admin();

-- 組織作成時に自動的に作成者をadminとしてメンバーシップに追加する関数（sub_group_idなし）
CREATE OR REPLACE FUNCTION auto_add_organization_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- 組織作成者をadminとしてメンバーシップに追加
  -- sub_group_idカラムは削除されているため、user_idとorganization_idのみ
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

-- ============================================
-- 2. RLSポリシーの確認と更新
-- ============================================

-- 組織作成者が自分自身をadminとして追加できるポリシーを確認・作成
DO $$
BEGIN
  -- 既存のポリシーを削除（存在する場合）
  DROP POLICY IF EXISTS "組織作成者は自分自身をadminとして追加可能" ON user_group_memberships;
  
  -- 新しいポリシーを作成（sub_group_idを参照しない）
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
    
  RAISE NOTICE '✅ 組織作成者が自分自身をadminとして追加できるポリシーを更新しました';
END $$;

-- 組織の作成者はメンバーシップを管理可能なポリシーを確認・更新
DO $$
BEGIN
  -- 既存のポリシーを削除（存在する場合）
  DROP POLICY IF EXISTS "組織の作成者はメンバーシップを管理可能" ON user_group_memberships;
  
  -- 新しいポリシーを作成（sub_group_idを参照しない）
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
    
  RAISE NOTICE '✅ 「組織の作成者はメンバーシップを管理可能」ポリシーを更新しました';
END $$;

-- ============================================
-- 3. 確認メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ メンバーシップ作成機能の修正が完了しました';
  RAISE NOTICE '   - 組織作成時のトリガーを更新（sub_group_idを削除）';
  RAISE NOTICE '   - RLSポリシーを更新（sub_group_idを参照しない）';
END $$;





