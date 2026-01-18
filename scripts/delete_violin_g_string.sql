-- バイオリンの代表曲から「G線上のアリア」を削除
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  deleted_count INTEGER;
BEGIN
  -- G線上のアリア（またはG線のアリア）を削除
  DELETE FROM representative_songs
  WHERE instrument_id = violin_id
    AND (title = 'G線上のアリア' OR title = 'G線のアリア')
    AND composer LIKE '%バッハ%';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'バイオリンの代表曲から「G線上のアリア」を % 件削除しました', deleted_count;
  ELSE
    RAISE NOTICE '削除対象のレコードが見つかりませんでした。';
  END IF;
END $$;

-- 削除結果を確認（残っているG線上のアリアがないか確認）
SELECT 
  title,
  composer,
  famous_performer,
  youtube_url
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'::UUID
  AND (title LIKE '%G線%' OR title LIKE '%G線上%')
ORDER BY display_order;
