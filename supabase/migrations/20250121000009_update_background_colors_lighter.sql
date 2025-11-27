-- 楽器テーブルの背景色をより薄い色に更新
UPDATE instruments SET 
  color_background = CASE 
    WHEN name = 'ピアノ' THEN '#FEFEFE'
    WHEN name = 'ギター' THEN '#FFFEF8'
    WHEN name = 'バイオリン' THEN '#FFFEF5'
    WHEN name = 'フルート' THEN '#F8FDFF'
    WHEN name = 'トランペット' THEN '#FFFEF8'
    WHEN name = '打楽器' THEN '#FFFEF8'
    WHEN name = 'サックス' THEN '#FFFEF8'
    WHEN name = 'ホルン' THEN '#FFFEF8'
    WHEN name = 'クラリネット' THEN '#FEFEFE'
    WHEN name = 'トロンボーン' THEN '#FFFEF8'
    WHEN name = 'チェロ' THEN '#FFFEF8'
    WHEN name = 'ファゴット' THEN '#FFFEF8'
    WHEN name = 'オーボエ' THEN '#FFFEF8'
    WHEN name = 'ハープ' THEN '#FFFEFE'
    WHEN name = 'コントラバス' THEN '#FEFEFE'
    WHEN name = 'その他' THEN '#F8F9FA'
    WHEN name = 'ヴィオラ' THEN '#FFFEF5'
    WHEN name = '琴' THEN '#FFFEF8'
    WHEN name = 'シンセサイザー' THEN '#F8FDFF'
    WHEN name = '太鼓' THEN '#FFFEF8'
    ELSE '#FEFEFE'
  END,
  color_surface = '#FFFFFF'
WHERE color_background IS NOT NULL;
