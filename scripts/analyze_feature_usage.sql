-- 機能利用ログ集計（Supabase SQL Editor で実行）
-- 方針: 画面表示は自動 / 操作は「成果」のみ（開始と停止の二重計測はしない）
-- Excel: 結果の「Download CSV」→ Excel / Google スプレッドシートで開く

-- 1. 機能別 画面表示・操作 件数（直近30日）※件数がある機能だけ
SELECT
  feature_id,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM public.feature_usage_events
WHERE created_at >= now() - interval '30 days'
GROUP BY feature_id, event_type
ORDER BY event_count DESC;

-- 1b. 全機能 × screen_view/action（0件も含む）※削減検討・Excel分析向け
-- アプリ定義の feature_id 一覧を基準に LEFT JOIN
WITH feature_catalog AS (
  SELECT * FROM (VALUES
    ('calendar'),
    ('timer'),
    ('goals'),
    ('tuner'),
    ('settings'),
    ('basic_practice'),
    ('beginner_guide'),
    ('music_dictionary'),
    ('statistics'),
    ('score_auto_scroll'),
    ('profile_settings'),
    ('my_library'),
    ('recordings_library'),
    ('instrument_selection'),
    ('major_settings'),
    ('appearance_settings'),
    ('notification_settings'),
    ('privacy_settings'),
    ('app_guide'),
    ('tutorial'),
    ('pricing_plans'),
    ('support'),
    ('representative_songs'),
    ('add_goal'),
    ('auth_login'),
    ('auth_signup'),
    ('learning_tools'),
    ('help_support'),
    ('feedback'),
    ('note_training'),
    ('legal_info')
  ) AS t(feature_id)
),
event_types AS (
  SELECT * FROM (VALUES ('screen_view'), ('action')) AS t(event_type)
),
matrix AS (
  SELECT f.feature_id, e.event_type
  FROM feature_catalog f
  CROSS JOIN event_types e
),
agg AS (
  SELECT
    feature_id,
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
  FROM public.feature_usage_events
  WHERE created_at >= now() - interval '30 days'
  GROUP BY feature_id, event_type
)
SELECT
  m.feature_id,
  m.event_type,
  COALESCE(a.event_count, 0) AS event_count,
  COALESCE(a.unique_users, 0) AS unique_users,
  CASE WHEN COALESCE(a.event_count, 0) = 0 THEN 'unused' ELSE 'used' END AS usage_status
FROM matrix m
LEFT JOIN agg a
  ON a.feature_id = m.feature_id
 AND a.event_type = m.event_type
ORDER BY
  COALESCE(a.event_count, 0) ASC,  -- 0件（未使用候補）を上に
  m.feature_id,
  m.event_type;

-- 2. 主要アクション別 件数（直近30日）※機能削減判断用
SELECT
  event_name,
  platform,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM public.feature_usage_events
WHERE event_type = 'action'
  AND created_at >= now() - interval '30 days'
GROUP BY event_name, platform
ORDER BY event_count DESC;

-- 3. 日別 アクティブユーザー数
SELECT
  date_trunc('day', created_at AT TIME ZONE 'Asia/Tokyo') AS day_jst,
  COUNT(DISTINCT user_id) AS dau
FROM public.feature_usage_events
WHERE created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- 4. 機能別 利用率（ログがあるユーザー全体に対する割合）※0件も含む
WITH feature_catalog AS (
  SELECT * FROM (VALUES
    ('calendar'),
    ('timer'),
    ('goals'),
    ('tuner'),
    ('settings'),
    ('basic_practice'),
    ('beginner_guide'),
    ('music_dictionary'),
    ('statistics'),
    ('score_auto_scroll'),
    ('profile_settings'),
    ('my_library'),
    ('recordings_library'),
    ('instrument_selection'),
    ('major_settings'),
    ('appearance_settings'),
    ('notification_settings'),
    ('privacy_settings'),
    ('app_guide'),
    ('tutorial'),
    ('pricing_plans'),
    ('support'),
    ('representative_songs'),
    ('add_goal'),
    ('auth_login'),
    ('auth_signup'),
    ('learning_tools'),
    ('help_support'),
    ('feedback'),
    ('note_training'),
    ('legal_info')
  ) AS t(feature_id)
),
users_with_events AS (
  SELECT DISTINCT user_id FROM public.feature_usage_events
  WHERE created_at >= now() - interval '30 days'
),
feature_users AS (
  SELECT feature_id, COUNT(DISTINCT user_id) AS users
  FROM public.feature_usage_events
  WHERE created_at >= now() - interval '30 days'
  GROUP BY feature_id
)
SELECT
  c.feature_id,
  COALESCE(f.users, 0) AS users,
  (SELECT COUNT(*) FROM users_with_events) AS total_active_users,
  ROUND(
    100.0 * COALESCE(f.users, 0) / NULLIF((SELECT COUNT(*) FROM users_with_events), 0),
    1
  ) AS usage_pct
FROM feature_catalog c
LEFT JOIN feature_users f ON f.feature_id = c.feature_id
ORDER BY COALESCE(f.users, 0) ASC, c.feature_id;

-- 5. 成果アクション一覧（機能削減の本命指標）
SELECT
  event_name,
  platform,
  COUNT(*) AS cnt,
  COUNT(DISTINCT user_id) AS unique_users
FROM public.feature_usage_events
WHERE event_name IN (
  'tuner.start_listening',
  'calendar.save_recording',
  'calendar.quick_record',
  'recordings_library.play',
  'timer.save',
  'goals.create',
  'goals.update',
  'goals.complete',
  'basic_practice.mark_done',
  'pricing_plans.purchase'
)
AND created_at >= now() - interval '30 days'
GROUP BY event_name, platform
ORDER BY cnt DESC;
