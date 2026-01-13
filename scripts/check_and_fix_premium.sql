-- ============================================
-- プレミアム状態の確認と修正（izurutest5@gmail.com用）
-- ============================================
-- 日付: 2026-01-13
-- 目的: プレミアム状態を確認し、問題があれば修正
-- ============================================

-- ============================================
-- ステップ1: 現在の状態を詳細に確認
-- ============================================
SELECT 
  u.id as user_id,
  u.email,
  s.id as subscription_id,
  s.plan,
  s.is_active,
  s.current_period_end,
  s.canceled_at,
  NOW() as current_time,
  s.current_period_end - NOW() as time_until_expiry,
  -- プレミアム有効かどうか（アプリ側のロジックと同じ）
  CASE 
    WHEN s.is_active = true 
         AND s.current_period_end IS NOT NULL 
         AND s.current_period_end >= NOW() 
    THEN '✅ プレミアム有効'
    WHEN s.is_active = true 
         AND s.current_period_end IS NOT NULL 
         AND s.current_period_end < NOW() 
    THEN '❌ プレミアム期限切れ'
    WHEN s.is_active = false 
    THEN '❌ フリープラン（is_active = false）'
    WHEN s.id IS NULL
    THEN '❌ サブスクリプションレコードなし'
    ELSE '❌ 状態不明'
  END as subscription_status
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON u.id = s.user_id
WHERE u.email = 'izurutest5@gmail.com';

-- ============================================
-- ステップ2: 強制的にプレミアムに設定
-- ============================================
-- 既存のレコードを削除してから新規作成（確実に設定するため）

-- 既存レコードを削除
DELETE FROM public.user_subscriptions
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'izurutest5@gmail.com'
);

-- 新規レコードを作成（プレミアム月額、1ヶ月間有効）
INSERT INTO public.user_subscriptions (
  user_id,
  plan,
  is_active,
  current_period_end,
  canceled_at,
  created_at,
  updated_at
)
SELECT 
  id,
  'premium_monthly',
  true,
  (NOW() + INTERVAL '1 month')::timestamptz,
  NULL,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'izurutest5@gmail.com';

-- ============================================
-- ステップ3: 設定後の状態を再確認
-- ============================================
SELECT 
  u.id as user_id,
  u.email,
  s.id as subscription_id,
  s.plan,
  s.is_active,
  s.current_period_end,
  s.canceled_at,
  NOW() as current_time,
  s.current_period_end - NOW() as time_until_expiry,
  CASE 
    WHEN s.is_active = true 
         AND s.current_period_end IS NOT NULL 
         AND s.current_period_end >= NOW() 
    THEN '✅ プレミアム有効'
    ELSE '❌ フリープラン'
  END as subscription_status
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON u.id = s.user_id
WHERE u.email = 'izurutest5@gmail.com';

-- ============================================
-- 確認ポイント
-- ============================================
-- 上記のクエリ結果で以下を確認してください：
-- 
-- ✅ 正常な場合：
-- - subscription_id が NULL でない
-- - plan が 'premium_monthly'
-- - is_active が true
-- - current_period_end が未来の日付（例: 2026-02-13 以降）
-- - subscription_status が '✅ プレミアム有効'
--
-- ❌ 問題がある場合：
-- - subscription_id が NULL → レコードが作成されていない
-- - is_active が false → フラグが false になっている
-- - current_period_end が過去の日付 → 期限切れ
--
-- データベース側が正常な場合、アプリ側で以下を試してください：
-- 1. ブラウザのキャッシュを完全にクリア（Ctrl+Shift+Delete）
-- 2. ハードリロード（Ctrl+F5 または Cmd+Shift+R）
-- 3. 開発者ツール（F12）のコンソールで以下を実行：
--    localStorage.clear();
--    location.reload();
