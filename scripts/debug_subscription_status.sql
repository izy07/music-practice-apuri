-- ============================================
-- サブスクリプション状態のデバッグ用SQL
-- ============================================
-- 日付: 2026-01-13
-- 目的: izurutest5@mail.com のサブスクリプション状態を詳細に確認
-- ============================================

-- ============================================
-- 1. ユーザー情報の確認
-- ============================================
SELECT 
  id as user_id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'izurutest5@mail.com';

-- ============================================
-- 2. サブスクリプション情報の確認
-- ============================================
SELECT 
  id,
  user_id,
  plan,
  is_active,
  current_period_end,
  canceled_at,
  created_at,
  updated_at,
  -- 現在時刻との比較
  NOW() as current_time,
  current_period_end - NOW() as time_until_expiry,
  -- プレミアム有効かどうか
  CASE 
    WHEN is_active = true 
         AND current_period_end IS NOT NULL 
         AND current_period_end >= NOW() 
    THEN 'プレミアム有効'
    WHEN is_active = true 
         AND current_period_end IS NOT NULL 
         AND current_period_end < NOW() 
    THEN 'プレミアム期限切れ'
    WHEN is_active = false 
    THEN 'フリープラン'
    ELSE '状態不明'
  END as subscription_status
FROM public.user_subscriptions
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'izurutest5@mail.com'
);

-- ============================================
-- 3. 結合クエリで全体を確認
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
  CASE 
    WHEN s.is_active = true 
         AND s.current_period_end IS NOT NULL 
         AND s.current_period_end >= NOW() 
    THEN 'プレミアム有効'
    WHEN s.is_active = true 
         AND s.current_period_end IS NOT NULL 
         AND s.current_period_end < NOW() 
    THEN 'プレミアム期限切れ'
    WHEN s.is_active = false 
    THEN 'フリープラン'
    WHEN s.id IS NULL
    THEN 'サブスクリプションレコードなし'
    ELSE '状態不明'
  END as subscription_status
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON u.id = s.user_id
WHERE u.email = 'izurutest5@mail.com';

-- ============================================
-- 4. 強制的にプレミアムに設定（再実行用）
-- ============================================
-- もし状態が正しくない場合は、以下のSQLを実行してください

-- まず、既存のレコードを更新
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

-- レコードが存在しない場合は作成
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
-- 5. 設定後の再確認
-- ============================================
SELECT 
  u.id as user_id,
  u.email,
  s.plan,
  s.is_active,
  s.current_period_end,
  NOW() as current_time,
  CASE 
    WHEN s.is_active = true 
         AND s.current_period_end IS NOT NULL 
         AND s.current_period_end >= NOW() 
    THEN 'プレミアム有効'
    ELSE 'フリープラン'
  END as subscription_status
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON u.id = s.user_id
WHERE u.email = 'izurutest5@mail.com';
