-- ============================================
-- ドラムのプロフィール修正（最終版）
-- ============================================
-- このマイグレーションは、古いドラムIDや文字列'drums'を参照している
-- ユーザープロフィールを、統一されたドラムID（...006）に修正します
-- ============================================
-- 注意: instrumentsテーブルへのドラム追加は不要です
-- （20251219113532_consolidate_instruments_final.sqlで既に追加済み）

-- 統一されたドラムID（consolidate_instruments_final.sqlで定義されたもの）
-- ID: 550e8400-e29b-41d4-a716-446655440006
-- 名前: ドラム
-- 色: #000000, #696969, #000000, #F5F5DC, #FFFFFF

-- 1. 古いドラムID（...022）を参照しているユーザープロフィールを修正
UPDATE user_profiles 
SET selected_instrument_id = '550e8400-e29b-41d4-a716-446655440006'::uuid
WHERE selected_instrument_id::text = '550e8400-e29b-41d4-a716-446655440022';

-- 2. 文字列'drums'を参照しているユーザープロフィールを修正
UPDATE user_profiles 
SET selected_instrument_id = '550e8400-e29b-41d4-a716-446655440006'::uuid
WHERE selected_instrument_id::text = 'drums';

-- 3. 古い名前「打楽器」を参照している可能性があるため、名前で検索して修正
-- （ただし、これは通常は不要。念のため）
UPDATE user_profiles 
SET selected_instrument_id = '550e8400-e29b-41d4-a716-446655440006'::uuid
WHERE selected_instrument_id IN (
  SELECT id FROM instruments WHERE name = '打楽器' AND id != '550e8400-e29b-41d4-a716-446655440006'::uuid
);
