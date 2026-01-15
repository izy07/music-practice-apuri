-- トロンボーン、オーボエ、ファゴットのカラーを更新するスクリプト
-- Supabase SQL Editorで実行してください

-- 1. トロンボーンに現在のオーボエの色を適用（ゴールド系）
UPDATE instruments 
SET 
  color_primary = '#DAA520',      -- ゴールド（現在のオーボエの色）
  color_secondary = '#F0E68C',    -- 薄いゴールド（現在のオーボエの色）
  color_accent = '#B8860B'        -- ダークゴールド（現在のオーボエの色）
WHERE id = '550e8400-e29b-41d4-a716-446655440010'
AND name = 'トロンボーン';

-- 2. オーボエを黒っぽいカラーに変更
UPDATE instruments 
SET 
  color_primary = '#1A1A1A',      -- ダークグレー/ブラック
  color_secondary = '#2F2F2F',    -- ミディアムグレー
  color_accent = '#000000'        -- ブラック
WHERE id = '550e8400-e29b-41d4-a716-446655440013'
AND name = 'オーボエ';

-- 3. ファゴットをファゴットの表面の色（木の色）に変更
UPDATE instruments 
SET 
  color_primary = '#DEB887',      -- バーリーウッド（木の表面の色）
  color_secondary = '#F5DEB3',    -- 薄いバーリーウッド
  color_accent = '#CD853F'        -- ペルー（木のアクセント）
WHERE id = '550e8400-e29b-41d4-a716-446655440012'
AND name = 'ファゴット';

-- 確認: 更新された色を確認
SELECT 
  id,
  name,
  color_primary,
  color_secondary,
  color_accent
FROM instruments
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440010',  -- トロンボーン
  '550e8400-e29b-41d4-a716-446655440013',  -- オーボエ
  '550e8400-e29b-41d4-a716-446655440012'   -- ファゴット
)
ORDER BY name;
