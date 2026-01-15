-- ドラムのカラーを更新するスクリプト
-- Supabase SQL Editorで実行してください

-- ドラムに銀色系のカラーを設定
UPDATE instruments 
SET 
  color_primary = '#8F8F8F',      -- シルバーグレー（メイン）
  color_secondary = '#D9D9D9',   -- ライトシルバー（サブ）
  color_accent = '#C0C0C0'        -- シルバー（アクセント）
WHERE id = '550e8400-e29b-41d4-a716-446655440006'
AND name = 'ドラム';

-- 確認: 更新された色を確認
SELECT 
  id,
  name,
  color_primary,
  color_secondary,
  color_accent
FROM instruments
WHERE id = '550e8400-e29b-41d4-a716-446655440006';
