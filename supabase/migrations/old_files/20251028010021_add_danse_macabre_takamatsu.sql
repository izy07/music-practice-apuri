-- 死の舞踏（サン=サーンス / 高松あい）を追加
INSERT INTO representative_songs (
  instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja,
  famous_performer, famous_video_url, is_popular, display_order
) VALUES (
  (SELECT id FROM instruments WHERE name = 'バイオリン' OR name_en = 'Violin' LIMIT 1),
  '死の舞踏 (Danse macabre)',
  'カミーユ・サン=サーンス',
  'ロマン派',
  '交響詩',
  4,
  'https://youtu.be/jzgMDRZormQ?si=WLNHTIIfCoe_DJNL',
  'サン=サーンスの交響詩「死の舞踏」。中世の「死の舞踏」をモチーフにした不気味で情熱的な名曲。ヴァイオリンソロで有名な旋律を演奏。',
  '高松あい',
  'https://youtu.be/jzgMDRZormQ?si=WLNHTIIfCoe_DJNL',
  true,
  85
)
ON CONFLICT (instrument_id, title, composer) DO UPDATE
  SET famous_performer = EXCLUDED.famous_performer,
      famous_video_url = EXCLUDED.famous_video_url;

