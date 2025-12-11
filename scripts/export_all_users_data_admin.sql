-- ============================================
-- 管理者用：全ユーザーデータエクスポートSQLクエリ
-- ============================================
-- ⚠️ 重要: このスクリプトは管理者権限で実行してください
-- SupabaseダッシュボードのSQL Editorで実行すると、RLSをバイパスして全データにアクセスできます
-- ============================================
-- 使用方法:
-- 1. Supabaseダッシュボードにログイン
-- 2. SQL Editorを開く
-- 3. このスクリプトを実行
-- 4. 結果をCSVまたはJSON形式でエクスポート
-- ============================================

-- ============================================
-- 1. 全ユーザープロフィール情報
-- ============================================
SELECT 
  'user_profiles' AS table_name,
  COUNT(*) AS total_records,
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
  ORDER BY created_at DESC
) t;

-- ============================================
-- 2. 全ユーザーの練習記録
-- ============================================
SELECT 
  'practice_sessions' AS table_name,
  COUNT(*) AS total_records,
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
  ORDER BY practice_date DESC, created_at DESC
) t;

-- ============================================
-- 3. 全ユーザーの目標
-- ============================================
SELECT 
  'goals' AS table_name,
  COUNT(*) AS total_records,
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
  ORDER BY created_at DESC
) t;

-- ============================================
-- 4. 全ユーザーのイベント
-- ============================================
SELECT 
  'events' AS table_name,
  COUNT(*) AS total_records,
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
  ORDER BY date DESC
) t;

-- ============================================
-- 5. 全ユーザーの録音データ
-- ============================================
SELECT 
  'recordings' AS table_name,
  COUNT(*) AS total_records,
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
  ORDER BY recorded_at DESC
) t;

-- ============================================
-- 6. 全ユーザーのマイソング
-- ============================================
SELECT 
  'my_songs' AS table_name,
  COUNT(*) AS total_records,
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
  ORDER BY created_at DESC
) t;

-- ============================================
-- 7. 全ユーザーの設定
-- ============================================
SELECT 
  'user_settings' AS table_name,
  COUNT(*) AS total_records,
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
  ORDER BY created_at DESC
) t;

-- ============================================
-- 8. 全ユーザーのチュートリアル進捗
-- ============================================
SELECT 
  'tutorial_progress' AS table_name,
  COUNT(*) AS total_records,
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
  ORDER BY created_at DESC
) t;

-- ============================================
-- 9. 認証ユーザー情報（メールアドレス含む）
-- ============================================
-- 注意: auth.usersテーブルは直接アクセスできない場合があります
-- Supabaseダッシュボードの「Authentication」セクションから確認してください
SELECT 
  'auth_users_summary' AS table_name,
  COUNT(*) AS total_users,
  json_agg(row_to_json(t)) AS data
FROM (
  SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at,
    phone,
    confirmed_at
  FROM auth.users
  ORDER BY created_at DESC
) t;

-- ============================================
-- 統計サマリー（全ユーザー集計）
-- ============================================

-- 全ユーザーの練習統計
SELECT 
  'all_users_practice_summary' AS summary_type,
  json_build_object(
    'total_users', COUNT(DISTINCT user_id),
    'total_sessions', COUNT(*),
    'total_minutes', COALESCE(SUM(duration_minutes), 0),
    'total_hours', ROUND(COALESCE(SUM(duration_minutes), 0) / 60.0, 2),
    'average_minutes_per_session', ROUND(COALESCE(AVG(duration_minutes), 0), 2),
    'average_sessions_per_user', ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2),
    'first_practice_date', MIN(practice_date),
    'last_practice_date', MAX(practice_date),
    'by_instrument', (
      SELECT json_agg(row_to_json(instrument_stats))
      FROM (
        SELECT 
          instrument_id,
          COUNT(*) AS session_count,
          COUNT(DISTINCT user_id) AS user_count,
          SUM(duration_minutes) AS total_minutes,
          AVG(duration_minutes) AS avg_minutes
        FROM practice_sessions
        GROUP BY instrument_id
        ORDER BY session_count DESC
      ) instrument_stats
    ),
    'by_input_method', (
      SELECT json_agg(row_to_json(method_stats))
      FROM (
        SELECT 
          input_method,
          COUNT(*) AS session_count,
          COUNT(DISTINCT user_id) AS user_count,
          SUM(duration_minutes) AS total_minutes
        FROM practice_sessions
        GROUP BY input_method
        ORDER BY session_count DESC
      ) method_stats
    ),
    'top_users_by_practice_time', (
      SELECT json_agg(row_to_json(user_stats))
      FROM (
        SELECT 
          user_id,
          COUNT(*) AS session_count,
          SUM(duration_minutes) AS total_minutes,
          ROUND(AVG(duration_minutes), 2) AS avg_minutes_per_session
        FROM practice_sessions
        GROUP BY user_id
        ORDER BY total_minutes DESC
        LIMIT 10
      ) user_stats
    )
  ) AS data
