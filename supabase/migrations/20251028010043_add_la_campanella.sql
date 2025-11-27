-- ラ・カンパネラ（リスト）をピアノの代表曲として追加
INSERT INTO representative_songs (
  instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja,
  famous_performer, famous_video_url, is_popular, display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'ピアノ' OR name_en = 'Piano' LIMIT 1),
  'ラ・カンパネラ',
  'フランツ・リスト',
  'ロマン派',
  '練習曲',
  5,
  'https://youtu.be/8EaXf6fOFnA?si=oDGA4VDwJcqnDV0o',
  'パガニーニの「ラ・カンパネラ」をリストがピアノ用に編曲した超絶技巧曲。',
  'フランツ・リスト',
  'https://youtu.be/8EaXf6fOFnA?si=oDGA4VDwJcqnDV0o',
  true,
  3
)
ON CONFLICT (instrument_id, title, composer) DO UPDATE
  SET famous_performer = EXCLUDED.famous_performer,
      famous_video_url = EXCLUDED.famous_video_url;

