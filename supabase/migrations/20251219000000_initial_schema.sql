-- ============================================
-- 初期スキーマ統合マイグレーション
-- ============================================
-- 日付: 2025-12-19
-- 目的: すべてのマイグレーションファイルを1つに統合し、依存関係を正しく整理
-- 依存関係順: instruments → user_profiles, recordings, goals, practice_sessions → organizations → user_group_memberships, practice_schedules, tasks → attendance_records, events
-- ============================================

-- ============================================
-- 1. instruments テーブル（最初に作成 - 他のテーブルが依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL,
  color_primary text NOT NULL DEFAULT '#8B4513',
  color_secondary text NOT NULL DEFAULT '#F8F9FA',
  color_accent text NOT NULL DEFAULT '#8B4513',
  color_background text NOT NULL DEFAULT '#FFFFFF',
  color_surface text NOT NULL DEFAULT '#FFFFFF',
  starting_note text,
  tuning_notes jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Anyone can view instruments" ON public.instruments;
CREATE POLICY "Anyone can view instruments" ON public.instruments
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage instruments" ON public.instruments
  FOR ALL USING (auth.role() = 'service_role');

-- 権限を付与
GRANT SELECT ON TABLE public.instruments TO anon, authenticated;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_instruments_id ON public.instruments(id);
CREATE INDEX IF NOT EXISTS idx_instruments_name_en ON public.instruments(name_en);

-- ============================================
-- 2. user_profiles テーブル（instrumentsに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name text,
  selected_instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL,
  practice_level text DEFAULT 'beginner' CHECK (practice_level IN ('beginner', 'intermediate', 'advanced')),
  level_selected_at timestamptz,
  total_practice_minutes integer DEFAULT 0,
  tutorial_completed boolean DEFAULT false,
  tutorial_completed_at timestamptz,
  onboarding_completed boolean DEFAULT false,
  onboarding_completed_at timestamptz,
  instrument_specific_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- RLSの有効化
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can read own profile') THEN
    CREATE POLICY "Users can read own profile" ON public.user_profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.user_profiles
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.user_profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_selected_instrument_id ON public.user_profiles(selected_instrument_id);

-- instrument_specific_dataカラムのコメント
COMMENT ON COLUMN public.user_profiles.instrument_specific_data IS '楽器ごとのプロフィールデータ（JSONB形式）';

-- ============================================
-- 3. recordings テーブル（instrumentsに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL,
  title text,
  memo text,
  file_path text,
  duration_seconds integer,
  recording_type text NOT NULL DEFAULT 'performance' CHECK (recording_type IN ('performance', 'lesson')),
  is_favorite boolean DEFAULT false,
  song_id uuid,
  media_source text CHECK (media_source IN ('uploaded', 'url')) DEFAULT 'uploaded',
  video_url text,
  thumbnail_url text,
  played_at timestamptz,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can read own recordings') THEN
    CREATE POLICY "Users can read own recordings" ON public.recordings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can insert own recordings') THEN
    CREATE POLICY "Users can insert own recordings" ON public.recordings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can update own recordings') THEN
    CREATE POLICY "Users can update own recordings" ON public.recordings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can delete own recordings') THEN
    CREATE POLICY "Users can delete own recordings" ON public.recordings
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_instrument_id ON public.recordings(instrument_id);
CREATE INDEX IF NOT EXISTS idx_recordings_recorded_at ON public.recordings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_recordings_recording_type ON public.recordings(recording_type);
CREATE INDEX IF NOT EXISTS idx_recordings_played_at ON public.recordings(played_at);

-- ============================================
-- 4. goals テーブル（instrumentsに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_type text NOT NULL CHECK (goal_type IN ('personal_short', 'personal_long', 'group')),
  title text NOT NULL,
  description text,
  target_date date,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_active boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  show_on_calendar boolean DEFAULT false,
  instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can read own goals') THEN
    CREATE POLICY "Users can read own goals" ON public.goals
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can insert own goals') THEN
    CREATE POLICY "Users can insert own goals" ON public.goals
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can update own goals') THEN
    CREATE POLICY "Users can update own goals" ON public.goals
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can delete own goals') THEN
    CREATE POLICY "Users can delete own goals" ON public.goals
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_goal_type ON public.goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_goals_is_completed ON public.goals(is_completed);
CREATE INDEX IF NOT EXISTS idx_goals_completed_at ON public.goals(completed_at);
CREATE INDEX IF NOT EXISTS idx_goals_instrument_id ON public.goals(instrument_id);
CREATE INDEX IF NOT EXISTS idx_goals_show_on_calendar ON public.goals(show_on_calendar) WHERE show_on_calendar = true;

