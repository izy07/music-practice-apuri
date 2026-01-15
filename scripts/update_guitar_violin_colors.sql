-- ギターとバイオリンのテーマカラーを更新するスクリプト
-- Supabase SQL Editorで実行してください

-- 1. バイオリンにギターの現在のカラーを適用
UPDATE instruments 
SET 
  color_primary = '#654321',      -- ギターの茶色
  color_secondary = '#DEB887',    -- ギターのベージュ
  color_accent = '#8B4513',       -- ギターの茶色
  background_color = '#FFF8DC',   -- ギターのベージュ系背景
  updated_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440003'
AND name = 'バイオリン';

-- 2. ギターに深みのある水色系のカラーを設定
UPDATE instruments 
SET 
  color_primary = '#1565C0',      -- 深い水色
  color_secondary = '#64B5F6',    -- 明るい水色
  color_accent = '#0D47A1',       -- 濃い水色
  background_color = '#E3F2FD',   -- 薄い水色背景
  updated_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440002'
AND name = 'ギター';

-- 確認: 更新された色を確認
SELECT 
  id,
  name,
  color_primary,
  color_secondary,
  color_accent,
  background_color
FROM instruments
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440002',  -- ギター
  '550e8400-e29b-41d4-a716-446655440003'  -- バイオリン
)
ORDER BY name;
