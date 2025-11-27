-- 組織作成時のRLSポリシーを修正
-- 問題: 組織作成時に循環的な依存関係が発生している
-- 解決策: 認証されたユーザーは誰でも組織を作成できるようにする

-- 既存の組織作成ポリシーを削除
DROP POLICY IF EXISTS "管理者のみ組織を作成可能" ON organizations;
DROP POLICY IF EXISTS "認証されたユーザーは組織を作成可能" ON organizations;

-- 新しい組織作成ポリシーを作成
-- 認証されたユーザーは誰でも組織を作成可能
CREATE POLICY "認証されたユーザーは組織を作成可能" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- 組織作成後のトリガーは既に存在するので、そのまま使用
-- add_creator_as_admin() 関数と after_organization_insert トリガーが
-- 組織作成後に作成者を自動的に管理者として追加する

-- 組織の閲覧ポリシーも修正（メンバーでなくても作成者は閲覧可能）
DROP POLICY IF EXISTS "組織のメンバーは組織情報を閲覧可能" ON organizations;

CREATE POLICY "組織のメンバーは組織情報を閲覧可能" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() AND organization_id = organizations.id
    ) OR
    auth.uid() = created_by  -- 作成者は常に閲覧可能
  );
