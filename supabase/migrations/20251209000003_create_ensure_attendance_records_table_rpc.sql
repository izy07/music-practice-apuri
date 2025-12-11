-- ============================================
-- attendance_recordsテーブルを自動的に作成するRPC関数
-- ============================================
-- 目的: アプリ起動時にテーブルが存在しない場合、自動的に作成する
-- 日付: 2025-12-09
-- 注意: この関数はSECURITY DEFINERで実行されるため、管理者権限でテーブルを作成できます
-- ============================================

-- attendance_recordsテーブルを確実に作成するRPC関数
CREATE OR REPLACE FUNCTION ensure_attendance_records_table()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_exists BOOLEAN;
  v_result JSON;
BEGIN
  -- テーブルの存在を確認
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance_records'
  ) INTO v_table_exists;

  -- テーブルが存在しない場合のみ作成
  IF NOT v_table_exists THEN
    -- 1. テーブルの作成
    CREATE TABLE attendance_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      practice_schedule_id UUID,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      attendance_status VARCHAR(20) NOT NULL CHECK (attendance_status IN ('present', 'absent', 'late')),
      registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    -- 2. 外部キー制約の追加（practice_schedulesテーブルが存在する場合のみ）
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'practice_schedules'
    ) THEN
      BEGIN
        ALTER TABLE attendance_records 
        ADD CONSTRAINT attendance_records_practice_schedule_id_fkey 
        FOREIGN KEY (practice_schedule_id) 
        REFERENCES practice_schedules(id) 
        ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN
          NULL; -- 既に存在する場合は無視
        WHEN OTHERS THEN
          NULL; -- エラーは無視（後で追加可能）
      END;
    END IF;

    -- 3. UNIQUE制約の追加
    BEGIN
      ALTER TABLE attendance_records 
      ADD CONSTRAINT attendance_records_practice_schedule_id_user_id_key 
      UNIQUE(practice_schedule_id, user_id);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL; -- 既に存在する場合は無視
      WHEN OTHERS THEN
        NULL; -- エラーは無視
    END;

    -- 4. インデックスの作成
    CREATE INDEX IF NOT EXISTS idx_attendance_records_practice_schedule_id ON attendance_records(practice_schedule_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_records_registered_at ON attendance_records(registered_at);

    -- 5. RLSの有効化
    ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

    -- 6. can_register_attendance関数の作成
    CREATE OR REPLACE FUNCTION can_register_attendance(practice_date DATE)
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN NOW() >= (practice_date - INTERVAL '3 days')::TIMESTAMP 
        AND NOW() <= (practice_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 7. update_updated_at_column関数の作成（存在しない場合のみ）
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- 8. 更新日時の自動更新トリガー
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'update_attendance_records_updated_at'
    ) THEN
      CREATE TRIGGER update_attendance_records_updated_at 
      BEFORE UPDATE ON attendance_records 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- 9. RLSポリシーの作成
    -- 9.1. 自分の出欠席記録は閲覧・更新可能
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'attendance_records' 
      AND policyname = '自分の出欠席記録は閲覧・更新可能'
    ) THEN
      CREATE POLICY "自分の出欠席記録は閲覧・更新可能" ON attendance_records
      FOR ALL USING (user_id = auth.uid());
    END IF;

    -- 9.2. 組織の管理者は全出欠席記録を閲覧可能
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
    END IF;

    -- 9.3. 期間内のみ出欠席を登録・更新可能
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
    END IF;

    -- 9.4. 期間内のみ出欠席を更新可能
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
    END IF;

    v_result := json_build_object(
      'success', true,
      'message', 'attendance_recordsテーブルを作成しました',
      'created', true
    );
  ELSE
    v_result := json_build_object(
      'success', true,
      'message', 'attendance_recordsテーブルは既に存在します',
      'created', false
    );
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生した場合も、テーブルが存在する可能性があるため、成功として返す
    RETURN json_build_object(
      'success', false,
      'message', 'エラーが発生しました: ' || SQLERRM,
      'created', false,
      'error', SQLERRM
    );
END;
$$;

-- 関数にコメントを追加
COMMENT ON FUNCTION ensure_attendance_records_table IS 'attendance_recordsテーブルが存在しない場合、自動的に作成する関数。アプリ起動時に呼び出される。';

-- 認証ユーザーがこの関数を実行できるように権限を付与
GRANT EXECUTE ON FUNCTION ensure_attendance_records_table() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_attendance_records_table() TO anon;


