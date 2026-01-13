-- ============================================
-- プレミアムサブスクリプション設定（izurutest5@mail.com用）
-- ============================================
-- 日付: 2026-01-13
-- 目的: izurutest5@mail.com をプレミアム状態に設定
-- ============================================

-- ============================================
-- ステップ1: 現在の状態を確認
-- ============================================
SELECT 
  u.id as user_id,
  u.email,
  s.plan,
  s.is_active,
  s.current_period_end,
  CASE 
    WHEN s.is_active = true AND s.current_period_end >= NOW() THEN 'プレミアム有効'
    ELSE 'フリープラン'
  END as subscription_status
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON u.id = s.user_id
WHERE u.email = 'izurutest5@mail.com';

-- ============================================
-- ステップ2: プレミアム（月額）に設定
-- ============================================
-- 以下のSQLを実行すると、izurutest5@mail.com がプレミアム（月額）になります

UPDATE public.user_subscriptions
SET 
  plan = 'premium_monthly',
  is_active = true,
  current_period_end = (NOW() + INTERVAL '1 month')::timestamptz,
  canceled_at = NULL,
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'izurutest5@mail.com'
);

-- サブスクリプションレコードが存在しない場合は作成
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
WHERE email = 'izurutest5@mail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.users.id
  )
ON CONFLICT (user_id) DO UPDATE
SET 
  plan = EXCLUDED.plan,
  is_active = EXCLUDED.is_active,
  current_period_end = EXCLUDED.current_period_end,
  canceled_at = EXCLUDED.canceled_at,
  updated_at = NOW();

-- ============================================
-- ステップ3: 設定後の状態を確認
-- ============================================
SELECT 
  u.id as user_id,
  u.email,
  s.plan,
  s.is_active,
  s.current_period_end,
  CASE 
    WHEN s.is_active = true AND s.current_period_end >= NOW() THEN 'プレミアム有効'
    ELSE 'フリープラン'
  END as subscription_status
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON u.id = s.user_id
WHERE u.email = 'izurutest5@mail.com';

-- ============================================
-- フリープランに戻す場合
-- ============================================
-- テスト完了後、以下のSQLでフリープランに戻せます

-- UPDATE public.user_subscriptions
-- SET 
--   plan = 'free',
--   is_active = false,
--   current_period_end = NULL,
--   canceled_at = NOW(),
--   updated_at = NOW()
-- WHERE user_id = (
--   SELECT id FROM auth.users WHERE email = 'izurutest5@mail.com'
-- );