-- ============================================
-- 5. practice_sessions テーブル（instrumentsに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL,
  practice_date date NOT NULL,
  duration_minutes integer NOT NULL,
  content text,
  audio_url text,
  input_method text DEFAULT 'manual' CHECK (input_method IN ('manual', 'preset', 'voice')),
  created_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can read own practice sessions') THEN
    CREATE POLICY "Users can read own practice sessions" ON public.practice_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can insert own practice sessions') THEN
    CREATE POLICY "Users can insert own practice sessions" ON public.practice_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can update own practice sessions') THEN
    CREATE POLICY "Users can update own practice sessions" ON public.practice_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can delete own practice sessions') THEN
    CREATE POLICY "Users can delete own practice sessions" ON public.practice_sessions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_instrument_id ON public.practice_sessions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_practice_date ON public.practice_sessions(practice_date);

-- ============================================
-- 7. organizations テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Users can view organizations') THEN
    CREATE POLICY "Users can view organizations" ON public.organizations
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Users can create organizations') THEN
    CREATE POLICY "Users can create organizations" ON public.organizations
      FOR INSERT WITH CHECK (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Users can update own organizations') THEN
    CREATE POLICY "Users can update own organizations" ON public.organizations
      FOR UPDATE USING (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Users can delete own organizations') THEN
    CREATE POLICY "Users can delete own organizations" ON public.organizations
      FOR DELETE USING (auth.uid() = created_by);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);

-- ============================================
-- 8. user_group_memberships テーブル（organizationsに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role varchar(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'leader', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- RLSの有効化
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_group_memberships' AND policyname = '自分のメンバーシップ情報は閲覧可能') THEN
    CREATE POLICY "自分のメンバーシップ情報は閲覧可能" ON public.user_group_memberships
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_group_memberships' AND policyname = '自分自身のメンバーシップを挿入可能') THEN
    CREATE POLICY "自分自身のメンバーシップを挿入可能" ON public.user_group_memberships
      FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'member');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_group_memberships' AND policyname = '自分のメンバーシップを更新可能') THEN
    CREATE POLICY "自分のメンバーシップを更新可能" ON public.user_group_memberships
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_group_memberships' AND policyname = '自分のメンバーシップを削除可能') THEN
    CREATE POLICY "自分のメンバーシップを削除可能" ON public.user_group_memberships
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_group_memberships' AND policyname = '組織の作成者はメンバーシップを管理可能') THEN
    CREATE POLICY "組織の作成者はメンバーシップを管理可能" ON public.user_group_memberships
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.organizations
          WHERE public.organizations.id = public.user_group_memberships.organization_id
          AND public.organizations.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user_id ON public.user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_organization_id ON public.user_group_memberships(organization_id);

-- ============================================
-- 9. practice_schedules テーブル（organizationsに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.practice_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  practice_date date NOT NULL,
  start_time time,
  end_time time,
  practice_type varchar(50) NOT NULL CHECK (practice_type IN ('ensemble', 'part_practice', 'individual_practice', 'rehearsal', 'lesson', 'event')),
  location varchar(200),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.practice_schedules ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_schedules' AND policyname = '組織のメンバーは練習日程を閲覧可能') THEN
    CREATE POLICY "組織のメンバーは練習日程を閲覧可能" ON public.practice_schedules
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.user_group_memberships
          WHERE user_group_memberships.organization_id = practice_schedules.organization_id
          AND user_group_memberships.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_schedules' AND policyname = '組織の管理者は練習日程を管理可能') THEN
    CREATE POLICY "組織の管理者は練習日程を管理可能" ON public.practice_schedules
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_group_memberships
          WHERE user_group_memberships.organization_id = practice_schedules.organization_id
          AND user_group_memberships.user_id = auth.uid()
          AND user_group_memberships.role IN ('admin', 'leader')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_schedules' AND policyname = '組織の作成者は練習日程を管理可能') THEN
    CREATE POLICY "組織の作成者は練習日程を管理可能" ON public.practice_schedules
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.organizations
          WHERE organizations.id = practice_schedules.organization_id
          AND organizations.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_practice_schedules_organization_id ON public.practice_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_practice_schedules_practice_date ON public.practice_schedules(practice_date);
CREATE INDEX IF NOT EXISTS idx_practice_schedules_org_date ON public.practice_schedules(organization_id, practice_date);
CREATE INDEX IF NOT EXISTS idx_practice_schedules_created_by ON public.practice_schedules(created_by);

-- ============================================
-- 10. tasks テーブル（organizationsに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority varchar(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = '組織のメンバーはタスクを閲覧可能') THEN
    CREATE POLICY "組織のメンバーはタスクを閲覧可能" ON public.tasks
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.user_group_memberships
          WHERE user_group_memberships.organization_id = tasks.organization_id
          AND user_group_memberships.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = '組織の管理者はタスクを管理可能') THEN
    CREATE POLICY "組織の管理者はタスクを管理可能" ON public.tasks
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_group_memberships
          WHERE user_group_memberships.organization_id = tasks.organization_id
          AND user_group_memberships.user_id = auth.uid()
          AND user_group_memberships.role IN ('admin', 'leader')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = '組織の作成者はタスクを管理可能') THEN
    CREATE POLICY "組織の作成者はタスクを管理可能" ON public.tasks
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.organizations
          WHERE organizations.id = tasks.organization_id
          AND organizations.created_by = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = '担当者は自分のタスクを更新可能') THEN
    CREATE POLICY "担当者は自分のタスクを更新可能" ON public.tasks
      FOR UPDATE USING (assigned_to = auth.uid());
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON public.tasks(organization_id, status);

