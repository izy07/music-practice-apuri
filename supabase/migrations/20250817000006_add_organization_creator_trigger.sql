-- 組織作成時に作成者を自動的に管理者として追加するトリガー

CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- 作成者を管理者として user_group_memberships に追加
  INSERT INTO user_group_memberships (user_id, organization_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成（既存の場合は削除してから作成）
DROP TRIGGER IF EXISTS after_organization_insert ON organizations;
CREATE TRIGGER after_organization_insert
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_admin();

