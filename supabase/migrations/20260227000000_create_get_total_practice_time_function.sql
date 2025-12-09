-- ============================================
-- 総練習時間を取得するRPC関数（パフォーマンス最適化）
-- ============================================
-- 実行日: 2026-02-27
-- ============================================
-- この関数は、サーバー側で集計を行うことで
-- クライアント側での計算を不要にし、パフォーマンスを大幅に向上させます
-- ============================================

-- 総練習時間を取得する関数（サーバー側で集計）
CREATE OR REPLACE FUNCTION get_total_practice_time(
  p_user_id UUID,
  p_instrument_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  -- 楽器IDが指定されている場合と指定されていない場合で分岐
  -- 基礎練（input_method = 'preset'）は除外
  IF p_instrument_id IS NULL THEN
    -- 楽器IDがNULLの練習セッションのみを集計（基礎練を除外）
    SELECT COALESCE(SUM(duration_minutes), 0)::INTEGER
    INTO v_total
    FROM practice_sessions
    WHERE user_id = p_user_id
      AND instrument_id IS NULL
      AND (input_method IS NULL OR input_method != 'preset');
  ELSE
    -- 指定された楽器IDの練習セッションを集計（基礎練を除外）
    SELECT COALESCE(SUM(duration_minutes), 0)::INTEGER
    INTO v_total
    FROM practice_sessions
    WHERE user_id = p_user_id
      AND instrument_id = p_instrument_id
      AND (input_method IS NULL OR input_method != 'preset');
  END IF;
  
  RETURN COALESCE(v_total, 0);
END;
$$;

-- 関数にコメントを追加
COMMENT ON FUNCTION get_total_practice_time IS '指定されたユーザーと楽器の総練習時間（分）を取得する関数。サーバー側で集計を行うことで、クライアント側での計算を不要にし、パフォーマンスを大幅に向上させます。';

-- 匿名ユーザーと認証ユーザーがこの関数を実行できるように権限を付与
GRANT EXECUTE ON FUNCTION get_total_practice_time(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_total_practice_time(UUID, UUID) TO authenticated;

-- インデックスの確認と作成（パフォーマンス向上のため）
-- user_idとinstrument_idの組み合わせでクエリが高速化される
DO $$
BEGIN
  -- user_idとinstrument_idの複合インデックスが存在するか確認
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'practice_sessions'
      AND indexname = 'idx_practice_sessions_user_instrument'
  ) THEN
    -- インデックスが存在しない場合は作成
    CREATE INDEX idx_practice_sessions_user_instrument
    ON practice_sessions(user_id, instrument_id)
    WHERE duration_minutes IS NOT NULL;
    
    RAISE NOTICE 'インデックス idx_practice_sessions_user_instrument を作成しました';
  ELSE
    RAISE NOTICE 'インデックス idx_practice_sessions_user_instrument は既に存在します';
  END IF;
END $$;


