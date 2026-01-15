-- サックスの色を黄色寄りに更新するスクリプト
-- Supabase SQL Editorで実行してください

-- サックスのID
-- '550e8400-e29b-41d4-a716-446655440007' がサックス

UPDATE instruments 
SET 
  color_primary = '#E68900',      -- 黄色寄りのオレンジ（暗め）
  color_secondary = '#FFB74D',    -- 明るい黄色寄りのオレンジ
  color_accent = '#D68910',       -- 濃い黄色寄りのオレンジ（暗め）
  background_color = '#FFF8E1',   -- 薄い黄色背景
  updated_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440007'
AND name = 'サックス';

-- 確認: 更新された色を確認
SELECT 
  id,
  name,
  color_primary,
  color_secondary,
  color_accent,
  background_color
FROM instruments
WHERE id = '550e8400-e29b-41d4-a716-446655440007';
