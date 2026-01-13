-- ============================================
-- プレミアムサブスクリプション強制設定（izurutest5@mail.com用）
-- ============================================
-- 日付: 2026-01-13
-- 目的: izurutest5@mail.com を確実にプレミアム状態に設定
-- ============================================
-- 
-- このスクリプトは、既存のレコードを削除してから新規作成することで
-- 確実にプレミアム状態を設定します
-- ============================================

-- ============================================
-- ステップ1: 現在の状態を確認
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
-- ステップ2: 既存のレコードを削除（念のため）
-- ============================================
DELETE FROM public.user_subscriptions
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'izurutest5@mail.com'
);

-- ============================================
-- ステップ3: 新規レコードを作成（プレミアム月額）
-- ============================================
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
WHERE email = 'izurutest5@mail.com';

-- ============================================
-- ステップ4: 設定後の状態を確認
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
WHERE u.email = 'izurutest5@mail.com';

-- ============================================
-- 確認ポイント
-- ============================================
-- 上記のクエリ結果で以下を確認してください：
-- 1. subscription_id が NULL でないこと
-- 2. plan が 'premium_monthly' であること
-- 3. is_active が true であること
-- 4. current_period_end が未来の日付であること
-- 5. subscription_status が '✅ プレミアム有効' であること
--
-- これらがすべて満たされている場合、データベース側は正しく設定されています。
-- アプリ側で反映されない場合は、以下を試してください：
-- 1. ブラウザのキャッシュをクリア（Ctrl+Shift+Delete）
-- 2. アプリを完全に再読み込み（Ctrl+F5 または Cmd+Shift+R）
-- 3. ブラウザの開発者ツール（F12）でコンソールエラーを確認
-- 4. コンソールで以下を実行して状態を確認：
--    - localStorage.clear()
--    - アプリを再読み込み
