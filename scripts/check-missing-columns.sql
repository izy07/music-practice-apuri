-- ============================================
-- 不足しているカラムをチェックするSQL
-- ============================================
-- このSQLをSupabaseダッシュボードのSQL Editorで実行して、
-- 不足しているカラムを確認できます

-- my_songsテーブル
SELECT 
  'my_songs' as table_name,
  'instrument_id' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'my_songs' 
      AND column_name = 'instrument_id'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status;

-- recordingsテーブル
SELECT 
  'recordings' as table_name,
  'instrument_id' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'recordings' 
      AND column_name = 'instrument_id'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status
UNION ALL
SELECT 
  'recordings' as table_name,
  'recording_type' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'recordings' 
      AND column_name = 'recording_type'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status;

-- practice_sessionsテーブル
SELECT 
  'practice_sessions' as table_name,
  'instrument_id' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'practice_sessions' 
      AND column_name = 'instrument_id'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status;

-- goalsテーブル
SELECT 
  'goals' as table_name,
  'instrument_id' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'goals' 
      AND column_name = 'instrument_id'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status
UNION ALL
SELECT 
  'goals' as table_name,
  'show_on_calendar' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'goals' 
      AND column_name = 'show_on_calendar'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status
UNION ALL
SELECT 
  'goals' as table_name,
  'is_completed' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'goals' 
      AND column_name = 'is_completed'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status;

-- eventsテーブル
SELECT 
  'events' as table_name,
  'instrument_id' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'instrument_id'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status
UNION ALL
SELECT 
  'events' as table_name,
  'event_date' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'event_date'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status;

-- tasksテーブル
SELECT 
  'tasks' as table_name,
  'instrument_id' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'instrument_id'
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status;

