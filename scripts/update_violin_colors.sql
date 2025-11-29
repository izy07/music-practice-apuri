-- バイオリンの色を優雅な茶色系に更新するスクリプト
-- Supabase SQL Editorで実行してください

-- バイオリンのID
-- '550e8400-e29b-41d4-a716-446655440003' がバイオリン

UPDATE instruments 
SET 
  color_primary = '#9B7A5A',      -- バイオリンらしい優雅な茶色（ダスティブラウン）
  color_secondary = '#D4C4B0',    -- 優雅なライトベージュ
  color_accent = '#7A5F3F',       -- ダークブラウン（ニス仕上げの深み）
  color_background = '#F5EDE0',   -- 温かみのあるアイボリー背景
  updated_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440003'
AND name = 'バイオリン';

-- 確認: 更新された色を確認
SELECT 
  id,
  name,
  color_primary,
  color_secondary,
  color_accent,
  color_background
FROM instruments
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

