-- ============================================
-- すべてのテーブルに必要なカラムを確実に追加
-- ============================================
-- 日付: 2025-12-26
-- 目的: アプリケーションで使用されるすべてのカラムが存在することを保証
-- 注意: 初期スキーマ（20251219000000_initial_schema.sql）には既に含まれている可能性があります
--       このマイグレーションは、初期スキーマ適用前の既存データベース用です

-- ============================================
-- 1. my_songsテーブルにinstrument_idカラムを追加
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'my_songs' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.my_songs 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.my_songs.instrument_id IS '楽器ID（楽器ごとに曲を分けて管理）';
    
    CREATE INDEX IF NOT EXISTS idx_my_songs_instrument_id ON public.my_songs(instrument_id);
  END IF;
END $$;

-- ============================================
-- 2. recordingsテーブルにinstrument_idカラムを追加
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recordings' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.recordings 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.recordings.instrument_id IS '楽器ID（楽器ごとに録音を分けて管理）';
    
    CREATE INDEX IF NOT EXISTS idx_recordings_instrument_id ON public.recordings(instrument_id);
  END IF;
END $$;

-- ============================================
-- 3. recordingsテーブルにrecording_typeカラムを追加（存在しない場合）
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recordings' 
    AND column_name = 'recording_type'
  ) THEN
    ALTER TABLE public.recordings 
    ADD COLUMN recording_type text NOT NULL DEFAULT 'performance' 
    CHECK (recording_type IN ('performance', 'lesson'));
    
    COMMENT ON COLUMN public.recordings.recording_type IS '録音種類（performance: 演奏録音, lesson: レッスン録音）';
  END IF;
END $$;

-- ============================================
-- 4. practice_sessionsテーブルにinstrument_idカラムを追加
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_sessions' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.practice_sessions 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.practice_sessions.instrument_id IS '楽器ID（楽器ごとに練習記録を分けて管理）';
    
    CREATE INDEX IF NOT EXISTS idx_practice_sessions_instrument_id ON public.practice_sessions(instrument_id);
  END IF;
END $$;

-- ============================================
-- 5. goalsテーブルにinstrument_idカラムを追加
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.goals 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.goals.instrument_id IS '楽器ID（楽器ごとに目標を分けて管理）';
    
    CREATE INDEX IF NOT EXISTS idx_goals_instrument_id ON public.goals(instrument_id);
  END IF;
END $$;

-- ============================================
-- 6. goalsテーブルにshow_on_calendarカラムを追加（存在しない場合）
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals' 
    AND column_name = 'show_on_calendar'
  ) THEN
    ALTER TABLE public.goals 
    ADD COLUMN show_on_calendar boolean DEFAULT false;
    
    COMMENT ON COLUMN public.goals.show_on_calendar IS 'カレンダーに表示するかどうか';
  END IF;
END $$;

-- ============================================
-- 7. goalsテーブルにis_completedカラムを追加（存在しない場合）
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals' 
    AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE public.goals 
    ADD COLUMN is_completed boolean DEFAULT false;
    
    COMMENT ON COLUMN public.goals.is_completed IS '目標が完了したかどうか';
  END IF;
END $$;

-- ============================================
-- 8. eventsテーブルにinstrument_idカラムを追加
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.events 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.events.instrument_id IS '楽器ID（楽器ごとにイベントを分けて管理）';
    
    CREATE INDEX IF NOT EXISTS idx_events_instrument_id ON public.events(instrument_id);
  END IF;
END $$;

-- ============================================
-- 9. eventsテーブルにevent_dateカラムを追加（存在しない場合、dateカラムのエイリアス）
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'event_date'
  ) THEN
    ALTER TABLE public.events 
    ADD COLUMN event_date date;
    
    COMMENT ON COLUMN public.events.event_date IS 'イベント日付（dateカラムのエイリアス、互換性のため）';
    
    -- 既存のdateカラムの値をevent_dateにコピー
    UPDATE public.events 
    SET event_date = date 
    WHERE event_date IS NULL AND date IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- 10. tasksテーブルにinstrument_idカラムを追加
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.tasks 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.tasks.instrument_id IS '楽器ID（楽器ごとにタスクを分けて管理）';
    
    CREATE INDEX IF NOT EXISTS idx_tasks_instrument_id ON public.tasks(instrument_id);
  END IF;
END $$;

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'すべての必要なカラムの追加が完了しました';
END $$;

