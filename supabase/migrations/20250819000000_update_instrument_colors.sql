-- 楽器のカラーを更新

-- ピアノ: 薄ピンク系
UPDATE instruments SET 
  color_primary = '#FFE4E1',
  color_secondary = '#FFC0CB', 
  color_accent = '#FFB6C1'
WHERE name_en = 'Piano';

-- トロンボーン: 明るい黄色・オレンジ系
UPDATE instruments SET 
  color_primary = '#FFA500',
  color_secondary = '#FFD700', 
  color_accent = '#FF8C00'
WHERE name_en = 'Trombone';

-- クラリネット: 白・黒・グレー系
UPDATE instruments SET 
  color_primary = '#E8E8E8',
  color_secondary = '#D3D3D3', 
  color_accent = '#696969'
WHERE name_en = 'Clarinet';

-- ハープ: ピンク系
UPDATE instruments SET 
  color_primary = '#FFB6D9',
  color_secondary = '#FFC9E3', 
  color_accent = '#FF69B4'
WHERE name_en = 'Harp';

-- その他のカラー調整（#F0FBBCを使用）
UPDATE instruments SET 
  color_primary = '#F0FBBC',
  color_secondary = '#F5FDD5', 
  color_accent = '#D4E896'
WHERE name_en = 'Other';

