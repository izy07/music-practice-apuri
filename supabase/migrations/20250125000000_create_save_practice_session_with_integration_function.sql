-- ============================================
-- 練習セッション統合保存用のRPC関数（トランザクション処理）
-- ============================================
-- 実行日: 2025-01-25
-- ============================================
-- この関数は、練習セッションの更新と重複記録の削除を
-- 1つのトランザクションで実行します
-- ============================================

-- 練習セッションを統合保存する関数（トランザクション処理）
CREATE OR REPLACE FUNCTION save_practice_session_with_integration(
  p_user_id UUID,
  p_practice_date TEXT,
  p_duration_minutes INTEGER,
  p_content TEXT DEFAULT NULL,
  p_input_method TEXT DEFAULT 'manual',
  p_instrument_id UUID DEFAULT NULL,
  p_existing_session_id UUID DEFAULT NULL,
  p_duplicate_session_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_result JSON;
BEGIN
  -- トランザクション開始（関数内で自動的にトランザクション）
  
  -- 既存セッションがある場合は更新
  IF p_existing_session_id IS NOT NULL THEN
    UPDATE practice_sessions
    SET 
      duration_minutes = p_duration_minutes,
      content = p_content,
      input_method = p_input_method,
      instrument_id = p_instrument_id,
      updated_at = NOW()
    WHERE id = p_existing_session_id
      AND user_id = p_user_id;
    
    v_session_id := p_existing_session_id;
  ELSE
    -- 新規セッションを作成
    INSERT INTO practice_sessions (
      user_id,
      practice_date,
      duration_minutes,
      content,
      input_method,
      instrument_id
    ) VALUES (
      p_user_id,
      p_practice_date,
      p_duration_minutes,
      p_content,
      p_input_method,
      p_instrument_id
    )
    RETURNING id INTO v_session_id;
  END IF;
  
  -- 重複セッションを削除（配列が空でない場合のみ）
  IF array_length(p_duplicate_session_ids, 1) > 0 THEN
    DELETE FROM practice_sessions
    WHERE id = ANY(p_duplicate_session_ids)
      AND user_id = p_user_id
      AND (p_instrument_id IS NULL AND instrument_id IS NULL OR instrument_id = p_instrument_id);
  END IF;
  
  -- 結果を返す
  v_result := json_build_object(
    'success', true,
    'session_id', v_session_id,
    'deleted_count', COALESCE(array_length(p_duplicate_session_ids, 1), 0)
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生した場合はロールバック（自動）
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- 関数にコメントを追加
COMMENT ON FUNCTION save_practice_session_with_integration IS 
'練習セッションを統合保存する関数。更新と重複記録の削除を1つのトランザクションで実行します。';

-- 匿名ユーザーと認証ユーザーがこの関数を実行できるように権限を付与
GRANT EXECUTE ON FUNCTION save_practice_session_with_integration TO anon;
GRANT EXECUTE ON FUNCTION save_practice_session_with_integration TO authenticated;




