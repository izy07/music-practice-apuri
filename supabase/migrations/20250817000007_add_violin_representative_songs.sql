-- バイオリンの代表曲に「愛のあいさつ」と「二つのバイオリンのための協奏曲」を追加

-- 愛のあいさつ（サロン）を追加
INSERT INTO representative_songs (
  instrument_id, 
  title, 
  composer, 
  era, 
  genre, 
  difficulty_level, 
  youtube_url, 
  description_ja, 
  is_popular, 
  display_order
) VALUES (
  (SELECT id FROM instruments WHERE name_en = 'Violin'), 
  '愛のあいさつ', 
  'エルガー', 
  'ロマン派', 
  'サロン', 
  3, 
  'https://www.youtube.com/watch?v=YyknBTm_YyM', 
  'エルガーの最も美しい作品の一つ。結婚式でもよく演奏されるロマンチックな名曲。', 
  true, 
  6
);

-- 二つのバイオリンのための協奏曲を追加
INSERT INTO representative_songs (
  instrument_id, 
  title, 
  composer, 
  era, 
  genre, 
  difficulty_level, 
  youtube_url, 
  description_ja, 
  is_popular, 
  display_order
) VALUES (
  (SELECT id FROM instruments WHERE name_en = 'Violin'), 
  '二つのバイオリンのための協奏曲', 
  'バッハ', 
  'バロック', 
  '協奏曲', 
  4, 
  'https://www.youtube.com/watch?v=QvtXyGr1JP0', 
  'バッハの二重協奏曲。二つのバイオリンが美しく絡み合う名作。', 
  true, 
  7
);
