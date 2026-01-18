-- バイオリンの代表曲に「ショパン 幻想即興曲（バイオリン編）」を追加
-- Supabase StudioのSQL Editorで実行してください

INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order)
SELECT '550e8400-e29b-41d4-a716-446655440003'::UUID, '幻想即興曲', 'ショパン', 'ロマン派', '即興曲', 4, 'https://youtu.be/rGrnsUSYC4U?si=7EpKEUSSvpKxqouw', 'ショパンの幻想即興曲をバイオリンで演奏。ウィル - ViolinChannelによる演奏。', true, 14
WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003' AND title = '幻想即興曲' AND composer = 'ショパン');
