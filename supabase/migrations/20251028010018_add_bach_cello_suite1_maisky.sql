-- バッハ / 無伴奏チェロ組曲第1番（ミッシャ・マイスキー）を追加
INSERT INTO representative_songs (
  instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja,
  famous_performer, famous_video_url, is_popular, display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'チェロ' OR name_en = 'Cello' LIMIT 1),
  '無伴奏チェロ組曲 第1番 ト長調 BWV1007',
  'ヨハン・セバスチャン・バッハ',
  'バロック',
  '組曲',
  4,
  'https://youtu.be/mGQLXRTl3Z0?si=t8BfQ9A6dDXZM0Or',
  'バッハが作曲した6つの無伴奏チェロ組曲の中で最も有名な第1番。チェロの独奏のために書かれた音楽の最高傑作の一つ。',
  'Mischa Maisky',
  'https://youtu.be/mGQLXRTl3Z0?si=t8BfQ9A6dDXZM0Or',
  true,
  1
)
ON CONFLICT (instrument_id, title, composer) DO UPDATE
  SET famous_performer = EXCLUDED.famous_performer,
      famous_video_url = EXCLUDED.famous_video_url;

