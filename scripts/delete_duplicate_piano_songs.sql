-- ピアノの代表曲から重複している「エリーゼのために」と「子犬のワルツ」を削除
-- 詳細情報（famous_performer, famous_video_url）がない方を削除

DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  deleted_count INTEGER := 0;
BEGIN
  -- エリーゼのために: famous_performerがnullの方を削除（Lang Langの演奏を残す）
  DELETE FROM representative_songs
  WHERE instrument_id = piano_id
    AND title = 'エリーゼのために'
    AND composer LIKE '%ベートーヴェン%'
    AND (famous_performer IS NULL OR famous_performer = '')
    AND id NOT IN (
      SELECT id FROM representative_songs
      WHERE instrument_id = piano_id
        AND title = 'エリーゼのために'
        AND composer LIKE '%ベートーヴェン%'
        AND famous_performer = 'Lang Lang'
      LIMIT 1
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE 'エリーゼのために（famous_performerがnull）を % 件削除しました', deleted_count;
  END IF;

  -- 子犬のワルツ: famous_performerがnullの方を削除（pianomaedafulの演奏を残す）
  DELETE FROM representative_songs
  WHERE instrument_id = piano_id
    AND title = '子犬のワルツ'
    AND composer LIKE '%ショパン%'
    AND (famous_performer IS NULL OR famous_performer = '')
    AND id NOT IN (
      SELECT id FROM representative_songs
      WHERE instrument_id = piano_id
        AND title = '子犬のワルツ'
        AND composer LIKE '%ショパン%'
        AND famous_performer = 'pianomaedaful'
      LIMIT 1
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE '子犬のワルツ（famous_performerがnull）を % 件削除しました', deleted_count;
  END IF;

END $$;

-- 削除結果を確認
SELECT 
  title,
  composer,
  famous_performer,
  youtube_url,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
  AND (
    title = 'エリーゼのために'
    OR title = '子犬のワルツ'
  )
ORDER BY title, display_order;
