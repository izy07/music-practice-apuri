-- ============================================
-- コンソールエラー修正マイグレーション
-- ============================================
-- 実行日: 2025-12-03
-- ============================================
-- このマイグレーションは、コンソールに表示されるエラーを修正します：
-- 1. goals.show_on_calendarカラムの追加
-- 2. user_group_membershipsテーブルのRLSポリシー修正
-- ============================================

-- ============================================
-- 1. goalsテーブルにshow_on_calendarカラムを追加
-- ============================================
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar') THEN
      ALTER TABLE goals ADD COLUMN show_on_calendar BOOLEAN DEFAULT false;
      COMMENT ON COLUMN goals.show_on_calendar IS 'カレンダーに表示するかどうか（true: 表示, false: 非表示）';
      
      -- 既存のレコードをfalseに設定
      UPDATE goals SET show_on_calendar = false WHERE show_on_calendar IS NULL;
      
      -- インデックスを作成
      CREATE INDEX IF NOT EXISTS idx_goals_show_on_calendar ON goals(show_on_calendar) WHERE show_on_calendar = true;
      
      RAISE NOTICE '✅ goalsテーブルにshow_on_calendarカラムを追加しました';
    ELSE
      RAISE NOTICE 'ℹ️ goalsテーブルのshow_on_calendarカラムは既に存在します';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ goalsテーブルが存在しません。先にgoalsテーブルを作成してください';
  END IF;
END $$;

-- ============================================
-- 2. user_group_membershipsテーブルのRLSポリシー修正
-- ============================================
-- 組織作成者が自分自身をadminとしてメンバーシップに追加できるようにする

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
    RAISE NOTICE 'ℹ️ ポリシー「組織作成者は自分自身をadminとして追加可能」は既に存在します';
  END IF;
  
  -- 既存の「組織の作成者はメンバーシップを管理可能」ポリシーを確認・更新
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_group_memberships' 
    AND policyname = '組織の作成者はメンバーシップを管理可能'
  ) THEN
    -- ポリシーが存在する場合は、WITH CHECK条件が正しく設定されているか確認
    RAISE NOTICE 'ℹ️ ポリシー「組織の作成者はメンバーシップを管理可能」は既に存在します';
  ELSE
    -- ポリシーが存在しない場合は作成
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
  END IF;
END $$;

-- ============================================
-- 3. 確認メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'コンソールエラー修正マイグレーションが完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. goals.show_on_calendarカラムの追加';
  RAISE NOTICE '2. user_group_membershipsテーブルのRLSポリシー修正';
  RAISE NOTICE '========================================';
END $$;





