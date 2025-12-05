-- ============================================
-- クイックエクスポート：練習記録（CSV形式）
-- ============================================
-- このクエリをSupabaseダッシュボードのSQL Editorで実行して、
-- 結果を「Download CSV」ボタンでダウンロードしてください
-- ============================================

SELECT 
  ps.id,
  ps.user_id,
  COALESCE(up.display_name, '未設定') AS user_name,
  ps.practice_date AS 練習日,
  ps.duration_minutes AS 練習時間_分,
  ROUND(ps.duration_minutes / 60.0, 2) AS 練習時間_時間,
  ps.content AS 練習内容,
  CASE ps.input_method
    WHEN 'manual' THEN '手動入力'
    WHEN 'preset' THEN 'プリセット'
    WHEN 'voice' THEN '音声入力'
    WHEN 'timer' THEN 'タイマー'
    ELSE ps.input_method
  END AS 入力方法,
  COALESCE(i.name, '未設定') AS 楽器名,
  ps.created_at AS 作成日時
FROM practice_sessions ps
LEFT JOIN user_profiles up ON ps.user_id = up.user_id
LEFT JOIN instruments i ON ps.instrument_id = i.id
ORDER BY ps.practice_date DESC, ps.created_at DESC;

