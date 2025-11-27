-- 組織作成時のメンバーシップ自動追加とRLSポリシー修正
-- 問題: 組織作成者が自分自身をadminとしてメンバーシップに追加できない
-- 解決策: データベーストリガーとRLSポリシーの両方を追加

-- ============================================
-- 1. 組織作成時に自動的にメンバーシップを作成するトリガー
-- ============================================

-- 既存のトリガーを削除（存在する場合）
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
DROP FUNCTION IF EXISTS auto_add_organization_creator();

-- 組織作成時に自動的に作成者をadminとしてメンバーシップに追加する関数
CREATE OR REPLACE FUNCTION auto_add_organization_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- 組織作成者をadminとしてメンバーシップに追加
  -- sub_group_idはNULL（組織レベルのメンバーシップ）
  INSERT INTO user_group_memberships (user_id, organization_id, role, sub_group_id)
  VALUES (NEW.created_by, NEW.id, 'admin', NULL)
  ON CONFLICT (user_id, organization_id, sub_group_id) 
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
-- 2. 組織作成者が自分自身をadminとして追加できるRLSポリシー
-- ============================================

-- 既存のポリシーを確認して、必要に応じて追加
-- 組織作成者は自分自身をadminとしてメンバーシップに追加可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'user_group_memberships' 
    AND policyname = '組織作成者は自分自身をadminとして追加可能'
  ) THEN
    CREATE POLICY "組織作成者は自分自身をadminとして追加可能" ON user_group_memberships
      FOR INSERT WITH CHECK (
        user_id = auth.uid() 
        AND role = 'admin'
        AND EXISTS (
          SELECT 1 FROM organizations 
          WHERE id = organization_id 
          AND created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- 3. 既存のポリシーの確認と説明
-- ============================================
-- 以下のポリシーが既に存在することを確認:
-- - "自分自身のメンバーシップを挿入可能" (role = 'member' のみ)
-- - "組織の管理者はメンバーシップを挿入可能" (既存のadminのみ)
-- 
-- 新しいポリシーにより、組織作成直後でも自分自身をadminとして追加できるようになります。
-- トリガーが主な方法として機能し、RLSポリシーはフォールバックとして機能します。

