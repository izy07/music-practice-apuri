-- ピアノの代表曲から「トルコ行進曲」と「運命交響曲第一楽章」を削除
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  deleted_count INTEGER;
BEGIN
  -- トルコ行進曲を削除
  DELETE FROM representative_songs
  WHERE instrument_id = piano_id
    AND (
      title = 'トルコ行進曲' 
      OR title LIKE '%トルコ行進曲%'
      OR title LIKE '%Turkish March%'
      OR title LIKE '%Rondo alla turca%'
    )
    AND composer LIKE '%モーツァルト%';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'ピアノの代表曲から「トルコ行進曲」を % 件削除しました', deleted_count;
  ELSE
    RAISE NOTICE '「トルコ行進曲」は見つかりませんでした。';
  END IF;
  
  -- 運命交響曲第一楽章を削除
  DELETE FROM representative_songs
  WHERE instrument_id = piano_id
    AND (
      title = '運命交響曲第一楽章'
      OR title LIKE '%運命交響曲%第一楽章%'
      OR title LIKE '%運命%第一楽章%'
      OR title LIKE '%Symphony No.5%1st%'
      OR title LIKE '%Fate Symphony%1st%'
    )
    AND composer LIKE '%ベートーヴェン%';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'ピアノの代表曲から「運命交響曲第一楽章」を % 件削除しました', deleted_count;
  ELSE
    RAISE NOTICE '「運命交響曲第一楽章」は見つかりませんでした。';
  END IF;
END $$;

-- 削除結果を確認（残っているかどうか確認）
SELECT 
  title,
  composer,
  famous_performer,
  youtube_url,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
  AND (
    title LIKE '%トルコ行進曲%'
    OR title LIKE '%Turkish March%'
    OR title LIKE '%運命交響曲%第一楽章%'
    OR title LIKE '%運命%第一楽章%'
  )
ORDER BY display_order;
