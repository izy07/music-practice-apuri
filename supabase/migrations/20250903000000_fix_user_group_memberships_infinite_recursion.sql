-- user_group_membershipsテーブルの無限再帰を修正
-- 問題：ポリシー内で同じテーブルを参照すると無限再帰が発生する

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "組織の管理者は全メンバーシップを閲覧可能" ON user_group_memberships;
DROP POLICY IF EXISTS "管理者のみメンバーシップを作成・更新可能" ON user_group_memberships;

-- セキュリティを強化した関数を作成（SECURITY DEFINERでポリシーをバイパス）
CREATE OR REPLACE FUNCTION is_organization_admin(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_group_memberships
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND role = 'admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新しいポリシーを作成（関数を使用して無限再帰を回避）
CREATE POLICY "組織の管理者は全メンバーシップを閲覧可能" ON user_group_memberships
  FOR SELECT USING (
    user_id = auth.uid() OR is_organization_admin(organization_id)
  );

CREATE POLICY "管理者のみメンバーシップを挿入可能" ON user_group_memberships
  FOR INSERT WITH CHECK (
    is_organization_admin(organization_id) OR (user_id = auth.uid() AND role = 'member')
  );

CREATE POLICY "管理者のみメンバーシップを更新可能" ON user_group_memberships
  FOR UPDATE USING (
    is_organization_admin(organization_id)
  );

CREATE POLICY "管理者のみメンバーシップを削除可能" ON user_group_memberships
  FOR DELETE USING (
    is_organization_admin(organization_id)
  );

