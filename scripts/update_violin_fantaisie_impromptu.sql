-- バイオリンの「ショパン 幻想即興曲」の説明を更新
-- Supabase StudioのSQL Editorで実行してください

UPDATE representative_songs
SET description_ja = 'ショパンの幻想即興曲をバイオリンで演奏。ウィル - ViolinChannelによる演奏。'
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'::UUID
  AND title = '幻想即興曲'
  AND composer = 'ショパン';

-- 更新結果を確認
SELECT 
  title,
  composer,
  description_ja,
  youtube_url
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'::UUID
  AND title = '幻想即興曲'
  AND composer = 'ショパン';
