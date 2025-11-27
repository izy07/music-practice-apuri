-- RLS（Row Level Security）ポリシーの設定

-- 全テーブルでRLSを有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;

-- 組織（organizations）のポリシー
CREATE POLICY "組織のメンバーは組織情報を閲覧可能" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() AND organization_id = organizations.id
    )
  );

CREATE POLICY "管理者のみ組織を作成可能" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "管理者のみ組織を更新可能" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() AND organization_id = organizations.id AND role = 'admin'
    )
  );

-- サブグループ（sub_groups）のポリシー
CREATE POLICY "組織のメンバーはサブグループ情報を閲覧可能" ON sub_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() AND organization_id = sub_groups.organization_id
    )
  );

CREATE POLICY "管理者のみサブグループを作成可能" ON sub_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() AND organization_id = sub_groups.organization_id AND role = 'admin'
    )
  );

CREATE POLICY "管理者のみサブグループを更新可能" ON sub_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() AND organization_id = sub_groups.organization_id AND role = 'admin'
    )
  );

-- ユーザーグループメンバーシップ（user_group_memberships）のポリシー
CREATE POLICY "自分のメンバーシップ情報は閲覧可能" ON user_group_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "組織の管理者は全メンバーシップを閲覧可能" ON user_group_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      WHERE ugm.user_id = auth.uid() 
      AND ugm.organization_id = user_group_memberships.organization_id 
      AND ugm.role = 'admin'
    )
  );

CREATE POLICY "管理者のみメンバーシップを作成・更新可能" ON user_group_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      WHERE ugm.user_id = auth.uid() 
      AND ugm.organization_id = user_group_memberships.organization_id 
      AND ugm.role = 'admin'
    )
  );

-- 練習日程（practice_schedules）のポリシー
CREATE POLICY "組織のメンバーは練習日程を閲覧可能" ON practice_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() AND organization_id = practice_schedules.organization_id
    )
  );

CREATE POLICY "管理者のみ練習日程を作成・更新・削除可能" ON practice_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() AND organization_id = practice_schedules.organization_id AND role = 'admin'
    )
  );

-- 出欠席記録（attendance_records）のポリシー
CREATE POLICY "自分の出欠席記録は閲覧・更新可能" ON attendance_records
  FOR ALL USING (user_id = auth.uid());

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

-- 出欠席登録の期間制限（練習日の3日前から当日23:59まで）
CREATE OR REPLACE FUNCTION can_register_attendance(practice_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOW() >= (practice_date - INTERVAL '3 days')::TIMESTAMP 
    AND NOW() <= (practice_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーの組織内での権限をチェックする関数
CREATE OR REPLACE FUNCTION has_organization_permission(org_id UUID, required_role TEXT DEFAULT 'member')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_group_memberships 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id 
    AND (
      (required_role = 'admin' AND role = 'admin') OR
      (required_role = 'leader' AND role IN ('admin', 'leader')) OR
      (required_role = 'member' AND role IN ('admin', 'leader', 'member'))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "期間内のみ出欠席を登録・更新可能" ON attendance_records
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    can_register_attendance(
      (SELECT practice_date FROM practice_schedules WHERE id = practice_schedule_id)
    )
  );

CREATE POLICY "期間内のみ出欠席を更新可能" ON attendance_records
  FOR UPDATE USING (
    user_id = auth.uid() AND
    can_register_attendance(
      (SELECT practice_date FROM practice_schedules WHERE id = practice_schedule_id)
    )
  );

-- タスク（practice_tasks）のポリシー
CREATE POLICY "組織のメンバーはタスクを閲覧可能" ON practice_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() AND organization_id = practice_tasks.organization_id
    )
  );

CREATE POLICY "リーダー以上はタスクを作成・更新・削除可能" ON practice_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships 
      WHERE user_id = auth.uid() 
      AND organization_id = practice_tasks.organization_id 
      AND role IN ('admin', 'leader')
    )
  );

-- タスク進捗（task_progress）のポリシー
CREATE POLICY "自分のタスク進捗は閲覧・更新可能" ON task_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "組織のリーダー以上は全タスク進捗を閲覧可能" ON task_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practice_tasks pt
      JOIN user_group_memberships ugm ON ugm.organization_id = pt.organization_id
      WHERE pt.id = task_progress.task_id
      AND ugm.user_id = auth.uid() 
      AND ugm.role IN ('admin', 'leader')
    )
  );
