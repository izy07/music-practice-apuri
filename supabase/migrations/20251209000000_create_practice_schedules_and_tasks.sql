-- ============================================
-- practice_schedules、tasks、attendance_recordsテーブルの作成
-- ============================================
-- 実行日: 2025-12-09
-- ============================================
-- このマイグレーションは、以下の問題を修正します：
-- 1. practice_schedulesテーブルが存在しない（404エラー）
-- 2. tasksテーブルが存在しない（課題作成時の404エラー）
-- 3. attendance_recordsテーブルが存在しない（出欠登録時の404エラー）
-- ============================================

-- ============================================
-- 1. practice_schedulesテーブルの作成
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
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      practice_date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      practice_type VARCHAR(50) NOT NULL CHECK (practice_type IN ('ensemble', 'part_practice', 'individual_practice', 'rehearsal', 'lesson', 'event')),
      location VARCHAR(200),
      created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- インデックスの作成
    CREATE INDEX IF NOT EXISTS idx_practice_schedules_organization_id ON practice_schedules(organization_id);
    CREATE INDEX IF NOT EXISTS idx_practice_schedules_practice_date ON practice_schedules(practice_date);
    CREATE INDEX IF NOT EXISTS idx_practice_schedules_org_date ON practice_schedules(organization_id, practice_date);
    CREATE INDEX IF NOT EXISTS idx_practice_schedules_created_by ON practice_schedules(created_by);
    
    -- RLSを有効化
    ALTER TABLE practice_schedules ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ practice_schedulesテーブルを作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ practice_schedulesテーブルは既に存在します';
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
  
  -- 組織の管理者は練習日程を管理可能
  CREATE POLICY "組織の管理者は練習日程を管理可能" ON practice_schedules
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM user_group_memberships
        WHERE user_group_memberships.organization_id = practice_schedules.organization_id
        AND user_group_memberships.user_id = auth.uid()
        AND user_group_memberships.role IN ('admin', 'leader')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_group_memberships
        WHERE user_group_memberships.organization_id = practice_schedules.organization_id
        AND user_group_memberships.user_id = auth.uid()
        AND user_group_memberships.role IN ('admin', 'leader')
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
-- 3. attendance_recordsテーブルの作成
-- ============================================
DO $$
BEGIN
  -- attendance_recordsテーブルが存在しない場合は作成
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance_records'
  ) THEN
    CREATE TABLE attendance_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_schedule_id UUID,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      attendance_status VARCHAR(20) NOT NULL CHECK (attendance_status IN ('present', 'absent', 'late')),
      registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    
    -- 外部キー制約の追加（practice_schedulesテーブルが存在する場合のみ）
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'practice_schedules'
    ) THEN
      ALTER TABLE attendance_records 
      ADD CONSTRAINT attendance_records_practice_schedule_id_fkey 
      FOREIGN KEY (practice_schedule_id) 
      REFERENCES practice_schedules(id) 
      ON DELETE CASCADE;
    END IF;
    
    -- UNIQUE制約の追加
    ALTER TABLE attendance_records 
    ADD CONSTRAINT attendance_records_practice_schedule_id_user_id_key 
    UNIQUE(practice_schedule_id, user_id);
    
    -- インデックスの作成
    CREATE INDEX IF NOT EXISTS idx_attendance_records_practice_schedule_id ON attendance_records(practice_schedule_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_records_registered_at ON attendance_records(registered_at);
    
    -- RLSを有効化
    ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ attendance_recordsテーブルを作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ attendance_recordsテーブルは既に存在します';
  END IF;
END $$;

-- ============================================
-- 4. attendance_recordsテーブルのRLSポリシー
-- ============================================
DO $$
BEGIN
  -- can_register_attendance関数の作成
  CREATE OR REPLACE FUNCTION can_register_attendance(practice_date DATE)
  RETURNS BOOLEAN AS $function$
  BEGIN
    RETURN NOW() >= (practice_date - INTERVAL '3 days')::TIMESTAMP 
      AND NOW() <= (practice_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP;
  END;
  $function$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- 既存のポリシーを削除
  DROP POLICY IF EXISTS "自分の出欠席記録は閲覧・更新可能" ON attendance_records;
  DROP POLICY IF EXISTS "組織の管理者は全出欠席記録を閲覧可能" ON attendance_records;
  DROP POLICY IF EXISTS "期間内のみ出欠席を登録・更新可能" ON attendance_records;
  DROP POLICY IF EXISTS "期間内のみ出欠席を更新可能" ON attendance_records;
  
  -- 自分の出欠席記録は閲覧・更新可能
  CREATE POLICY "自分の出欠席記録は閲覧・更新可能" ON attendance_records
    FOR ALL USING (user_id = auth.uid());
  
  -- 組織の管理者は全出欠席記録を閲覧可能
  CREATE POLICY "組織の管理者は全出欠席記録を閲覧可能" ON attendance_records
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM practice_schedules ps
        JOIN user_group_memberships ugm ON ugm.organization_id = ps.organization_id
        WHERE ps.id = attendance_records.practice_schedule_id
        AND ugm.user_id = auth.uid() 
        AND ugm.role = 'admin'
      )
    );
  
  -- 期間内のみ出欠席を登録・更新可能
  CREATE POLICY "期間内のみ出欠席を登録・更新可能" ON attendance_records
    FOR INSERT WITH CHECK (
      user_id = auth.uid() AND
      can_register_attendance(
        (SELECT practice_date FROM practice_schedules WHERE id = practice_schedule_id)
      )
    );
  
  -- 期間内のみ出欠席を更新可能
  CREATE POLICY "期間内のみ出欠席を更新可能" ON attendance_records
    FOR UPDATE USING (
      user_id = auth.uid() AND
      can_register_attendance(
        (SELECT practice_date FROM practice_schedules WHERE id = practice_schedule_id)
      )
    );
  
  RAISE NOTICE '✅ attendance_recordsテーブルのRLSポリシーを作成しました';
