# マイグレーションを今すぐ実行する方法（最速ガイド）

## ⚡ 最速の方法（3ステップ）

### ステップ1: Supabaseダッシュボードを開く
https://supabase.com/dashboard/project/uteeqkpsezbabdmritkn/sql/new

### ステップ2: 以下のSQLをコピー＆ペースト

```sql
-- すべてのテーブルに必要なカラムを確実に追加
DO $$
BEGIN
  -- 1. my_songs.instrument_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'my_songs' AND column_name = 'instrument_id') THEN
    ALTER TABLE public.my_songs ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_my_songs_instrument_id ON public.my_songs(instrument_id);
  END IF;
  
  -- 2. recordings.instrument_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recordings' AND column_name = 'instrument_id') THEN
    ALTER TABLE public.recordings ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_recordings_instrument_id ON public.recordings(instrument_id);
  END IF;
  
  -- 3. recordings.recording_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recordings' AND column_name = 'recording_type') THEN
    ALTER TABLE public.recordings ADD COLUMN recording_type text NOT NULL DEFAULT 'performance' CHECK (recording_type IN ('performance', 'lesson'));
  END IF;
  
  -- 4. practice_sessions.instrument_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'practice_sessions' AND column_name = 'instrument_id') THEN
    ALTER TABLE public.practice_sessions ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_practice_sessions_instrument_id ON public.practice_sessions(instrument_id);
  END IF;
  
  -- 5. goals.instrument_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'instrument_id') THEN
    ALTER TABLE public.goals ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_goals_instrument_id ON public.goals(instrument_id);
  END IF;
  
  -- 6. goals.show_on_calendar
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar') THEN
    ALTER TABLE public.goals ADD COLUMN show_on_calendar boolean DEFAULT false;
  END IF;
  
  -- 7. goals.is_completed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'is_completed') THEN
    ALTER TABLE public.goals ADD COLUMN is_completed boolean DEFAULT false;
  END IF;
  
  -- 8. events.instrument_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'instrument_id') THEN
    ALTER TABLE public.events ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_events_instrument_id ON public.events(instrument_id);
  END IF;
  
  -- 9. events.event_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_date') THEN
    ALTER TABLE public.events ADD COLUMN event_date date;
    UPDATE public.events SET event_date = date WHERE event_date IS NULL AND date IS NOT NULL;
  END IF;
  
  -- 10. tasks.instrument_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'instrument_id') THEN
    ALTER TABLE public.tasks ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_instrument_id ON public.tasks(instrument_id);
  END IF;
  
  RAISE NOTICE '✅ すべての必要なカラムの追加が完了しました';
END $$;
```

### ステップ3: 「Run」ボタンをクリック

これで完了です！

## 📋 実行後の確認

実行後、以下のSQLで確認できます：

```sql
SELECT 
  table_name,
  column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name
    AND column_name = t.column_name
  ) THEN '✅' ELSE '❌' END as status
FROM (VALUES 
  ('my_songs', 'instrument_id'),
  ('recordings', 'instrument_id'),
  ('recordings', 'recording_type'),
  ('practice_sessions', 'instrument_id'),
  ('goals', 'instrument_id'),
  ('goals', 'show_on_calendar'),
  ('goals', 'is_completed'),
  ('events', 'instrument_id'),
  ('events', 'event_date'),
  ('tasks', 'instrument_id')
) AS t(table_name, column_name)
ORDER BY table_name, column_name;
```

すべて「✅」と表示されれば成功です。

