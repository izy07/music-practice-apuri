-- ホルンとトロンボーンのカラーをトランペットと同じ色に更新するスクリプト
-- Supabase SQL Editorで実行してください

-- 1. ホルンにトランペットと同じカラーを設定
UPDATE instruments 
SET 
  color_primary = '#B8860B',      -- ダークゴールド（トランペットと同じ）
  color_secondary = '#DAA520',    -- ゴールド（トランペットと同じ）
  color_accent = '#8B4513'        -- サドルブラウン（トランペットと同じ）
WHERE id = '550e8400-e29b-41d4-a716-446655440008'
AND name = 'ホルン';

-- 2. トロンボーンにトランペットと同じカラーを設定
UPDATE instruments 
SET 
  color_primary = '#B8860B',      -- ダークゴールド（トランペットと同じ）
  color_secondary = '#DAA520',    -- ゴールド（トランペットと同じ）
  color_accent = '#8B4513'        -- サドルブラウン（トランペットと同じ）
WHERE id = '550e8400-e29b-41d4-a716-446655440010'
AND name = 'トロンボーン';

-- 確認: 更新された色を確認
SELECT 
  id,
  name,
  color_primary,
  color_secondary,
  color_accent
FROM instruments
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440008',  -- ホルン
  '550e8400-e29b-41d4-a716-446655440010'   -- トロンボーン
)
ORDER BY name;
