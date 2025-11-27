-- Jesu, Joy of Man's Desiring（Stringspace Violin & Guitar Duo）を追加
INSERT INTO representative_songs (
  instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja,
  famous_performer, famous_video_url, is_popular, display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1),
  'Jesu Joy of Mans Desiring (Jesus bleibet meine Freude)',
  'ヨハン・セバスチャン・バッハ',
  'バロック',
  'コラール',
  3,
  'https://youtu.be/7Azm8gJPK6I?si=AEwvFbAHR8Ifji6u',
  'バッハの教会カンタータから編曲された美しいコラール。ヴァイオリンとギターのデュオで演奏される心に響く旋律。',
  'Stringspace Violin & Guitar Duo',
  'https://youtu.be/7Azm8gJPK6I?si=AEwvFbAHR8Ifji6u',
  true,
  90
)
ON CONFLICT (instrument_id, title, composer) DO UPDATE
  SET famous_performer = EXCLUDED.famous_performer,
      famous_video_url = EXCLUDED.famous_video_url;