END $$;

-- ============================================
-- 5. tasksテーブルの作成
-- ============================================
DO $$
BEGIN
  -- tasksテーブルが存在しない場合は作成
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks'
  ) THEN
    CREATE TABLE tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
      priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      due_date DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- インデックスの作成
    CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(organization_id, status);
    
    -- RLSを有効化
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ tasksテーブルを作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ tasksテーブルは既に存在します';
  END IF;
END $$;

-- ============================================
-- 4. tasksテーブルのRLSポリシー
-- ============================================
DO $$
BEGIN
  -- 既存のポリシーを削除
  DROP POLICY IF EXISTS "組織のメンバーはタスクを閲覧可能" ON tasks;
  DROP POLICY IF EXISTS "組織の管理者はタスクを管理可能" ON tasks;
  DROP POLICY IF EXISTS "組織の作成者はタスクを管理可能" ON tasks;
  DROP POLICY IF EXISTS "担当者は自分のタスクを更新可能" ON tasks;
  
  -- 組織のメンバーはタスクを閲覧可能
  CREATE POLICY "組織のメンバーはタスクを閲覧可能" ON tasks
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM user_group_memberships
        WHERE user_group_memberships.organization_id = tasks.organization_id
        AND user_group_memberships.user_id = auth.uid()
      )
    );
  
  -- 組織の管理者はタスクを管理可能
  CREATE POLICY "組織の管理者はタスクを管理可能" ON tasks
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM user_group_memberships
        WHERE user_group_memberships.organization_id = tasks.organization_id
        AND user_group_memberships.user_id = auth.uid()
        AND user_group_memberships.role IN ('admin', 'leader')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_group_memberships
        WHERE user_group_memberships.organization_id = tasks.organization_id
        AND user_group_memberships.user_id = auth.uid()
        AND user_group_memberships.role IN ('admin', 'leader')
      )
    );
  
  -- 組織の作成者はタスクを管理可能
  CREATE POLICY "組織の作成者はタスクを管理可能" ON tasks
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM organizations
        WHERE organizations.id = tasks.organization_id
        AND organizations.created_by = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM organizations
        WHERE organizations.id = tasks.organization_id
        AND organizations.created_by = auth.uid()
      )
    );
  
  -- 担当者は自分のタスクを更新可能
  CREATE POLICY "担当者は自分のタスクを更新可能" ON tasks
    FOR UPDATE
    USING (
      assigned_to = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_group_memberships
        WHERE user_group_memberships.organization_id = tasks.organization_id
        AND user_group_memberships.user_id = auth.uid()
      )
    )
    WITH CHECK (
      assigned_to = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_group_memberships
        WHERE user_group_memberships.organization_id = tasks.organization_id
        AND user_group_memberships.user_id = auth.uid()
      )
    );
  
  RAISE NOTICE '✅ tasksテーブルのRLSポリシーを作成しました';
END $$;

-- ============================================
-- 6. 更新日時の自動更新トリガー
-- ============================================
DO $$
BEGIN
  -- 既存の関数が存在しない場合は作成
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;
    
    RAISE NOTICE '✅ update_updated_at_column関数を作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ update_updated_at_column関数は既に存在します';
  END IF;
  
  -- practice_schedulesテーブルのトリガー
  DROP TRIGGER IF EXISTS update_practice_schedules_updated_at ON practice_schedules;
  CREATE TRIGGER update_practice_schedules_updated_at
    BEFORE UPDATE ON practice_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  
  -- tasksテーブルのトリガー
  DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
  CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  
  -- attendance_recordsテーブルのトリガー
  DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
  CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  
  RAISE NOTICE '✅ 更新日時トリガーを作成しました';
END $$;

-- ============================================
-- 7. 確認メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'practice_schedules、tasks、attendance_recordsテーブルの作成が完了しました';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. practice_schedulesテーブルの作成';
  RAISE NOTICE '2. practice_schedulesテーブルのRLSポリシー作成';
  RAISE NOTICE '3. attendance_recordsテーブルの作成';
  RAISE NOTICE '4. attendance_recordsテーブルのRLSポリシー作成';
  RAISE NOTICE '5. tasksテーブルの作成';
  RAISE NOTICE '6. tasksテーブルのRLSポリシー作成';
  RAISE NOTICE '7. 更新日時トリガーの設定';
  RAISE NOTICE '========================================';
END $$;

