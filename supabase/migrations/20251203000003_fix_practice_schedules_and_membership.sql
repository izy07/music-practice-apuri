-- ============================================
-- practice_schedulesテーブルとメンバーシップ作成の修正
-- ============================================
-- 実行日: 2025-12-03
-- ============================================
-- このマイグレーションは、以下の問題を修正します：
-- 1. practice_schedulesテーブルが存在しない（404エラー）
-- 2. user_group_membershipsへのINSERTが403エラー（RLSポリシー違反）
-- ============================================

-- ============================================
-- 1. practice_schedulesテーブルの作成（sub_group_idを削除）
-- ============================================
DO $$
BEGIN
  -- practice_schedulesテーブルが存在しない場合は作成
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_schedules'
  ) THEN
    CREATE TABLE practice_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      practice_date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      practice_type VARCHAR(50) NOT NULL, -- 'ensemble', 'part_practice', 'event'
      location VARCHAR(200),
      created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- インデックスの作成
    CREATE INDEX IF NOT EXISTS idx_practice_schedules_organization_id ON practice_schedules(organization_id);
    CREATE INDEX IF NOT EXISTS idx_practice_schedules_practice_date ON practice_schedules(practice_date);
    CREATE INDEX IF NOT EXISTS idx_practice_schedules_org_date ON practice_schedules(organization_id, practice_date);
    
    -- RLSを有効化
    ALTER TABLE practice_schedules ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ practice_schedulesテーブルを作成しました';
  ELSE
    -- テーブルが存在する場合、target_sub_group_idカラムを削除（存在する場合）
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'practice_schedules' 
      AND column_name = 'target_sub_group_id'
    ) THEN
      -- 外部キー制約を削除
      ALTER TABLE practice_schedules 
      DROP CONSTRAINT IF EXISTS practice_schedules_target_sub_group_id_fkey;
      
      -- カラムを削除
      ALTER TABLE practice_schedules 
      DROP COLUMN target_sub_group_id;
      
      RAISE NOTICE '✅ practice_schedulesテーブルからtarget_sub_group_idカラムを削除しました';
    END IF;
  END IF;
END $$;

-- ============================================
-- 2. practice_schedulesテーブルのRLSポリシー
-- ============================================
DO $$
BEGIN
  -- 既存のポリシーを削除
  DROP POLICY IF EXISTS "組織のメンバーは練習日程を閲覧可能" ON practice_schedules;
  DROP POLICY IF EXISTS "組織の管理者は練習日程を管理可能" ON practice_schedules;
  DROP POLICY IF EXISTS "組織の作成者は練習日程を管理可能" ON practice_schedules;
  
  -- 組織のメンバーは練習日程を閲覧可能
  CREATE POLICY "組織のメンバーは練習日程を閲覧可能" ON practice_schedules
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM user_group_memberships
        WHERE user_group_memberships.organization_id = practice_schedules.organization_id
        AND user_group_memberships.user_id = auth.uid()
      )
    );
  
  -- 組織の作成者は練習日程を管理可能
  CREATE POLICY "組織の作成者は練習日程を管理可能" ON practice_schedules
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM organizations
        WHERE organizations.id = practice_schedules.organization_id
        AND organizations.created_by = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM organizations
        WHERE organizations.id = practice_schedules.organization_id
        AND organizations.created_by = auth.uid()
      )
    );
  
  RAISE NOTICE '✅ practice_schedulesテーブルのRLSポリシーを作成しました';
END $$;

-- ============================================
-- 3. user_group_membershipsテーブルのRLSポリシー修正（再確認）
-- ============================================
DO $$
BEGIN
  -- 既存の競合するポリシーを削除
  DROP POLICY IF EXISTS "自分自身のメンバーシップを挿入可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織作成者は自分自身をadminとして追加可能" ON user_group_memberships;
  DROP POLICY IF EXISTS "組織の作成者はメンバーシップを管理可能" ON user_group_memberships;
  
  -- 組織作成者が自分自身をadminとして追加できるポリシー
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
  
  -- 組織の作成者はメンバーシップを管理可能なポリシー
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
  
  -- 自分自身のメンバーシップを挿入可能なポリシー（memberロール用）
  CREATE POLICY "自分自身のメンバーシップを挿入可能" ON user_group_memberships
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid() 
      AND role = 'member'
    );
  
  RAISE NOTICE '✅ user_group_membershipsテーブルのRLSポリシーを再作成しました';
END $$;

-- ============================================
-- 4. 組織作成時のトリガー関数を確認・更新
-- ============================================
DO $$
BEGIN
  -- 既存のトリガー関数を削除
  DROP TRIGGER IF EXISTS on_organization_created ON organizations;
  DROP FUNCTION IF EXISTS auto_add_organization_creator();
  
  -- 組織作成時に自動的に作成者をadminとしてメンバーシップに追加する関数
  -- SECURITY DEFINERでRLSをバイパス
  CREATE OR REPLACE FUNCTION auto_add_organization_creator()
  RETURNS TRIGGER AS $$
  BEGIN
    -- 組織作成者をadminとしてメンバーシップに追加
    -- SECURITY DEFINERなので、RLSポリシーをバイパスできる
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
  
  RAISE NOTICE '✅ 組織作成時のトリガーを更新しました';
END $$;

-- ============================================
-- 5. 確認メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'practice_schedulesとメンバーシップ作成の修正が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. practice_schedulesテーブルの作成/修正';
  RAISE NOTICE '2. practice_schedulesテーブルのRLSポリシー作成';
  RAISE NOTICE '3. user_group_membershipsテーブルのRLSポリシー再作成';
  RAISE NOTICE '4. 組織作成時のトリガー更新（SECURITY DEFINER）';
  RAISE NOTICE '========================================';
END $$;




