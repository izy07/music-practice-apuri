-- ピアノのカラーをドラムと同じ濃淡のあるグレー系に更新するスクリプト
-- Supabase SQL Editorで実行してください

-- ピアノにドラムと同じ濃淡のあるグレー系のカラーを設定
UPDATE instruments 
SET 
  color_primary = '#4A4A4A',      -- ダークグレー（濃い色）
  color_secondary = '#E8E8E8',   -- ライトグレー（薄い色）
  color_accent = '#9E9E9E'        -- ミディアムグレー（中間色）
WHERE id = '550e8400-e29b-41d4-a716-446655440001'
AND name = 'ピアノ';

-- 確認: 更新された色を確認
SELECT 
  id,
  name,
  color_primary,
  color_secondary,
  color_accent
FROM instruments
WHERE id = '550e8400-e29b-41d4-a716-446655440001';
