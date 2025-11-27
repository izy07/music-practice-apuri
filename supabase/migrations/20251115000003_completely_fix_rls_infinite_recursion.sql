-- 無限再帰エラーを根本的に修正するマイグレーション
-- すべての既存のポリシーを削除し、循環参照のない新しいポリシーを作成

-- ============================================
-- 1. すべての既存のポリシーと関数を削除
-- ============================================

-- user_group_membershipsテーブルのポリシーを削除
DROP POLICY IF EXISTS "自分のメンバーシップ情報は閲覧可能" ON user_group_memberships;
DROP POLICY IF EXISTS "組織の管理者は全メンバーシップを閲覧可能" ON user_group_memberships;
DROP POLICY IF EXISTS "管理者のみメンバーシップを作成・更新可能" ON user_group_memberships;
DROP POLICY IF EXISTS "管理者のみメンバーシップを挿入可能" ON user_group_memberships;
DROP POLICY IF EXISTS "管理者のみメンバーシップを更新可能" ON user_group_memberships;
DROP POLICY IF EXISTS "管理者のみメンバーシップを削除可能" ON user_group_memberships;

-- organizationsテーブルのポリシーを削除
DROP POLICY IF EXISTS "組織のメンバーは組織情報を閲覧可能" ON organizations;
DROP POLICY IF EXISTS "管理者のみ組織を作成可能" ON organizations;
DROP POLICY IF EXISTS "認証されたユーザーは組織を作成可能" ON organizations;
DROP POLICY IF EXISTS "管理者のみ組織を更新可能" ON organizations;

-- 既存の関数を削除
DROP FUNCTION IF EXISTS is_organization_admin(UUID);
DROP FUNCTION IF EXISTS is_organization_member(UUID);
DROP FUNCTION IF EXISTS is_organization_admin_for_update(UUID);

-- ============================================
-- 2. 新しいセキュリティ関数を作成（RLSを完全にバイパス）
-- ============================================

-- 管理者チェック関数（RLSを完全にバイパス）
CREATE OR REPLACE FUNCTION check_is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- RLSを無効化して、ポリシーを完全にバイパス
  SET LOCAL row_security = off;
  
  SELECT EXISTS (
    SELECT 1 FROM user_group_memberships
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND role = 'admin'
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- メンバーチェック関数（RLSを完全にバイパス）
CREATE OR REPLACE FUNCTION check_is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_member BOOLEAN;
BEGIN
  -- RLSを無効化して、ポリシーを完全にバイパス
  SET LOCAL row_security = off;
  
  SELECT EXISTS (
    SELECT 1 FROM user_group_memberships
    WHERE user_id = auth.uid()
    AND organization_id = org_id
  ) INTO is_member;
  
  RETURN COALESCE(is_member, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 3. user_group_membershipsテーブルの新しいポリシー
-- ============================================

-- 自分のメンバーシップ情報は常に閲覧可能
CREATE POLICY "自分のメンバーシップ情報は閲覧可能" ON user_group_memberships
  FOR SELECT USING (user_id = auth.uid());

-- 組織の管理者は全メンバーシップを閲覧可能（関数を使用して循環参照を回避）
CREATE POLICY "組織の管理者は全メンバーシップを閲覧可能" ON user_group_memberships
  FOR SELECT USING (check_is_org_admin(organization_id));

-- 自分自身のメンバーシップを挿入可能（組織参加時）
CREATE POLICY "自分自身のメンバーシップを挿入可能" ON user_group_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid() AND role = 'member');

-- 組織の管理者はメンバーシップを挿入可能
CREATE POLICY "組織の管理者はメンバーシップを挿入可能" ON user_group_memberships
  FOR INSERT WITH CHECK (check_is_org_admin(organization_id));

-- 組織の管理者はメンバーシップを更新可能
CREATE POLICY "組織の管理者はメンバーシップを更新可能" ON user_group_memberships
  FOR UPDATE USING (check_is_org_admin(organization_id));

-- 組織の管理者はメンバーシップを削除可能
CREATE POLICY "組織の管理者はメンバーシップを削除可能" ON user_group_memberships
  FOR DELETE USING (check_is_org_admin(organization_id));

-- ============================================
-- 4. organizationsテーブルの新しいポリシー
-- ============================================

-- 組織の作成者は常に閲覧可能
CREATE POLICY "組織の作成者は閲覧可能" ON organizations
  FOR SELECT USING (auth.uid() = created_by);

-- 組織のメンバーは組織情報を閲覧可能（関数を使用して循環参照を回避）
CREATE POLICY "組織のメンバーは組織情報を閲覧可能" ON organizations
  FOR SELECT USING (check_is_org_member(id));

-- 認証されたユーザーは組織を作成可能
CREATE POLICY "認証されたユーザーは組織を作成可能" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- 組織の作成者は組織を更新可能
CREATE POLICY "組織の作成者は組織を更新可能" ON organizations
  FOR UPDATE USING (auth.uid() = created_by);

-- 組織の管理者は組織を更新可能（関数を使用して循環参照を回避）
CREATE POLICY "組織の管理者は組織を更新可能" ON organizations
  FOR UPDATE USING (check_is_org_admin(id));

