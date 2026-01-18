-- URLが登録されていない「子犬のワルツ」（ピアノ）を削除
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  deleted_count INTEGER := 0;
BEGIN
  -- URLが登録されていない「子犬のワルツ」を確認
  RAISE NOTICE 'URLが登録されていない「子犬のワルツ」を確認中...';
  
  -- URLがNULLまたは空の「子犬のワルツ」を削除
  DELETE FROM representative_songs
  WHERE instrument_id = piano_id
    AND (title = '子犬のワルツ' OR title LIKE '%子犬%ワルツ%')
    AND (youtube_url IS NULL OR youtube_url = '' OR youtube_url = 'https://www.youtube.com/watch?v=example_piano_fate');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'URLが登録されていない「子犬のワルツ」を % 件削除しました', deleted_count;
  ELSE
    RAISE NOTICE 'URLが登録されていない「子犬のワルツ」は見つかりませんでした';
  END IF;
END $$;

-- 削除後の「子犬のワルツ」を確認
SELECT 
  id,
  title,
  composer,
  famous_performer,
  youtube_url,
  famous_video_url,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
  AND (title = '子犬のワルツ' OR title LIKE '%子犬%ワルツ%' OR title LIKE '%Valse op.64-1%')
ORDER BY display_order;
