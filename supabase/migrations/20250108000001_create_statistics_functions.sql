-- ============================================
-- 統計集計処理をDB側へ移行
-- ============================================
-- 日付: 2025-01-08
-- 目的: TypeScript側の集計処理をSupabase関数に移行してパフォーマンスを向上

-- ============================================
-- 1. 日別統計集計関数
-- ============================================
CREATE OR REPLACE FUNCTION get_daily_practice_stats(
  p_user_id uuid,
  p_instrument_id uuid DEFAULT NULL,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  practice_date date,
  total_minutes numeric,
  record_count bigint,
  has_basic_practice boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.practice_date::date,
    COALESCE(SUM(ps.duration_minutes), 0)::numeric AS total_minutes,
    COUNT(*)::bigint AS record_count,
    BOOL_OR(ps.input_method = 'preset') AS has_basic_practice
  FROM practice_sessions ps
  WHERE ps.user_id = p_user_id
    AND ps.practice_date >= p_start_date
    AND ps.practice_date <= p_end_date
    AND (p_instrument_id IS NULL OR ps.instrument_id = p_instrument_id OR (p_instrument_id IS NULL AND ps.instrument_id IS NULL))
    AND ps.input_method != 'preset' -- 基礎練は時間に含めない
  GROUP BY ps.practice_date
  ORDER BY ps.practice_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_daily_practice_stats IS '日別練習統計を集計（楽器フィルタリング対応）';

-- ============================================
-- 2. 週別統計集計関数
-- ============================================
CREATE OR REPLACE FUNCTION get_weekly_practice_stats(
  p_user_id uuid,
  p_instrument_id uuid DEFAULT NULL,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  week_start date,
  total_minutes numeric,
  record_count bigint,
  practice_days bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('week', ps.practice_date)::date AS week_start,
    COALESCE(SUM(ps.duration_minutes), 0)::numeric AS total_minutes,
    COUNT(*)::bigint AS record_count,
    COUNT(DISTINCT ps.practice_date)::bigint AS practice_days
  FROM practice_sessions ps
  WHERE ps.user_id = p_user_id
    AND ps.practice_date >= p_start_date
    AND ps.practice_date <= p_end_date
    AND (p_instrument_id IS NULL OR ps.instrument_id = p_instrument_id OR (p_instrument_id IS NULL AND ps.instrument_id IS NULL))
    AND ps.input_method != 'preset' -- 基礎練は時間に含めない
  GROUP BY DATE_TRUNC('week', ps.practice_date)
  ORDER BY week_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_weekly_practice_stats IS '週別練習統計を集計（楽器フィルタリング対応）';

-- ============================================
-- 3. 月別統計集計関数
-- ============================================
CREATE OR REPLACE FUNCTION get_monthly_practice_stats(
  p_user_id uuid,
  p_instrument_id uuid DEFAULT NULL,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  year_month text,
  total_minutes numeric,
  record_count bigint,
  practice_days bigint,
  avg_minutes_per_day numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(ps.practice_date, 'YYYY-MM') AS year_month,
    COALESCE(SUM(ps.duration_minutes), 0)::numeric AS total_minutes,
    COUNT(*)::bigint AS record_count,
    COUNT(DISTINCT ps.practice_date)::bigint AS practice_days,
    CASE 
      WHEN COUNT(DISTINCT ps.practice_date) > 0 
      THEN COALESCE(SUM(ps.duration_minutes), 0)::numeric / COUNT(DISTINCT ps.practice_date)
      ELSE 0::numeric
    END AS avg_minutes_per_day
  FROM practice_sessions ps
  WHERE ps.user_id = p_user_id
    AND ps.practice_date >= p_start_date
    AND ps.practice_date <= p_end_date
    AND (p_instrument_id IS NULL OR ps.instrument_id = p_instrument_id OR (p_instrument_id IS NULL AND ps.instrument_id IS NULL))
    AND ps.input_method != 'preset' -- 基礎練は時間に含めない
  GROUP BY TO_CHAR(ps.practice_date, 'YYYY-MM')
  ORDER BY year_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_monthly_practice_stats IS '月別練習統計を集計（楽器フィルタリング対応）';

-- ============================================
-- 4. 入力方法別統計集計関数
-- ============================================
CREATE OR REPLACE FUNCTION get_input_method_stats(
  p_user_id uuid,
  p_instrument_id uuid DEFAULT NULL,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  input_method text,
  record_count bigint,
  total_minutes numeric,
  avg_minutes numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ps.input_method, 'その他')::text AS input_method,
    COUNT(*)::bigint AS record_count,
    COALESCE(SUM(ps.duration_minutes), 0)::numeric AS total_minutes,
    CASE 
      WHEN COUNT(*) > 0 
      THEN COALESCE(SUM(ps.duration_minutes), 0)::numeric / COUNT(*)
      ELSE 0::numeric
    END AS avg_minutes
  FROM practice_sessions ps
  WHERE ps.user_id = p_user_id
    AND ps.practice_date >= p_start_date
    AND ps.practice_date <= p_end_date
    AND (p_instrument_id IS NULL OR ps.instrument_id = p_instrument_id OR (p_instrument_id IS NULL AND ps.instrument_id IS NULL))
    AND ps.input_method != 'preset' -- 基礎練は統計に含めない
  GROUP BY ps.input_method
  ORDER BY total_minutes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_input_method_stats IS '入力方法別統計を集計（楽器フィルタリング対応）';

-- ============================================
-- 5. 総合統計集計関数
-- ============================================
CREATE OR REPLACE FUNCTION get_practice_summary_stats(
  p_user_id uuid,
  p_instrument_id uuid DEFAULT NULL,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  total_minutes numeric,
  total_records bigint,
  total_days bigint,
  avg_minutes_per_day numeric,
  longest_session_minutes numeric,
  most_active_day date
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      ps.practice_date,
      SUM(ps.duration_minutes) AS daily_minutes,
      COUNT(*) AS daily_count
    FROM practice_sessions ps
    WHERE ps.user_id = p_user_id
      AND ps.practice_date >= p_start_date
      AND ps.practice_date <= p_end_date
      AND (p_instrument_id IS NULL OR ps.instrument_id = p_instrument_id OR (p_instrument_id IS NULL AND ps.instrument_id IS NULL))
      AND ps.input_method != 'preset' -- 基礎練は時間に含めない
    GROUP BY ps.practice_date
  )
  SELECT 
    COALESCE(SUM(daily_minutes), 0)::numeric AS total_minutes,
    COALESCE(SUM(daily_count), 0)::bigint AS total_records,
    COUNT(DISTINCT practice_date)::bigint AS total_days,
    CASE 
      WHEN COUNT(DISTINCT practice_date) > 0 
      THEN COALESCE(SUM(daily_minutes), 0)::numeric / COUNT(DISTINCT practice_date)
      ELSE 0::numeric
    END AS avg_minutes_per_day,
    COALESCE(MAX(daily_minutes), 0)::numeric AS longest_session_minutes,
    (SELECT practice_date FROM daily_stats ORDER BY daily_minutes DESC LIMIT 1) AS most_active_day
  FROM daily_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_practice_summary_stats IS '総合統計を集計（楽器フィルタリング対応）';

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '統計集計関数の作成が完了しました';
END $$;

