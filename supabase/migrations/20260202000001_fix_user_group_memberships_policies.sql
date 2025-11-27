-- user_group_membershipsテーブルのRLSポリシーを修正
-- check_is_org_admin関数の使用を削除して無限再帰を回避

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "自分のメンバーシップ情報は閲覧可能" ON user_group_memberships;
DROP POLICY IF EXISTS "組織の管理者は全メンバーシップを閲覧可能" ON user_group_memberships;
DROP POLICY IF EXISTS "自分自身のメンバーシップを挿入可能" ON user_group_memberships;
DROP POLICY IF EXISTS "組織の管理者はメンバーシップを挿入可能" ON user_group_memberships;
DROP POLICY IF EXISTS "組織の管理者はメンバーシップを更新可能" ON user_group_memberships;
DROP POLICY IF EXISTS "組織の管理者はメンバーシップを削除可能" ON user_group_memberships;

-- 簡略化されたポリシー（循環参照を回避）
-- 自分のメンバーシップ情報は常に閲覧可能
CREATE POLICY "自分のメンバーシップ情報は閲覧可能" ON user_group_memberships
  FOR SELECT USING (user_id = auth.uid());

-- 自分自身のメンバーシップを挿入可能（組織参加時）
CREATE POLICY "自分自身のメンバーシップを挿入可能" ON user_group_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid() AND role = 'member');

-- 自分のメンバーシップを更新可能
CREATE POLICY "自分のメンバーシップを更新可能" ON user_group_memberships
  FOR UPDATE USING (user_id = auth.uid());

-- 自分のメンバーシップを削除可能
CREATE POLICY "自分のメンバーシップを削除可能" ON user_group_memberships
  FOR DELETE USING (user_id = auth.uid());

-- 組織の作成者は、その組織のメンバーシップを管理可能
-- （organizationsテーブルを直接参照することで循環参照を回避）
CREATE POLICY "組織の作成者はメンバーシップを管理可能" ON user_group_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = user_group_memberships.organization_id
      AND organizations.created_by = auth.uid()
    )
  );

-- PostgRESTのスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';

