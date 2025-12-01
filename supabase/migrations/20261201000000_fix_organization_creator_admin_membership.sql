-- 組織作成者が自分自身をadminとしてメンバーシップに追加できるようにする
-- 問題: 組織作成時にadminロールでメンバーシップを作成しようとすると403エラーが発生
-- 原因: 
--   1. 「自分自身のメンバーシップを挿入可能」ポリシーがrole='member'のみを許可している
--   2. 「組織の作成者はメンバーシップを管理可能」ポリシーがFOR ALL USINGのみで、INSERT時のWITH CHECK条件が不足している
-- 解決策: 
--   1. 組織作成者が自分自身をadminとして追加できる専用のポリシーを追加
--   2. 既存の「組織の作成者はメンバーシップを管理可能」ポリシーにWITH CHECK条件を追加

-- 既存のポリシーを確認して、必要に応じて追加
DO $$
BEGIN
  -- 組織作成者が自分自身をadminとしてメンバーシップに追加できるポリシー
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_group_memberships' 
    AND policyname = '組織作成者は自分自身をadminとして追加可能'
  ) THEN
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
  ELSE
    RAISE NOTICE '⚠️ ポリシー「組織作成者は自分自身をadminとして追加可能」は既に存在します';
  END IF;
  
  -- 既存の「組織の作成者はメンバーシップを管理可能」ポリシーを削除して再作成（WITH CHECK条件を追加）
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_group_memberships' 
    AND policyname = '組織の作成者はメンバーシップを管理可能'
  ) THEN
    DROP POLICY "組織の作成者はメンバーシップを管理可能" ON user_group_memberships;
    
    -- WITH CHECK条件を含めて再作成
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
    
    RAISE NOTICE '✅ 「組織の作成者はメンバーシップを管理可能」ポリシーにWITH CHECK条件を追加しました';
  END IF;
END $$;

