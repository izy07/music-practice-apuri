-- ============================================
-- サブスクリプション状態の確認スクリプト
-- ============================================
-- 目的: プレミアムプランなのにフリープランの制限が適用される問題を調査
-- ============================================

-- 現在のサブスクリプション状態を確認
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
ORDER BY u.created_at DESC
LIMIT 10;

-- 特定のユーザーの状態を確認する場合（メールアドレスを指定）
-- WHERE u.email = 'your-email@example.com';
