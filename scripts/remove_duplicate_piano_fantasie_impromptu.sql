-- ピアノの「幻想即興曲」の重複を削除
-- より新しいレコード（または演奏者情報がないレコード）を削除
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  deleted_count INTEGER;
  keep_id UUID;
BEGIN
  -- 幻想即興曲のレコードを取得（演奏者情報があるものを優先して保持）
  SELECT id INTO keep_id
  FROM representative_songs
  WHERE instrument_id = piano_id
    AND (title = '幻想即興曲' OR title LIKE '%幻想即興曲%')
    AND (composer LIKE '%ショパン%' OR composer LIKE '%Chopin%')
  ORDER BY 
    CASE WHEN famous_performer IS NOT NULL AND famous_performer != '' THEN 0 ELSE 1 END,
    created_at DESC
  LIMIT 1;
  
  -- 保持するレコード以外を削除
  DELETE FROM representative_songs
  WHERE instrument_id = piano_id
    AND (title = '幻想即興曲' OR title LIKE '%幻想即興曲%')
    AND (composer LIKE '%ショパン%' OR composer LIKE '%Chopin%')
    AND id != keep_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'ピアノの「幻想即興曲」の重複を % 件削除しました。ID % を保持しました。', deleted_count, keep_id;
  ELSE
    RAISE NOTICE '重複するレコードが見つかりませんでした。';
  END IF;
END $$;

-- 削除後の確認
SELECT 
  id,
  title,
  composer,
  famous_performer,
  youtube_url,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
  AND (title = '幻想即興曲' OR title LIKE '%幻想即興曲%')
  AND (composer LIKE '%ショパン%' OR composer LIKE '%Chopin%')
ORDER BY display_order;
