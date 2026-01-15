-- ギターのカラーを更新するスクリプト
-- Supabase SQL Editorで実行してください

-- ギターにエレキギターをイメージした明るめのレッド系のカラーを設定
UPDATE instruments 
SET 
  color_primary = '#E63946',      -- 明るいレッド（メインカラー）
  color_secondary = '#FF8A95',    -- ライトレッド（セカンダリカラー）
  color_accent = '#C41E3A'        -- ミディアムレッド（アクセントカラー）
WHERE id = '550e8400-e29b-41d4-a716-446655440002'
AND name = 'ギター';

-- 確認: 更新された色を確認
SELECT 
  id,
  name,
  color_primary,
  color_secondary,
  color_accent
FROM instruments
WHERE id = '550e8400-e29b-41d4-a716-446655440002';
