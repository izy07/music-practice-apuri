-- ============================================
-- ユーザーデータエクスポート用SQLクエリ
-- ============================================
-- このスクリプトは、ログイン中のユーザーが取得できるすべてのデータをエクスポートします
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ============================================
-- 注意: RLS（Row Level Security）により、自分のデータのみが取得されます
-- ============================================

-- 1. ユーザープロフィール情報
SELECT 
  'user_profiles' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    display_name,
    avatar_url,
    practice_level,
    selected_instrument_id,
    organization,
    current_organization,
    nickname,
    bio,
    birthday,
    current_age,
    music_start_age,
    music_experience_years,
    total_practice_minutes,
    created_at,
    updated_at
  FROM user_profiles
  WHERE user_id = auth.uid()
) t;

-- 2. 練習記録（practice_sessions）
SELECT 
  'practice_sessions' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    instrument_id,
    practice_date,
    duration_minutes,
    content,
    audio_url,
    input_method,
    created_at,
    updated_at
  FROM practice_sessions
  WHERE user_id = auth.uid()
  ORDER BY practice_date DESC, created_at DESC
) t;

-- 3. 目標（goals）
SELECT 
  'goals' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    title,
    description,
    target_date,
    goal_type,
    progress_percentage,
    is_active,
    is_completed,
    completed_at,
    show_on_calendar,
    instrument_id,
    created_at,
    updated_at
  FROM goals
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
) t;

-- 4. イベント（events）
SELECT 
  'events' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    title,
    date AS event_date,
    description,
    practice_schedule_id,
    created_at,
    updated_at
  FROM events
  WHERE user_id = auth.uid()
  ORDER BY date DESC
) t;

-- 5. 録音データ（recordings）
SELECT 
  'recordings' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    instrument_id,
    title,
    memo,
    file_path,
    duration_seconds,
    is_favorite,
    recorded_at,
    created_at
  FROM recordings
  WHERE user_id = auth.uid()
  ORDER BY recorded_at DESC
) t;

-- 6. マイソング（my_songs）
SELECT 
  'my_songs' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    title,
    artist,
    genre,
    difficulty,
    status,
    notes,
    target_date,
    created_at,
    updated_at
  FROM my_songs
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
) t;

-- 7. ユーザー設定（user_settings）
SELECT 
  'user_settings' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    language,
    theme,
    notifications_enabled,
    metronome_settings,
    tuner_settings,
    created_at,
    updated_at
  FROM user_settings
  WHERE user_id = auth.uid()
) t;

-- 8. チュートリアル進捗（tutorial_progress）
SELECT 
  'tutorial_progress' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    is_completed,
    completed_at,
    current_step,
    created_at,
    updated_at
  FROM tutorial_progress
  WHERE user_id = auth.uid()
) t;

-- 9. 休止期間（user_break_periods）
SELECT 
  'user_break_periods' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    start_date,
    end_date,
    reason,
    created_at,
    updated_at
  FROM user_break_periods
  WHERE user_id = auth.uid()
  ORDER BY start_date DESC
) t;

-- 10. 過去の所属団体（user_past_organizations）
SELECT 
  'user_past_organizations' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    organization_name,
    start_date,
    end_date,
    role,
    created_at,
    updated_at
  FROM user_past_organizations
  WHERE user_id = auth.uid()
  ORDER BY start_date DESC
) t;

-- 11. 受賞（user_awards）
SELECT 
  'user_awards' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    award_name,
    award_date,
    organization,
    description,
    created_at,
    updated_at
  FROM user_awards
  WHERE user_id = auth.uid()
  ORDER BY award_date DESC
) t;

-- 12. 演奏経験（user_performances）
SELECT 
  'user_performances' AS table_name,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    user_id,
    performance_name,
    performance_date,
    venue,
    role,
    description,
    created_at,
    updated_at
  FROM user_performances
  WHERE user_id = auth.uid()
  ORDER BY performance_date DESC
) t;

-- ============================================
-- 統計サマリー（集計データ）
-- ============================================

-- 練習統計サマリー
SELECT 
  'practice_summary' AS summary_type,
  json_build_object(
    'total_sessions', COUNT(*),
    'total_minutes', COALESCE(SUM(duration_minutes), 0),
    'total_hours', ROUND(COALESCE(SUM(duration_minutes), 0) / 60.0, 2),
    'average_minutes_per_session', ROUND(COALESCE(AVG(duration_minutes), 0), 2),
    'first_practice_date', MIN(practice_date),
    'last_practice_date', MAX(practice_date),
    'total_days_practiced', COUNT(DISTINCT practice_date),
    'by_instrument', (
      SELECT json_agg(row_to_json(instrument_stats))
      FROM (
        SELECT 
          instrument_id,
          COUNT(*) AS session_count,
          SUM(duration_minutes) AS total_minutes,
          AVG(duration_minutes) AS avg_minutes
        FROM practice_sessions
        WHERE user_id = auth.uid()
        GROUP BY instrument_id
      ) instrument_stats
    ),
    'by_input_method', (
      SELECT json_agg(row_to_json(method_stats))
      FROM (
        SELECT 
          input_method,
          COUNT(*) AS session_count,
          SUM(duration_minutes) AS total_minutes
        FROM practice_sessions
        WHERE user_id = auth.uid()
        GROUP BY input_method
      ) method_stats
    )
  ) AS data
