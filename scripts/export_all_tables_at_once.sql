-- ============================================
-- 全テーブル一括エクスポート用SQL
-- ============================================
-- このスクリプトは、全てのユーザーデータテーブルを一度に取得します
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ============================================
-- 注意: 各テーブルごとに個別のクエリを実行する必要があります
-- 各クエリの結果を「Download CSV」ボタンでダウンロードしてください
-- ============================================

-- ============================================
-- 1. ユーザープロフィール（user_profiles）
-- ============================================
SELECT 
  id,
  user_id AS ユーザーID,
  display_name AS 表示名,
  avatar_url AS アバターURL,
  practice_level AS 練習レベル,
  selected_instrument_id AS 選択楽器ID,
  organization AS 所属団体,
  current_organization AS 現在の所属団体,
  nickname AS ニックネーム,
  bio AS 自己紹介,
  birthday AS 生年月日,
  current_age AS 現在の年齢,
  music_start_age AS 音楽開始年齢,
  music_experience_years AS 音楽経験年数,
  total_practice_minutes AS 総練習時間_分,
  ROUND(total_practice_minutes / 60.0, 2) AS 総練習時間_時間,
  created_at AS 作成日時,
  updated_at AS 更新日時
FROM user_profiles
ORDER BY created_at DESC;

-- ============================================
-- 2. 練習記録（practice_sessions）
-- ============================================
SELECT 
  ps.id,
  ps.user_id AS ユーザーID,
  COALESCE(up.display_name, '未設定') AS ユーザー名,
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
  ps.audio_url AS 録音URL,
  ps.created_at AS 作成日時,
  ps.updated_at AS 更新日時
FROM practice_sessions ps
LEFT JOIN user_profiles up ON ps.user_id = up.user_id
LEFT JOIN instruments i ON ps.instrument_id = i.id
ORDER BY ps.practice_date DESC, ps.created_at DESC;

-- ============================================
-- 3. 目標（goals）
-- ============================================
SELECT 
  g.id,
  g.user_id AS ユーザーID,
  COALESCE(up.display_name, '未設定') AS ユーザー名,
  g.title AS タイトル,
  g.description AS 説明,
  g.target_date AS 目標日,
  CASE g.goal_type
    WHEN 'personal_short' THEN '個人短期'
    WHEN 'personal_long' THEN '個人長期'
    WHEN 'group' THEN 'グループ'
    ELSE g.goal_type
  END AS 目標タイプ,
  g.progress_percentage AS 進捗率_パーセント,
  CASE 
    WHEN g.is_active = true THEN 'アクティブ'
    ELSE '非アクティブ'
  END AS ステータス,
  CASE 
    WHEN g.is_completed = true THEN '達成済み'
    ELSE '未達成'
  END AS 達成状況,
  g.completed_at AS 達成日時,
  CASE 
    WHEN g.show_on_calendar = true THEN '表示'
    ELSE '非表示'
  END AS カレンダー表示,
  COALESCE(i.name, '未設定') AS 楽器名,
  g.created_at AS 作成日時,
  g.updated_at AS 更新日時
FROM goals g
LEFT JOIN user_profiles up ON g.user_id = up.user_id
LEFT JOIN instruments i ON g.instrument_id = i.id
ORDER BY g.created_at DESC;

-- ============================================
-- 4. イベント（events）
-- ============================================
SELECT 
  e.id,
  e.user_id AS ユーザーID,
  COALESCE(up.display_name, '未設定') AS ユーザー名,
  e.title AS タイトル,
  e.date AS イベント日,
  e.description AS 説明,
  e.practice_schedule_id AS 練習日程ID,
  e.created_at AS 作成日時,
  e.updated_at AS 更新日時
FROM events e
LEFT JOIN user_profiles up ON e.user_id = up.user_id
ORDER BY e.date DESC;

-- ============================================
-- 5. 録音データ（recordings）
-- ============================================
SELECT 
  r.id,
  r.user_id AS ユーザーID,
  COALESCE(up.display_name, '未設定') AS ユーザー名,
  r.title AS タイトル,
  r.memo AS メモ,
  r.file_path AS ファイルパス,
  r.duration_seconds AS 録音時間_秒,
  ROUND(r.duration_seconds / 60.0, 2) AS 録音時間_分,
  ROUND(r.duration_seconds / 3600.0, 2) AS 録音時間_時間,
  CASE 
    WHEN r.is_favorite = true THEN 'お気に入り'
    ELSE '通常'
  END AS お気に入り,
  COALESCE(i.name, '未設定') AS 楽器名,
  r.recorded_at AS 録音日時,
  r.created_at AS 作成日時
FROM recordings r
LEFT JOIN user_profiles up ON r.user_id = up.user_id
LEFT JOIN instruments i ON r.instrument_id = i.id
ORDER BY r.recorded_at DESC;

