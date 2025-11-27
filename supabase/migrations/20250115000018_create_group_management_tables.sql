-- 階層的グループ管理システムのテーブル作成

-- 団体（親グループ）テーブル
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- サブグループ（パート・学年など）テーブル
CREATE TABLE sub_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  group_type VARCHAR(50) NOT NULL, -- 'part', 'grade', 'section' など
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, name, group_type)
);

-- ユーザーとグループの関連テーブル
CREATE TABLE user_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sub_group_id UUID REFERENCES sub_groups(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'admin', 'leader', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id, sub_group_id)
);

-- 練習日程テーブル
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
  target_sub_group_id UUID REFERENCES sub_groups(id) ON DELETE SET NULL, -- NULLの場合は全体練習
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 出欠席テーブル
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_schedule_id UUID REFERENCES practice_schedules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_status VARCHAR(20) NOT NULL, -- 'present', 'absent', 'late'
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(practice_schedule_id, user_id)
);

-- タスク（練習課題）テーブル
CREATE TABLE practice_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sub_group_id UUID REFERENCES sub_groups(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- タスク進捗テーブル
CREATE TABLE task_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES practice_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_status VARCHAR(20) NOT NULL, -- 'not_started', 'in_progress', 'completed'
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- インデックスの作成
CREATE INDEX idx_user_group_memberships_user_id ON user_group_memberships(user_id);
CREATE INDEX idx_user_group_memberships_organization_id ON user_group_memberships(organization_id);
CREATE INDEX idx_practice_schedules_organization_id ON practice_schedules(organization_id);
CREATE INDEX idx_practice_schedules_practice_date ON practice_schedules(practice_date);
CREATE INDEX idx_attendance_records_practice_schedule_id ON attendance_records(practice_schedule_id);
CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_practice_tasks_organization_id ON practice_tasks(organization_id);
CREATE INDEX idx_practice_tasks_sub_group_id ON practice_tasks(sub_group_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sub_groups_updated_at BEFORE UPDATE ON sub_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_practice_schedules_updated_at BEFORE UPDATE ON practice_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_practice_tasks_updated_at BEFORE UPDATE ON practice_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