FROM practice_sessions
WHERE user_id = auth.uid();

-- 目標統計サマリー
SELECT 
  'goals_summary' AS summary_type,
  json_build_object(
    'total_goals', COUNT(*),
    'active_goals', COUNT(*) FILTER (WHERE is_active = true AND (is_completed = false OR is_completed IS NULL)),
    'completed_goals', COUNT(*) FILTER (WHERE is_completed = true),
    'average_progress', ROUND(COALESCE(AVG(progress_percentage), 0), 2),
    'by_goal_type', (
      SELECT json_agg(row_to_json(type_stats))
      FROM (
        SELECT 
          goal_type,
          COUNT(*) AS count,
          AVG(progress_percentage) AS avg_progress
        FROM goals
        WHERE user_id = auth.uid()
        GROUP BY goal_type
      ) type_stats
    )
  ) AS data
FROM goals
WHERE user_id = auth.uid();

-- 録音統計サマリー
SELECT 
  'recordings_summary' AS summary_type,
  json_build_object(
    'total_recordings', COUNT(*),
    'total_duration_seconds', COALESCE(SUM(duration_seconds), 0),
    'total_duration_minutes', ROUND(COALESCE(SUM(duration_seconds), 0) / 60.0, 2),
    'total_duration_hours', ROUND(COALESCE(SUM(duration_seconds), 0) / 3600.0, 2),
    'favorite_count', COUNT(*) FILTER (WHERE is_favorite = true),
    'first_recording_date', MIN(recorded_at),
    'last_recording_date', MAX(recorded_at)
  ) AS data
FROM recordings
WHERE user_id = auth.uid();

-- マイソング統計サマリー
SELECT 
  'my_songs_summary' AS summary_type,
  json_build_object(
    'total_songs', COUNT(*),
    'by_status', (
      SELECT json_agg(row_to_json(status_stats))
      FROM (
        SELECT 
          status,
          COUNT(*) AS count
        FROM my_songs
        WHERE user_id = auth.uid()
        GROUP BY status
      ) status_stats
    ),
    'by_difficulty', (
      SELECT json_agg(row_to_json(difficulty_stats))
      FROM (
        SELECT 
          difficulty,
          COUNT(*) AS count
        FROM my_songs
        WHERE user_id = auth.uid()
        GROUP BY difficulty
      ) difficulty_stats
    )
  ) AS data
FROM my_songs
WHERE user_id = auth.uid();

-- ============================================
-- 全データを1つのJSONオブジェクトとして取得
-- ============================================
-- このクエリは、すべてのデータを1つのJSONオブジェクトとして返します
-- CSVやExcelにエクスポートする場合は、上記の個別クエリを使用してください
-- ============================================

SELECT json_build_object(
  'export_date', NOW(),
  'user_id', auth.uid(),
  'user_profiles', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT * FROM user_profiles WHERE user_id = auth.uid()
    ) t
  ),
  'practice_sessions', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT * FROM practice_sessions WHERE user_id = auth.uid() ORDER BY practice_date DESC
    ) t
  ),
  'goals', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT * FROM goals WHERE user_id = auth.uid() ORDER BY created_at DESC
    ) t
  ),
  'events', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT * FROM events WHERE user_id = auth.uid() ORDER BY date DESC
    ) t
  ),
  'recordings', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT * FROM recordings WHERE user_id = auth.uid() ORDER BY recorded_at DESC
    ) t
  ),
  'my_songs', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT * FROM my_songs WHERE user_id = auth.uid() ORDER BY created_at DESC
    ) t
  ),
  'user_settings', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT * FROM user_settings WHERE user_id = auth.uid()
    ) t
  ),
  'tutorial_progress', (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT * FROM tutorial_progress WHERE user_id = auth.uid()
    ) t
  ),
  'statistics', (
    SELECT json_build_object(
      'practice_summary', (
        SELECT json_build_object(
          'total_sessions', COUNT(*),
          'total_minutes', COALESCE(SUM(duration_minutes), 0),
          'total_hours', ROUND(COALESCE(SUM(duration_minutes), 0) / 60.0, 2),
          'average_minutes_per_session', ROUND(COALESCE(AVG(duration_minutes), 0), 2),
          'first_practice_date', MIN(practice_date),
          'last_practice_date', MAX(practice_date),
          'total_days_practiced', COUNT(DISTINCT practice_date)
        )
        FROM practice_sessions
        WHERE user_id = auth.uid()
      ),
      'goals_summary', (
        SELECT json_build_object(
          'total_goals', COUNT(*),
          'active_goals', COUNT(*) FILTER (WHERE is_active = true AND (is_completed = false OR is_completed IS NULL)),
          'completed_goals', COUNT(*) FILTER (WHERE is_completed = true),
          'average_progress', ROUND(COALESCE(AVG(progress_percentage), 0), 2)
        )
        FROM goals
        WHERE user_id = auth.uid()
      ),
      'recordings_summary', (
        SELECT json_build_object(
          'total_recordings', COUNT(*),
          'total_duration_seconds', COALESCE(SUM(duration_seconds), 0),
          'total_duration_hours', ROUND(COALESCE(SUM(duration_seconds), 0) / 3600.0, 2)
        )
        FROM recordings
        WHERE user_id = auth.uid()
      )
    )
  )
) AS all_user_data;

