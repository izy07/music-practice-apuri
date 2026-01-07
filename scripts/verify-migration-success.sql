-- ============================================
-- マイグレーション成功確認SQL
-- ============================================
-- このSQLをSupabaseダッシュボードのSQL Editorで実行して、
-- すべてのカラムが正しく追加されたか確認できます

SELECT 
  table_name,
  column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
      AND column_name = t.column_name
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status
FROM (
  VALUES 
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

-- ============================================
-- 結果の見方
-- ============================================
-- すべての行が「✅ 存在する」と表示されれば、マイグレーションは成功しています
-- 「❌ 存在しない」と表示される行があれば、そのカラムは追加されていません
-- その場合は、supabase/migrations/20251226000006_ensure_all_columns.sql を実行してください

