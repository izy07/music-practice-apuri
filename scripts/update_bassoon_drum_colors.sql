-- ファゴットとドラムのカラーを更新するスクリプト
-- Supabase SQL Editorで実行してください

-- 1. ファゴットに現在のドラムの色（レッド系）を適用
UPDATE instruments 
SET 
  color_primary = '#8B0000',      -- ダークレッド（現在のドラムの色）
  color_secondary = '#DC143C',   -- クリムゾン（現在のドラムの色）
  color_accent = '#A52A2A'        -- ブラウンレッド（現在のドラムの色）
WHERE id = '550e8400-e29b-41d4-a716-446655440012'
AND name = 'ファゴット';

-- 2. ドラムを濃淡のある銀色系に変更
UPDATE instruments 
SET 
  color_primary = '#4A4A4A',      -- ダークグレー（濃い色）
  color_secondary = '#E8E8E8',   -- ライトグレー（薄い色）
  color_accent = '#9E9E9E'        -- ミディアムグレー（中間色）
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
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440012',  -- ファゴット
  '550e8400-e29b-41d4-a716-446655440006'   -- ドラム
)
ORDER BY name;
