-- チェロとコントラバスのカラーを茶色系に更新するスクリプト
-- Supabase SQL Editorで実行してください

-- 1. チェロに茶色系のカラーを設定
UPDATE instruments 
SET 
  color_primary = '#6B4423',      -- ダークブラウン（メインカラー）
  color_secondary = '#CD853F',   -- ペルー（セカンダリカラー）
  color_accent = '#8B4513'        -- サドルブラウン（アクセントカラー）
WHERE id = '550e8400-e29b-41d4-a716-446655440011'
AND name = 'チェロ';

-- 2. コントラバスに深い茶色系のカラーを設定
UPDATE instruments 
SET 
  color_primary = '#5C4033',      -- ダークブラウン（メインカラー）
  color_secondary = '#8B7355',    -- ミディアムブラウン（セカンダリカラー）
  color_accent = '#3E2723'        -- ダークブラウン（アクセントカラー）
WHERE id = '550e8400-e29b-41d4-a716-446655440015'
AND name = 'コントラバス';

-- 確認: 更新された色を確認
SELECT 
  id,
  name,
  color_primary,
  color_secondary,
  color_accent
FROM instruments
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440011',  -- チェロ
  '550e8400-e29b-41d4-a716-446655440015'   -- コントラバス
)
ORDER BY name;
