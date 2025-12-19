-- パガニーニ / カプリース第24番 を追加
INSERT INTO representative_songs (
  instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja,
  famous_performer, famous_video_url, is_popular, display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1),
  'カプリース第24番',
  'ニコロ・パガニーニ',
  'ロマン派',
  '練習曲',
  5,
  'https://youtu.be/6cfWJop0LZ0?si=7DpAoTpYrvBuyGry',
  'パガニーニの24のカプリースから。超絶技巧を要求される練習曲として最も有名な作品の一つ。',
  'ニコロ・パガニーニ',
  'https://youtu.be/6cfWJop0LZ0?si=7DpAoTpYrvBuyGry',
  true,
  3
)
ON CONFLICT (instrument_id, title, composer) DO UPDATE
  SET famous_performer = EXCLUDED.famous_performer,
      famous_video_url = EXCLUDED.famous_video_url;

