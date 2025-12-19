-- バッハ / 無伴奏ヴァイオリン・ソナタ 第1番 - HIMARIの演奏を追加
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
  '無伴奏ヴァイオリン・ソナタ 第1番 ト短 BWV1001 - I. アダージョ', 
  'ヨハン・セバスチャン・バッハ', 
  'バロック', 
  'ソナタ', 
  5, 
  'https://youtu.be/Fex29YKXftA?si=FbcJny4w36WqSneM',
  'バッハの無伴奏ヴァイオリン・ソナタの名作。ソロで演奏される深い表現力が要求される作品。', 
  'HIMARI',
  'https://youtu.be/Fex29YKXftA?si=FbcJny4w36WqSneM',
  true, 
  51
)
ON CONFLICT (id) DO NOTHING;

