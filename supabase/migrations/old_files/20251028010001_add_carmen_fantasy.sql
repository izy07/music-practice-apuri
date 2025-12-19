-- Carmen Fantasy を追加
INSERT INTO representative_songs (
  instrument_id, 
  title, 
  composer, 
  era, 
  genre, 
  difficulty_level, 
  youtube_url, 
  description_ja, 
  famous_performer,
  famous_video_url,
  is_popular, 
  display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1), 
  'カルメン幻想曲', 
  'フランツ・ワックスマン', 
  'ロマン派', 
  '幻想曲', 
  5, 
  'https://youtu.be/UanlnKL4kcw?si=mm566b-ZZPZpK3An',
  'ビゼーのオペラ「カルメン」を基にした華麗な幻想曲。バイオリニストにとっての難曲の一つ。', 
  'HIMARI',
  'https://youtu.be/UanlnKL4kcw?si=mm566b-ZZPZpK3An',
  true, 
  50
)
ON CONFLICT (id) DO NOTHING;

