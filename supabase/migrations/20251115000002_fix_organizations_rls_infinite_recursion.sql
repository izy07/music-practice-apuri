-- organizationsテーブルの無限再帰を修正
-- 問題：SELECTポリシーがuser_group_membershipsを直接参照すると無限再帰が発生する

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "組織のメンバーは組織情報を閲覧可能" ON organizations;
DROP POLICY IF EXISTS "管理者のみ組織を更新可能" ON organizations;

-- セキュリティを強化した関数を作成（SECURITY DEFINER + RLS無効化でポリシーを完全にバイパス）
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_member BOOLEAN;
BEGIN
  -- RLSを無効化して、ポリシーをバイパス
  SET LOCAL row_security = off;
  
  SELECT EXISTS (
    SELECT 1 FROM user_group_memberships
    WHERE user_id = auth.uid()
    AND organization_id = org_id
  ) INTO is_member;
  
  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- セキュリティを強化した関数を作成（管理者チェック用）
CREATE OR REPLACE FUNCTION is_organization_admin_for_update(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- RLSを無効化して、ポリシーをバイパス
  SET LOCAL row_security = off;
  
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
CREATE POLICY "組織のメンバーは組織情報を閲覧可能" ON organizations
  FOR SELECT USING (
    auth.uid() = created_by OR is_organization_member(id)
  );

CREATE POLICY "管理者のみ組織を更新可能" ON organizations
  FOR UPDATE USING (
    auth.uid() = created_by OR is_organization_admin_for_update(id)
  );