FROM practice_sessions;

-- 全ユーザーの目標統計
SELECT 
  'all_users_goals_summary' AS summary_type,
  json_build_object(
    'total_users_with_goals', COUNT(DISTINCT user_id),
    'total_goals', COUNT(*),
    'active_goals', COUNT(*) FILTER (WHERE is_active = true AND (is_completed = false OR is_completed IS NULL)),
    'completed_goals', COUNT(*) FILTER (WHERE is_completed = true),
    'average_progress', ROUND(COALESCE(AVG(progress_percentage), 0), 2),
    'average_goals_per_user', ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2),
    'by_goal_type', (
      SELECT json_agg(row_to_json(type_stats))
      FROM (
        SELECT 
          goal_type,
          COUNT(*) AS count,
          COUNT(DISTINCT user_id) AS user_count,
          AVG(progress_percentage) AS avg_progress
        FROM goals
        GROUP BY goal_type
      ) type_stats
    )
  ) AS data
FROM goals;

-- 全ユーザーの録音統計
SELECT 
  'all_users_recordings_summary' AS summary_type,
  json_build_object(
    'total_users_with_recordings', COUNT(DISTINCT user_id),
    'total_recordings', COUNT(*),
    'total_duration_seconds', COALESCE(SUM(duration_seconds), 0),
    'total_duration_hours', ROUND(COALESCE(SUM(duration_seconds), 0) / 3600.0, 2),
    'favorite_count', COUNT(*) FILTER (WHERE is_favorite = true),
    'average_recordings_per_user', ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2)
  ) AS data
FROM recordings;

-- ============================================
-- CSV形式でエクスポートする場合のクエリ例
-- ============================================
-- 以下のクエリを実行すると、CSV形式でダウンロードできます
-- ============================================

-- 練習記録をCSV形式で（Supabaseダッシュボードで「Download CSV」ボタンを使用）
SELECT 
  ps.id,
  ps.user_id,
  up.display_name,
  ps.practice_date,
  ps.duration_minutes,
  ps.content,
  ps.input_method,
  i.name AS instrument_name,
  ps.created_at
FROM practice_sessions ps
LEFT JOIN user_profiles up ON ps.user_id = up.user_id
LEFT JOIN instruments i ON ps.instrument_id = i.id
ORDER BY ps.practice_date DESC, ps.created_at DESC;

-- ユーザー別の練習時間集計（CSV形式）
SELECT 
  up.user_id,
  up.display_name,
  up.email,
  COUNT(DISTINCT ps.practice_date) AS days_practiced,
  COUNT(ps.id) AS total_sessions,
  SUM(ps.duration_minutes) AS total_minutes,
  ROUND(SUM(ps.duration_minutes) / 60.0, 2) AS total_hours,
  ROUND(AVG(ps.duration_minutes), 2) AS avg_minutes_per_session,
  MIN(ps.practice_date) AS first_practice_date,
  MAX(ps.practice_date) AS last_practice_date
FROM user_profiles up
LEFT JOIN practice_sessions ps ON up.user_id = ps.user_id
GROUP BY up.user_id, up.display_name, up.email
ORDER BY total_minutes DESC;

-- 目標達成状況（CSV形式）
SELECT 
  g.user_id,
  up.display_name,
  g.title,
  g.goal_type,
  g.progress_percentage,
  g.is_completed,
  g.target_date,
  g.created_at
FROM goals g
LEFT JOIN user_profiles up ON g.user_id = up.user_id
ORDER BY g.created_at DESC;




