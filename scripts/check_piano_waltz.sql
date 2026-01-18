-- ピアノの代表曲「子犬のワルツ」の現在のデータを確認
-- Supabase StudioのSQL Editorで実行してください

SELECT 
  id,
  title,
  composer,
  era,
  genre,
  difficulty_level,
  youtube_url,
  description_ja,
  famous_performer,
  famous_video_url,
  is_popular,
  display_order,
  created_at,
  updated_at
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
  AND (title = '子犬のワルツ' OR title LIKE '%子犬%ワルツ%' OR title LIKE '%Valse op.64-1%')
ORDER BY display_order, created_at;
