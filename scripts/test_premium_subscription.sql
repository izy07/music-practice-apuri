-- ============================================
-- プレミアムサブスクリプションのテスト用SQL
-- ============================================
-- 日付: 2026-01-13
-- 目的: 課金状態（Premium）の動作確認用
-- ============================================
-- 
-- 使用方法:
-- 1. 自分のユーザーIDを確認（Supabase Dashboard > Authentication > Users）
-- 2. 以下のSQLを実行して、プレミアム状態に設定
-- 3. アプリを再読み込みして動作を確認
--
-- 注意: このスクリプトは開発・テスト用です
-- ============================================

-- ============================================
-- 方法1: メールアドレスからユーザーIDを取得してプレミアムに設定
-- ============================================
-- メールアドレス: izurutest5@mail.com の場合

-- 月額プランに設定（1ヶ月間有効）
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

-- または、年額プランに設定（1年間有効）
-- UPDATE public.user_subscriptions
-- SET 
--   plan = 'premium_yearly',
--   is_active = true,
--   current_period_end = (NOW() + INTERVAL '1 year')::timestamptz,
--   canceled_at = NULL,
--   updated_at = NOW()
-- WHERE user_id = (
--   SELECT id FROM auth.users WHERE email = 'izurutest5@mail.com'
-- );

-- ============================================
-- 方法2: サブスクリプションレコードが存在しない場合
-- ============================================
-- 新規ユーザーなど、サブスクリプションレコードが存在しない場合は
-- 以下のSQLでレコードを作成します

-- INSERT INTO public.user_subscriptions (
--   user_id,
--   plan,
--   is_active,
--   current_period_end,
--   canceled_at,
--   created_at,
--   updated_at
-- )
-- SELECT 
--   id,  -- メールアドレスから取得したユーザーID
--   'premium_monthly',    -- または 'premium_yearly'
--   true,
--   (NOW() + INTERVAL '1 month')::timestamptz,  -- または '1 year'
--   NULL,
--   NOW(),
--   NOW()
-- FROM auth.users
-- WHERE email = 'izurutest5@mail.com'
-- ON CONFLICT (user_id) DO UPDATE
-- SET 
--   plan = EXCLUDED.plan,
--   is_active = EXCLUDED.is_active,
--   current_period_end = EXCLUDED.current_period_end,
--   canceled_at = EXCLUDED.canceled_at,
--   updated_at = NOW();

-- ============================================
-- 方法3: ユーザーIDとサブスクリプション状態を確認
-- ============================================
-- 以下のSQLで、メールアドレスからユーザーIDとサブスクリプション状態を確認できます

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
-- プレミアム状態を解除（フリープランに戻す）
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

-- ============================================
-- プレミアム機能の確認ポイント
-- ============================================
-- 以下の機能が制限なく使用できることを確認してください：
--
-- 1. 録音機能
--    - 録音時間: 60分まで（フリープランは3分）
--    - 月間録音数: 無制限（フリープランは各楽器3回まで）
--    - 1日の録音数: 2個まで（フリープランは1個）
--
-- 2. 目標設定
--    - 目標数: 無制限（フリープランは各楽器2個まで）
--
-- 3. マイライブラリ
--    - 楽曲数: 無制限（フリープランは各楽器10曲まで）
--
-- 4. 楽器データ
--    - 楽器数: 無制限（フリープランは2個まで）
--
-- 5. 広告削除
--    - 広告が表示されない（フリープランは広告が表示される）
--
-- ============================================
-- 確認方法
-- ============================================
-- 1. アプリを再読み込み（F5 または リロード）
-- 2. 設定画面でサブスクリプション状態を確認
-- 3. 各機能で制限が解除されていることを確認
-- 4. コンソールログで `entitlement.isEntitled` が `true` になっていることを確認
