-- ============================================
-- クイックエクスポート：ユーザー別練習時間集計（CSV形式）
-- ============================================
-- このクエリをSupabaseダッシュボードのSQL Editorで実行して、
-- 結果を「Download CSV」ボタンでダウンロードしてください
-- ============================================

SELECT 
  up.user_id AS ユーザーID,
  COALESCE(up.display_name, '未設定') AS ユーザー名,
  COUNT(DISTINCT ps.practice_date) AS 練習日数,
  COUNT(ps.id) AS 練習回数,
  SUM(ps.duration_minutes) AS 合計練習時間_分,
  ROUND(SUM(ps.duration_minutes) / 60.0, 2) AS 合計練習時間_時間,
  ROUND(AVG(ps.duration_minutes), 2) AS 平均練習時間_分,
  MIN(ps.practice_date) AS 初回練習日,
  MAX(ps.practice_date) AS 最終練習日,
  up.created_at AS アカウント作成日
FROM user_profiles up
LEFT JOIN practice_sessions ps ON up.user_id = ps.user_id
GROUP BY up.user_id, up.display_name, up.created_at
ORDER BY SUM(ps.duration_minutes) DESC NULLS LAST;

