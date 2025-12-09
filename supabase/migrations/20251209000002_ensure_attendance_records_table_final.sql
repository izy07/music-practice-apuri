-- ============================================
-- attendance_recordsテーブルの確実な作成（最終版）
-- ============================================
-- 目的: attendance_recordsテーブルが存在しない場合の404エラーを根本的に解決
-- 日付: 2025-12-09
-- 注意: このマイグレーションは既存のテーブル定義と完全に一致するように作成されています
-- ============================================

-- 1. attendance_recordsテーブルの作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance_records'
  ) THEN
    -- テーブルを作成（外部キー制約なしで作成）
    CREATE TABLE attendance_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_schedule_id UUID,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      attendance_status VARCHAR(20) NOT NULL CHECK (attendance_status IN ('present', 'absent', 'late')),
      registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    
    RAISE NOTICE '✅ attendance_recordsテーブルを作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ attendance_recordsテーブルは既に存在します';
  END IF;
END $$;

-- 2. 外部キー制約の追加（practice_schedulesテーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_schedules'
  ) THEN
    -- 既存の外部キー制約を削除（存在する場合）
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public'
      AND constraint_name = 'attendance_records_practice_schedule_id_fkey'
    ) THEN
      ALTER TABLE attendance_records DROP CONSTRAINT attendance_records_practice_schedule_id_fkey;
    END IF;
    
    -- 外部キー制約を追加
    BEGIN
      ALTER TABLE attendance_records 
      ADD CONSTRAINT attendance_records_practice_schedule_id_fkey 
      FOREIGN KEY (practice_schedule_id) 
      REFERENCES practice_schedules(id) 
      ON DELETE CASCADE;
      
      RAISE NOTICE '✅ attendance_recordsテーブルに外部キー制約を追加しました';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️ 外部キー制約は既に存在します';
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ 外部キー制約の追加中にエラーが発生しました: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'ℹ️ practice_schedulesテーブルが存在しないため、外部キー制約をスキップします';
  END IF;
END $$;

-- 3. UNIQUE制約の追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public'
    AND constraint_name = 'attendance_records_practice_schedule_id_user_id_key'
  ) THEN
    BEGIN
      ALTER TABLE attendance_records 
      ADD CONSTRAINT attendance_records_practice_schedule_id_user_id_key 
      UNIQUE(practice_schedule_id, user_id);
      
      RAISE NOTICE '✅ UNIQUE制約を追加しました';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ️ UNIQUE制約は既に存在します';
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ UNIQUE制約の追加中にエラーが発生しました: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'ℹ️ UNIQUE制約は既に存在します';
  END IF;
END $$;

-- 4. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_attendance_records_practice_schedule_id ON attendance_records(practice_schedule_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_registered_at ON attendance_records(registered_at);

-- 5. RLSの有効化
DO $$
BEGIN
  ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE '✅ RLSを有効化しました';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ RLSは既に有効です';
END $$;

-- 6. can_register_attendance関数の作成
CREATE OR REPLACE FUNCTION can_register_attendance(practice_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOW() >= (practice_date - INTERVAL '3 days')::TIMESTAMP 
    AND NOW() <= (practice_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. update_updated_at_column関数の作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. 更新日時の自動更新トリガー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_attendance_records_updated_at'
  ) THEN
    CREATE TRIGGER update_attendance_records_updated_at 
    BEFORE UPDATE ON attendance_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE '✅ 更新日時トリガーを作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ 更新日時トリガーは既に存在します';
  END IF;
END $$;

-- 9. RLSポリシーの作成
-- 9.1. 自分の出欠席記録は閲覧・更新可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'attendance_records' 
    AND policyname = '自分の出欠席記録は閲覧・更新可能'
  ) THEN
    CREATE POLICY "自分の出欠席記録は閲覧・更新可能" ON attendance_records
    FOR ALL USING (user_id = auth.uid());
    
    RAISE NOTICE '✅ RLSポリシー「自分の出欠席記録は閲覧・更新可能」を作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ RLSポリシー「自分の出欠席記録は閲覧・更新可能」は既に存在します';
  END IF;
END $$;

-- 9.2. 組織の管理者は全出欠席記録を閲覧可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'attendance_records' 
    AND policyname = '組織の管理者は全出欠席記録を閲覧可能'
  ) THEN
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
    
    RAISE NOTICE '✅ RLSポリシー「組織の管理者は全出欠席記録を閲覧可能」を作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ RLSポリシー「組織の管理者は全出欠席記録を閲覧可能」は既に存在します';
  END IF;
END $$;

-- 9.3. 期間内のみ出欠席を登録・更新可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'attendance_records' 
    AND policyname = '期間内のみ出欠席を登録・更新可能'
  ) THEN
    CREATE POLICY "期間内のみ出欠席を登録・更新可能" ON attendance_records
    FOR INSERT WITH CHECK (
      user_id = auth.uid() AND
      can_register_attendance(
        (SELECT practice_date FROM practice_schedules WHERE id = practice_schedule_id)
      )
    );
    
    RAISE NOTICE '✅ RLSポリシー「期間内のみ出欠席を登録・更新可能」を作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ RLSポリシー「期間内のみ出欠席を登録・更新可能」は既に存在します';
  END IF;
END $$;

-- 9.4. 期間内のみ出欠席を更新可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'attendance_records' 
    AND policyname = '期間内のみ出欠席を更新可能'
  ) THEN
    CREATE POLICY "期間内のみ出欠席を更新可能" ON attendance_records
    FOR UPDATE USING (
      user_id = auth.uid() AND
      can_register_attendance(
        (SELECT practice_date FROM practice_schedules WHERE id = practice_schedule_id)
      )
    );
    
    RAISE NOTICE '✅ RLSポリシー「期間内のみ出欠席を更新可能」を作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ RLSポリシー「期間内のみ出欠席を更新可能」は既に存在します';
  END IF;
END $$;

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ attendance_recordsテーブルの作成が完了しました';
  RAISE NOTICE '========================================';
END $$;

