-- 不足しているテーブルとカラムを確実に作成するマイグレーション
-- 2025-11-19
-- このマイグレーションは、以下の問題を根本的に解決します：
-- 1. eventsテーブルにevent_dateカラムを追加
-- 2. basic_practice_completionsテーブルが存在しない場合は作成
-- 3. user_group_membershipsテーブルが存在しない場合は作成
-- 4. goalsテーブルにinstrument_idカラムを追加
-- 5. goalsテーブルにshow_on_calendarカラムを追加

-- 1. eventsテーブルにevent_dateカラムを追加（dateカラムのエイリアスとして）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    -- event_dateカラムが存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_date') THEN
      -- dateカラムの値をevent_dateにコピーしてから、dateカラムを削除してevent_dateにリネーム
      -- または、event_dateをdateのエイリアスとして追加
      ALTER TABLE events ADD COLUMN event_date DATE;
      -- 既存のdateカラムの値をevent_dateにコピー
      UPDATE events SET event_date = date WHERE event_date IS NULL AND date IS NOT NULL;
      -- dateカラムがNULLのレコードがある場合は、event_dateもNULLのままにする（NOT NULL制約は追加しない）
      -- インデックスを作成
      CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
    END IF;
  END IF;
END $$;

-- 2. basic_practice_completionsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS basic_practice_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument_id uuid REFERENCES instruments(id),
  practice_date date NOT NULL,
  menu_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, practice_date, instrument_id)
);

-- basic_practice_completionsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_basic_practice_completions_user_id ON basic_practice_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_basic_practice_completions_practice_date ON basic_practice_completions(practice_date);
CREATE INDEX IF NOT EXISTS idx_basic_practice_completions_user_date ON basic_practice_completions(user_id, practice_date DESC);

-- basic_practice_completionsテーブルのRLSを有効化
ALTER TABLE basic_practice_completions ENABLE ROW LEVEL SECURITY;

-- basic_practice_completionsテーブルのRLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'basic_practice_completions' 
    AND policyname = 'Users can view their own basic practice completions'
  ) THEN
    CREATE POLICY "Users can view their own basic practice completions"
      ON basic_practice_completions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'basic_practice_completions' 
    AND policyname = 'Users can insert their own basic practice completions'
  ) THEN
    CREATE POLICY "Users can insert their own basic practice completions"
      ON basic_practice_completions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'basic_practice_completions' 
    AND policyname = 'Users can update their own basic practice completions'
  ) THEN
    CREATE POLICY "Users can update their own basic practice completions"
      ON basic_practice_completions
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'basic_practice_completions' 
    AND policyname = 'Users can delete their own basic practice completions'
  ) THEN
    CREATE POLICY "Users can delete their own basic practice completions"
      ON basic_practice_completions
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. user_group_membershipsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS user_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sub_group_id UUID REFERENCES sub_groups(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id, sub_group_id)
);

-- user_group_membershipsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user_id ON user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_organization_id ON user_group_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_sub_group_id ON user_group_memberships(sub_group_id);

-- user_group_membershipsテーブルのRLSを有効化
ALTER TABLE user_group_memberships ENABLE ROW LEVEL SECURITY;

-- user_group_membershipsテーブルのRLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'user_group_memberships' 
    AND policyname = 'Users can view their own memberships'
  ) THEN
    CREATE POLICY "Users can view their own memberships"
      ON user_group_memberships
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. goalsテーブルにinstrument_idカラムを追加（存在しない場合）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'instrument_id') THEN
      ALTER TABLE goals ADD COLUMN instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_goals_instrument_id ON goals(instrument_id);
      COMMENT ON COLUMN goals.instrument_id IS '目標に関連する楽器ID';
    END IF;
  END IF;
END $$;

-- 5. goalsテーブルにshow_on_calendarカラムを追加（存在しない場合）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar') THEN
      ALTER TABLE goals ADD COLUMN show_on_calendar BOOLEAN DEFAULT false;
      CREATE INDEX IF NOT EXISTS idx_goals_show_on_calendar ON goals(show_on_calendar) WHERE show_on_calendar = true;
      COMMENT ON COLUMN goals.show_on_calendar IS 'カレンダーに表示するかどうか（true: 表示, false: 非表示）';
    END IF;
  END IF;
END $$;

-- 6. eventsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  event_date DATE,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- eventsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_is_completed ON events(is_completed);

-- eventsテーブルのRLSを有効化
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- eventsテーブルのRLSポリシー
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'events' 
    AND policyname = 'Users can view own events'
  ) THEN
    CREATE POLICY "Users can view own events" ON events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'events' 
    AND policyname = 'Users can insert own events'
  ) THEN
    CREATE POLICY "Users can insert own events" ON events
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'events' 
    AND policyname = 'Users can update own events'
  ) THEN
    CREATE POLICY "Users can update own events" ON events
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename = 'events' 
    AND policyname = 'Users can delete own events'
  ) THEN
    CREATE POLICY "Users can delete own events" ON events
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 7. eventsテーブルのevent_dateカラムをdateカラムと同期するトリガー
CREATE OR REPLACE FUNCTION sync_events_date_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- event_dateがNULLの場合はdateの値をコピー
  IF NEW.event_date IS NULL AND NEW.date IS NOT NULL THEN
    NEW.event_date := NEW.date;
  END IF;
  -- dateがNULLの場合はevent_dateの値をコピー
  IF NEW.date IS NULL AND NEW.event_date IS NOT NULL THEN
    NEW.date := NEW.event_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーが存在しない場合のみ作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'sync_events_date_columns_trigger'
  ) THEN
    CREATE TRIGGER sync_events_date_columns_trigger
      BEFORE INSERT OR UPDATE ON events
      FOR EACH ROW
      EXECUTE FUNCTION sync_events_date_columns();
  END IF;
END $$;

-- 8. 既存のeventsレコードのevent_dateをdateからコピー
UPDATE events 
SET event_date = date 
WHERE event_date IS NULL AND date IS NOT NULL;

