-- ピアノの「幻想即興曲」の重複を確認
-- Supabase StudioのSQL Editorで実行してください

-- 重複している「幻想即興曲」を確認
SELECT 
  id,
  title,
  composer,
  famous_performer,
  youtube_url,
  description_ja,
  display_order,
  created_at
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
  AND (title = '幻想即興曲' OR title LIKE '%幻想即興曲%')
  AND (composer LIKE '%ショパン%' OR composer LIKE '%Chopin%')
ORDER BY display_order, created_at;
