-- ショパン / 幻想即興曲（辻井伸行）を追加
INSERT INTO representative_songs (
  instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja,
  famous_performer, famous_video_url, is_popular, display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'ピアノ' OR name_en = 'Piano' LIMIT 1),
  '幻想即興曲',
  'フレデリック・ショパン',
  'ロマン派',
  '即興曲',
  4,
  'https://youtu.be/L4hXDtMmF24?si=Idl-qT5otrqWvWCE',
  'ショパンの代表的な即興曲。華やかで技巧的な作品です。',
  '辻井伸行',
  'https://youtu.be/L4hXDtMmF24?si=Idl-qT5otrqWvWCE',
  true,
  2
)
ON CONFLICT (instrument_id, title, composer) DO UPDATE
  SET famous_performer = EXCLUDED.famous_performer,
      famous_video_url = EXCLUDED.famous_video_url;