-- ============================================
-- 6. マイソング（my_songs）
-- ============================================
SELECT 
  ms.id,
  ms.user_id AS ユーザーID,
  COALESCE(up.display_name, '未設定') AS ユーザー名,
  ms.title AS 曲名,
  ms.artist AS アーティスト,
  ms.genre AS ジャンル,
  CASE ms.difficulty
    WHEN 'beginner' THEN '初級'
    WHEN 'intermediate' THEN '中級'
    WHEN 'advanced' THEN '上級'
    ELSE ms.difficulty
  END AS 難易度,
  CASE ms.status
    WHEN 'want_to_play' THEN 'やりたい'
    WHEN 'learning' THEN '学習中'
    WHEN 'played' THEN '演奏済み'
    WHEN 'mastered' THEN 'マスター済み'
    ELSE ms.status
  END AS ステータス,
  ms.notes AS メモ,
  ms.target_date AS 目標日,
  ms.created_at AS 作成日時,
  ms.updated_at AS 更新日時
FROM my_songs ms
LEFT JOIN user_profiles up ON ms.user_id = up.user_id
ORDER BY ms.created_at DESC;

-- ============================================
-- 7. ユーザー設定（user_settings）
-- ============================================
SELECT 
  us.id,
  us.user_id AS ユーザーID,
  COALESCE(up.display_name, '未設定') AS ユーザー名,
  CASE us.language
    WHEN 'ja' THEN '日本語'
    WHEN 'en' THEN '英語'
    ELSE us.language
  END AS 言語,
  CASE us.theme
    WHEN 'light' THEN 'ライト'
    WHEN 'dark' THEN 'ダーク'
    WHEN 'auto' THEN '自動'
    ELSE us.theme
  END AS テーマ,
  CASE 
    WHEN us.notifications_enabled = true THEN '有効'
    ELSE '無効'
  END AS 通知設定,
  us.metronome_settings AS メトロノーム設定_JSON,
  us.tuner_settings AS チューナー設定_JSON,
  us.created_at AS 作成日時,
  us.updated_at AS 更新日時
FROM user_settings us
LEFT JOIN user_profiles up ON us.user_id = up.user_id
ORDER BY us.created_at DESC;

-- ============================================
-- 8. チュートリアル進捗（tutorial_progress）
-- ============================================
SELECT 
  tp.id,
  tp.user_id AS ユーザーID,
  COALESCE(up.display_name, '未設定') AS ユーザー名,
  CASE 
    WHEN tp.is_completed = true THEN '完了'
    ELSE '未完了'
  END AS 完了状況,
  tp.completed_at AS 完了日時,
  tp.current_step AS 現在のステップ,
  tp.created_at AS 作成日時,
  tp.updated_at AS 更新日時
FROM tutorial_progress tp
LEFT JOIN user_profiles up ON tp.user_id = up.user_id
ORDER BY tp.created_at DESC;

-- ============================================
-- 9. 認証ユーザー情報（auth.users）
-- ============================================
-- 注意: このテーブルは直接アクセスできない場合があります
-- Supabaseダッシュボードの「Authentication」セクションから確認してください
SELECT 
  id AS ユーザーID,
  email AS メールアドレス,
  created_at AS アカウント作成日,
  last_sign_in_at AS 最終ログイン日時,
  email_confirmed_at AS メール確認日時,
  phone AS 電話番号,
  confirmed_at AS 確認日時
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- 10. 統計サマリー（集計データ）
-- ============================================
-- ユーザー別の練習時間集計
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

-- ============================================
-- 11. 楽器別統計
-- ============================================
SELECT 
  COALESCE(i.name, '未設定') AS 楽器名,
  COUNT(*) AS 練習回数,
  COUNT(DISTINCT ps.user_id) AS ユーザー数,
  SUM(ps.duration_minutes) AS 合計練習時間_分,
  ROUND(SUM(ps.duration_minutes) / 60.0, 2) AS 合計練習時間_時間,
  ROUND(AVG(ps.duration_minutes), 2) AS 平均練習時間_分
FROM practice_sessions ps
LEFT JOIN instruments i ON ps.instrument_id = i.id
GROUP BY i.name
ORDER BY COUNT(*) DESC;

-- ============================================
-- 12. 月別統計
-- ============================================
SELECT 
  DATE_TRUNC('month', practice_date)::date AS 年月,
  COUNT(DISTINCT user_id) AS アクティブユーザー数,
  COUNT(*) AS 練習回数,
  SUM(duration_minutes) AS 合計練習時間_分,
  ROUND(SUM(duration_minutes) / 60.0, 2) AS 合計練習時間_時間,
  ROUND(AVG(duration_minutes), 2) AS 平均練習時間_分
FROM practice_sessions
GROUP BY DATE_TRUNC('month', practice_date)
ORDER BY 年月 DESC;

-- ============================================
-- 使用方法
-- ============================================
-- 1. このファイルをSupabaseダッシュボードのSQL Editorで開く
-- 2. 各クエリ（1〜12）を個別に選択して実行
-- 3. 各結果を「Download CSV」ボタンでダウンロード
-- 4. ファイル名を分かりやすく変更（例: user_profiles.csv, practice_sessions.csv）
-- ============================================

