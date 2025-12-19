-- 二つのバイオリンのための協奏曲（バッハ）を追加
INSERT INTO representative_songs (
  instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja,
  famous_performer, famous_video_url, is_popular, display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1),
  '二つのバイオリンのための協奏曲',
  'ヨハン・セバスチャン・バッハ',
  'バロック',
  '協奏曲',
  4,
  'https://www.youtube.com/watch?v=P_4rbNHsPaQ?si=2f2uIoBmkNSbPY87',
  'バッハの二重協奏曲。二つのバイオリンが美しく絡み合う名作。',
  'Johannes Brahms',
  'https://youtu.be/LZ48G9UziRs?si=Lu69aypA-WYsN3gt',
  true,
  4
)
ON CONFLICT (instrument_id, title, composer) DO UPDATE
  SET famous_performer = EXCLUDED.famous_performer,
      famous_video_url = EXCLUDED.famous_video_url;