-- ============================================
-- 11. attendance_records テーブル（practice_schedulesに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_schedule_id uuid REFERENCES public.practice_schedules(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  attendance_status varchar(20) NOT NULL CHECK (attendance_status IN ('present', 'absent', 'late')),
  registered_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(practice_schedule_id, user_id)
);

-- RLSの有効化
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_records' AND policyname = '自分の出欠記録は閲覧・更新可能') THEN
    CREATE POLICY "自分の出欠記録は閲覧・更新可能" ON public.attendance_records
      FOR ALL USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance_records' AND policyname = '組織の管理者は全出欠記録を閲覧可能') THEN
    CREATE POLICY "組織の管理者は全出欠記録を閲覧可能" ON public.attendance_records
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.practice_schedules ps
          JOIN public.user_group_memberships ugm ON ugm.organization_id = ps.organization_id
          WHERE ps.id = attendance_records.practice_schedule_id
          AND ugm.user_id = auth.uid()
          AND ugm.role IN ('admin', 'leader')
        )
      );
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_attendance_records_practice_schedule_id ON public.attendance_records(practice_schedule_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_registered_at ON public.attendance_records(registered_at);

-- ============================================
-- 12. events テーブル（practice_schedulesに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  description text,
  practice_schedule_id uuid REFERENCES public.practice_schedules(id) ON DELETE SET NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can read own events') THEN
    CREATE POLICY "Users can read own events" ON public.events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can insert own events') THEN
    CREATE POLICY "Users can insert own events" ON public.events
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can update own events') THEN
    CREATE POLICY "Users can update own events" ON public.events
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can delete own events') THEN
    CREATE POLICY "Users can delete own events" ON public.events
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_is_completed ON public.events(is_completed);
CREATE INDEX IF NOT EXISTS idx_events_completed_at ON public.events(completed_at);
CREATE INDEX IF NOT EXISTS idx_events_practice_schedule_id ON public.events(practice_schedule_id);

-- ============================================
-- 13. music_terms テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS public.music_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  reading text NOT NULL,
  category text NOT NULL CHECK (category IN ('tempo', 'dynamics', 'expression', 'articulation', 'accidental', 'technique', 'other')),
  meaning_ja text NOT NULL,
  meaning_en text NOT NULL,
  description_ja text,
  description_en text,
  created_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.music_terms ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Anyone can read music terms" ON public.music_terms;
CREATE POLICY "Anyone can read music terms" ON public.music_terms
  FOR SELECT USING (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_music_terms_category ON public.music_terms(category);

-- ============================================
-- 14. ai_chat_history テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_history' AND policyname = 'Users can read own chat history') THEN
    CREATE POLICY "Users can read own chat history" ON public.ai_chat_history
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_history' AND policyname = 'Users can insert own chat history') THEN
    CREATE POLICY "Users can insert own chat history" ON public.ai_chat_history
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_history' AND policyname = 'Users can update own chat history') THEN
    CREATE POLICY "Users can update own chat history" ON public.ai_chat_history
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_chat_history' AND policyname = 'Users can delete own chat history') THEN
    CREATE POLICY "Users can delete own chat history" ON public.ai_chat_history
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON public.ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_created_at ON public.ai_chat_history(created_at);

-- ============================================
-- 15. representative_songs テーブル（instrumentsに依存）
-- ============================================
CREATE TABLE IF NOT EXISTS public.representative_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid REFERENCES public.instruments(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  composer text NOT NULL,
  era text,
  genre text,
  difficulty_level integer CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  youtube_url text,
  spotify_url text,
  description_ja text,
  description_en text,
  is_popular boolean DEFAULT false,
  display_order integer DEFAULT 0,
  famous_performer text,
  famous_video_url text,
  famous_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.representative_songs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Anyone can view representative songs" ON public.representative_songs;
CREATE POLICY "Anyone can view representative songs" ON public.representative_songs
  FOR SELECT USING (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_representative_songs_instrument_id ON public.representative_songs(instrument_id);
CREATE INDEX IF NOT EXISTS idx_representative_songs_display_order ON public.representative_songs(display_order);
CREATE INDEX IF NOT EXISTS idx_representative_songs_is_popular ON public.representative_songs(is_popular);

-- ============================================
-- 16. 更新日時を自動更新するトリガー関数
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS update_instruments_updated_at ON public.instruments;
CREATE TRIGGER update_instruments_updated_at
  BEFORE UPDATE ON public.instruments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_practice_schedules_updated_at ON public.practice_schedules;
CREATE TRIGGER update_practice_schedules_updated_at
  BEFORE UPDATE ON public.practice_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_representative_songs_updated_at ON public.representative_songs;
CREATE TRIGGER update_representative_songs_updated_at
  BEFORE UPDATE ON public.representative_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 17. instruments テーブルの初期データ
-- ============================================
INSERT INTO public.instruments (
  id, name, name_en, color_primary, color_secondary, color_accent, 
  color_background, color_surface, starting_note, tuning_notes
) VALUES
-- ピアノ（黒）
('550e8400-e29b-41d4-a716-446655440001', 'ピアノ', 'Piano', '#1A1A1A', '#C0C0C0', '#D4AF37', '#F8F6F0', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- ギター（茶色）
('550e8400-e29b-41d4-a716-446655440002', 'ギター', 'Guitar', '#654321', '#DEB887', '#8B4513', '#FFF8DC', '#FFFFFF', 'E2', to_jsonb(ARRAY['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])),
-- バイオリン
('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#6B4423', '#C9A961', '#D4AF37', '#FFF8F0', '#FFFFFF', 'G3', to_jsonb(ARRAY['G3', 'D4', 'A4', 'E5'])),
-- フルート
('550e8400-e29b-41d4-a716-446655440004', 'フルート', 'Flute', '#C0C0C0', '#E6E6FA', '#A9A9A9', '#F0F8FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- トランペット
('550e8400-e29b-41d4-a716-446655440005', 'トランペット', 'Trumpet', '#B8860B', '#DAA520', '#8B4513', '#FFE4B5', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])),
-- ドラム
('550e8400-e29b-41d4-a716-446655440006', 'ドラム', 'Drums', '#000000', '#696969', '#000000', '#F5F5DC', '#FFFFFF', NULL, NULL),
-- サックス
('550e8400-e29b-41d4-a716-446655440007', 'サックス', 'Saxophone', '#FFD700', '#FFEB3B', '#FFC107', '#FFFDE7', '#FFFFFF', 'Bb3', to_jsonb(ARRAY['Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4'])),
-- ホルン
('550e8400-e29b-41d4-a716-446655440008', 'ホルン', 'Horn', '#8B4513', '#F4A460', '#654321', '#FFF8DC', '#FFFFFF', 'F3', to_jsonb(ARRAY['F3', 'C4', 'F4'])),
-- クラリネット
('550e8400-e29b-41d4-a716-446655440009', 'クラリネット', 'Clarinet', '#000000', '#2F2F2F', '#1A1A1A', '#E6E6FA', '#FFFFFF', 'E3', to_jsonb(ARRAY['E3', 'F3', 'G3', 'A3', 'B3'])),
-- トロンボーン
('550e8400-e29b-41d4-a716-446655440010', 'トロンボーン', 'Trombone', '#C0C0C0', '#E6E6FA', '#A9A9A9', '#F0F8FF', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'E2', 'B2', 'E3'])),
-- チェロ
('550e8400-e29b-41d4-a716-446655440011', 'チェロ', 'Cello', '#DC143C', '#FF69B4', '#8B0000', '#FFE4E1', '#FFFFFF', 'C2', to_jsonb(ARRAY['C2', 'G2', 'D3', 'A3'])),
-- ファゴット
('550e8400-e29b-41d4-a716-446655440012', 'ファゴット', 'Bassoon', '#A0522D', '#DEB887', '#8B4513', '#FFF8DC', '#FFFFFF', 'B1', to_jsonb(ARRAY['B1', 'C2', 'D2', 'E2'])),
-- オーボエ
('550e8400-e29b-41d4-a716-446655440013', 'オーボエ', 'Oboe', '#DAA520', '#F0E68C', '#B8860B', '#FFFACD', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4'])),
-- ハープ
('550e8400-e29b-41d4-a716-446655440014', 'ハープ', 'Harp', '#FF69B4', '#FFB6C1', '#C71585', '#FFF0F5', '#FFFFFF', 'C2', to_jsonb(ARRAY['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'])),
-- コントラバス
('550e8400-e29b-41d4-a716-446655440015', 'コントラバス', 'Contrabass', '#2F4F4F', '#708090', '#000000', '#F5F5F5', '#FFFFFF', 'E1', to_jsonb(ARRAY['E1', 'A1', 'D2', 'G2'])),
-- その他
('550e8400-e29b-41d4-a716-446655440017', 'その他', 'Other', '#4682B4', '#87CEEB', '#2F4F4F', '#E0F6FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4'])),
-- ヴィオラ
('550e8400-e29b-41d4-a716-446655440018', 'ヴィオラ', 'Viola', '#B22222', '#FF7F50', '#8B0000', '#FFE4E1', '#FFFFFF', 'C3', to_jsonb(ARRAY['C3', 'G3', 'D4', 'A4'])),
-- 琴
('550e8400-e29b-41d4-a716-446655440019', '琴', 'Koto', '#8B4513', '#DEB887', '#654321', '#FFF8DC', '#FFFFFF', 'D3', to_jsonb(ARRAY['D3', 'E3', 'F3', 'G3', 'A3'])),
-- シンセサイザー
('550e8400-e29b-41d4-a716-446655440020', 'シンセサイザー', 'Synthesizer', '#4169E1', '#87CEEB', '#1E90FF', '#E0F6FF', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4', 'F4', 'G4'])),
-- 太鼓
('550e8400-e29b-41d4-a716-446655440021', '太鼓', 'Taiko', '#DC143C', '#FF6347', '#8B0000', '#FFE4E1', '#FFFFFF', 'C4', to_jsonb(ARRAY['C4', 'D4', 'E4']))
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  color_background = EXCLUDED.color_background,
  color_surface = EXCLUDED.color_surface,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes,
  updated_at = NOW();

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '初期スキーマ統合マイグレーションが完了しました。';
END $$;

