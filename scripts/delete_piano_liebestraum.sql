-- ピアノの代表曲から「愛の夢」を削除
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  deleted_count INTEGER;
BEGIN
  -- 愛の夢を削除
  DELETE FROM representative_songs
  WHERE instrument_id = piano_id
    AND (
      title = '愛の夢'
      OR title LIKE '%愛の夢%'
      OR title LIKE '%Liebestraum%'
      OR title LIKE '%Liebes traum%'
    )
    AND composer LIKE '%リスト%';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'ピアノの代表曲から「愛の夢」を % 件削除しました', deleted_count;
  ELSE
    RAISE NOTICE '「愛の夢」は見つかりませんでした。';
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
    title LIKE '%愛の夢%'
    OR title LIKE '%Liebestraum%'
  )
ORDER BY display_order;
