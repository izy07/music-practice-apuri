# マイグレーションを今すぐ実行する方法

## 最も簡単な方法：Supabaseダッシュボードから実行

### 手順

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard
   - プロジェクト `uteeqkpsezbabdmritkn` を選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック

3. **マイグレーションファイルの内容をコピー**
   - `supabase/migrations/20251226000006_ensure_all_columns.sql` の内容をコピー
   - または `scripts/execute-migration-directly.sql` の内容をコピー

4. **SQL Editorに貼り付けて実行**
   - コピーしたSQLをSQL Editorに貼り付け
   - 「Run」ボタンをクリック

5. **実行結果を確認**
   - 成功メッセージが表示されれば完了
   - エラーが表示された場合は、エラーメッセージを確認

## 実行するSQL（コピー用）

以下のSQLをコピーしてSupabaseダッシュボードのSQL Editorで実行してください：

```sql
-- ============================================
-- すべてのテーブルに必要なカラムを確実に追加
-- ============================================

-- 1. my_songsテーブルにinstrument_idカラムを追加
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

-- 2. recordingsテーブルにinstrument_idカラムを追加
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

-- 3. recordingsテーブルにrecording_typeカラムを追加
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

-- 4. practice_sessionsテーブルにinstrument_idカラムを追加
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

-- 5. goalsテーブルにinstrument_idカラムを追加
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

-- 6. goalsテーブルにshow_on_calendarカラムを追加
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

-- 7. goalsテーブルにis_completedカラムを追加
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

-- 8. eventsテーブルにinstrument_idカラムを追加
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

-- 9. eventsテーブルにevent_dateカラムを追加
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

-- 10. tasksテーブルにinstrument_idカラムを追加
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

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ すべての必要なカラムの追加が完了しました';
END $$;
```

## 実行後の確認

実行後、以下のSQLでカラムの存在を確認できます：

```sql
-- 各カラムの存在確認（個別に実行）
SELECT 
  'my_songs.instrument_id' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'my_songs'
    AND column_name = 'instrument_id'
  ) as exists;

SELECT 
  'recordings.instrument_id' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recordings'
    AND column_name = 'instrument_id'
  ) as exists;

SELECT 
  'recordings.recording_type' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recordings'
    AND column_name = 'recording_type'
  ) as exists;

SELECT 
  'practice_sessions.instrument_id' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_sessions'
    AND column_name = 'instrument_id'
  ) as exists;

SELECT 
  'goals.instrument_id' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals'
    AND column_name = 'instrument_id'
  ) as exists;

SELECT 
  'goals.show_on_calendar' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals'
    AND column_name = 'show_on_calendar'
  ) as exists;

SELECT 
  'goals.is_completed' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals'
    AND column_name = 'is_completed'
  ) as exists;

SELECT 
  'events.instrument_id' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events'
    AND column_name = 'instrument_id'
  ) as exists;

SELECT 
  'events.event_date' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events'
    AND column_name = 'event_date'
  ) as exists;

SELECT 
  'tasks.instrument_id' as check_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks'
    AND column_name = 'instrument_id'
  ) as exists;
```

すべてのクエリで `exists` が `true` と表示されれば、マイグレーションは成功しています。

**注意**: 上記の確認用SQLは、マイグレーションSQLとは別に実行してください。複数のクエリを一度に実行する場合は、セミコロン（`;`）で区切って実行してください。

