-- Autumn Leaves（Jazz Violin - Retaw）を追加
INSERT INTO representative_songs (
  instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja,
  famous_performer, famous_video_url, is_popular, display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1),
  'Autumn Leaves (Jazz Violin Version)',
  'Joseph Kosma',
  'ジャズ',
  'ジャズ',
  3,
  'https://youtu.be/IprPq6eGxAU?si=QC-8ETFDx5Yvg0F6',
  '美しいジャズスタンダード「Autumn Leaves」をバイオリンのスロースイングで演奏。ヴァイオリンの表現力でジャズの魅力を引き出す。',
  'Retaw',
  'https://youtu.be/IprPq6eGxAU?si=QC-8ETFDx5Yvg0F6',
  true,
  80
)
ON CONFLICT (instrument_id, title, composer) DO UPDATE
  SET famous_performer = EXCLUDED.famous_performer,
      famous_video_url = EXCLUDED.famous_video_url;

