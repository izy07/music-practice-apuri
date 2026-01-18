-- ピアノの「革命のエチュード」の重複を確認
-- Supabase StudioのSQL Editorで実行してください

-- 重複している「革命のエチュード」を確認
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
  AND (title = '革命のエチュード' OR title LIKE '%革命のエチュード%')
  AND (composer LIKE '%ショパン%' OR composer LIKE '%Chopin%')
ORDER BY display_order, created_at;
