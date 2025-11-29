-- ============================================
-- 登録ユーザー一覧を確認するSQLクエリ
-- ============================================
-- SupabaseダッシュボードのSQL Editorで実行してください
-- ============================================

-- 認証ユーザーとプロフィール情報を結合して表示
SELECT 
  u.id AS user_id,
  u.email,
  u.created_at AS user_created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  p.id AS profile_id,
  p.display_name,
  p.selected_instrument_id,
  p.practice_level,
  p.total_practice_minutes,
  p.created_at AS profile_created_at,
  p.updated_at AS profile_updated_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC;

-- ユーザー数とプロフィール数の統計
SELECT 
  COUNT(DISTINCT u.id) AS total_users,
  COUNT(DISTINCT p.id) AS total_profiles,
  COUNT(DISTINCT CASE WHEN p.selected_instrument_id IS NOT NULL THEN p.id END) AS users_with_instrument
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id;

