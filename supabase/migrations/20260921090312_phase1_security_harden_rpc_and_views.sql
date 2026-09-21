-- Phase 1 security hardening
-- 1) RPC: arbitrary user_id で他人データを読める SECURITY DEFINER を塞ぐ
-- 2) Trigger 用関数の RPC 実行権限を剥奪
-- 3) Stats view を security_invoker にして RLS を効かせる
-- 4) 個人データ系テーブルから anon の過剰 GRANT を剥奪（RLS があっても攻撃面を縮小）

-- ---------------------------------------------------------------------------
-- 1. get_total_practice_time: 自分のデータのみ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_total_practice_time(
  p_user_id uuid,
  p_instrument_id uuid DEFAULT NULL::uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_total INTEGER;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- クライアントが別ユーザーIDを指定しても拒否
  IF p_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_instrument_id IS NULL THEN
    SELECT COALESCE(SUM(duration_minutes), 0)::INTEGER
    INTO v_total
    FROM public.practice_sessions
    WHERE user_id = v_uid
      AND instrument_id IS NULL
      AND (input_method IS NULL OR input_method != 'preset');
  ELSE
    SELECT COALESCE(SUM(duration_minutes), 0)::INTEGER
    INTO v_total
    FROM public.practice_sessions
    WHERE user_id = v_uid
      AND instrument_id = p_instrument_id
      AND (input_method IS NULL OR input_method != 'preset');
  END IF;

  RETURN COALESCE(v_total, 0);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. get_practice_statistics: 自分のデータのみ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_practice_statistics(
  p_user_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL::date
)
RETURNS TABLE(total_minutes numeric, practice_days integer, avg_minutes_per_day numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(ps.duration_minutes), 0)::NUMERIC as total_minutes,
    COUNT(DISTINCT ps.practice_date)::INTEGER as practice_days,
    CASE
      WHEN COUNT(DISTINCT ps.practice_date) > 0
      THEN COALESCE(SUM(ps.duration_minutes), 0)::NUMERIC / COUNT(DISTINCT ps.practice_date)
      ELSE 0
    END as avg_minutes_per_day
  FROM public.practice_sessions ps
  WHERE ps.user_id = v_uid
    AND ps.practice_date >= p_start_date
    AND (p_end_date IS NULL OR ps.practice_date <= p_end_date);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. can_register_attendance: search_path 固定（ロジックは変更なし）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_register_attendance(practice_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
BEGIN
  RETURN NOW() >= (practice_date - INTERVAL '3 days')::TIMESTAMP
    AND NOW() <= (practice_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMP;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. RPC 実行権限の整理
-- ---------------------------------------------------------------------------
-- 未ログインから呼べないようにする
REVOKE ALL ON FUNCTION public.get_total_practice_time(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_practice_statistics(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_register_attendance(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_timestamp() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_total_practice_time(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_practice_statistics(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_register_attendance(date) TO authenticated;
-- set_timestamp はトリガー専用（API から呼べない）

-- ---------------------------------------------------------------------------
-- 5. Stats views: SECURITY INVOKER（呼び出し元の RLS を適用）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.goals_overview
WITH (security_invoker = true)
AS
SELECT user_id,
  count(*) FILTER (WHERE is_completed = false) AS active_goals,
  count(*) FILTER (WHERE is_completed = true) AS completed_goals,
  count(*) FILTER (WHERE goal_type = 'personal_short'::text) AS short_term_goals,
  count(*) FILTER (WHERE goal_type = 'personal_long'::text) AS long_term_goals,
  count(*) FILTER (WHERE goal_type = 'group'::text) AS group_goals,
  avg(progress_percentage) FILTER (WHERE is_completed = false) AS average_progress
FROM public.goals
GROUP BY user_id;

CREATE OR REPLACE VIEW public.my_songs_stats
WITH (security_invoker = true)
AS
SELECT user_id,
  count(*) AS total_songs,
  count(*) FILTER (WHERE status = 'want_to_play'::text) AS want_to_play_count,
  count(*) FILTER (WHERE status = 'learning'::text) AS learning_count,
  count(*) FILTER (WHERE status = 'played'::text) AS played_count,
  count(*) FILTER (WHERE status = 'mastered'::text) AS mastered_count,
  count(*) FILTER (WHERE difficulty = 'beginner'::text) AS beginner_count,
  count(*) FILTER (WHERE difficulty = 'intermediate'::text) AS intermediate_count,
  count(*) FILTER (WHERE difficulty = 'advanced'::text) AS advanced_count
FROM public.my_songs
GROUP BY user_id;

CREATE OR REPLACE VIEW public.note_training_stats
WITH (security_invoker = true)
AS
SELECT user_id,
  count(*) AS total_plays,
  avg(score) AS average_score,
  max(score) AS best_score,
  avg(correct_count::numeric / NULLIF(total_count, 0)::numeric) * 100::numeric AS accuracy_percentage,
  avg(max_streak) AS average_max_streak,
  sum(play_time) AS total_play_time
FROM public.note_training_results
GROUP BY user_id;

-- view は SELECT のみ認証ユーザーへ
REVOKE ALL ON public.goals_overview FROM PUBLIC, anon;
REVOKE ALL ON public.my_songs_stats FROM PUBLIC, anon;
REVOKE ALL ON public.note_training_stats FROM PUBLIC, anon;
GRANT SELECT ON public.goals_overview TO authenticated;
GRANT SELECT ON public.my_songs_stats TO authenticated;
GRANT SELECT ON public.note_training_stats TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. 個人データ系: anon からテーブル権限を剥奪（RLS の二重防御）
--    公開マスタ（instruments 等）は触らない
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_profiles',
    'user_settings',
    'user_subscriptions',
    'recordings',
    'practice_sessions',
    'practice_schedules',
    'practice_statistics',
    'goals',
    'sub_goals',
    'my_songs',
    'note_training_results',
    'audio_memos',
    'ai_chat_history',
    'admin_roles',
    'attendance_records',
    'events',
    'feedback',
    'room_members',
    'rooms',
    'scores',
    'score_comments',
    'score_edits',
    'user_favorite_songs',
    'user_group_memberships',
    'user_instrument_profiles',
    'user_custom_instruments',
    'organizations',
    'affiliations',
    'sub_groups',
    'target_songs',
    'tasks'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind IN ('r', 'v')
    ) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;
