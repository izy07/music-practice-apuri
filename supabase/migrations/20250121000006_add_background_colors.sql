-- 楽器テーブルに背景色カラムを追加
ALTER TABLE instruments 
ADD COLUMN IF NOT EXISTS color_background TEXT DEFAULT '#F7FAFC',
ADD COLUMN IF NOT EXISTS color_surface TEXT DEFAULT '#FFFFFF';

-- 既存の楽器データに背景色を設定
UPDATE instruments SET 
  color_background = CASE 
    WHEN name = 'ピアノ' THEN '#F5F5F0'
    WHEN name = 'ギター' THEN '#FFF8DC'
    WHEN name = 'バイオリン' THEN '#FFF5E6'
    WHEN name = 'フルート' THEN '#F0F8FF'
    WHEN name = 'トランペット' THEN '#FFFAF0'
    WHEN name = '打楽器' THEN '#FFF5F5'
    WHEN name = 'サックス' THEN '#FFF8E7'
    WHEN name = 'ホルン' THEN '#FFF9E6'
    WHEN name = 'クラリネット' THEN '#FAF9F6'
    WHEN name = 'トロンボーン' THEN '#FFFACD'
    WHEN name = 'チェロ' THEN '#FFF8F0'
    WHEN name = 'ファゴット' THEN '#FFF8F0'
    WHEN name = 'オーボエ' THEN '#FFF8F0'
    WHEN name = 'ハープ' THEN '#FFFAF9'
    WHEN name = 'コントラバス' THEN '#F5F3F0'
    WHEN name = 'その他' THEN '#ECEFF1'
    WHEN name = 'ヴィオラ' THEN '#FFF5E6'
    WHEN name = '琴' THEN '#FFF8DC'
    WHEN name = 'シンセサイザー' THEN '#F0F8FF'
    WHEN name = '太鼓' THEN '#FFF8DC'
    ELSE '#F7FAFC'
  END,
  color_surface = '#FFFFFF'
WHERE color_background IS NULL OR color_surface IS NULL;
