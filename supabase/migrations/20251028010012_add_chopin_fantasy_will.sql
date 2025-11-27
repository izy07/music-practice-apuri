-- ショパン『幻想即興曲』ヴァイオリン版（ウィル）の情報を追加
INSERT INTO representative_songs (
  instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja,
  famous_performer, famous_video_url, is_popular, display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1),
  '幻想即興曲（ヴァイオリン版）',
  'フレデリック・ショパン',
  'ロマン派',
  '即興曲',
  5,
  'https://youtu.be/rGrnsUSYC4U?si=5EHeWh2gTcDPEIcU',
  'ショパンの名曲をヴァイオリンの超絶技巧で演奏。元々ピアノ曲だが、ヴァイオリンの表現力で新しい魅力を生み出す。',
  'ウィル - ViolinChannel',
  'https://youtu.be/rGrnsUSYC4U?si=5EHeWh2gTcDPEIcU',
  true,
  70
)
ON CONFLICT (instrument_id, title, composer) DO UPDATE
  SET famous_performer = EXCLUDED.famous_performer,
      famous_video_url = EXCLUDED.famous_video_url;

