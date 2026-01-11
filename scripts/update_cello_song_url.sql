-- チェロの「無伴奏チェロ組曲第1番 プレリュード」のYouTube URLを更新
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  cello_id UUID := '550e8400-e29b-41d4-a716-446655440011';
BEGIN
  -- 無伴奏チェロ組曲第1番のYouTube URLを更新
  UPDATE representative_songs
  SET youtube_url = 'https://youtu.be/JcyAVHc9_WU?si=9-GeFPt8by7sVi_G'
  WHERE instrument_id = cello_id 
    AND (title LIKE '%無伴奏チェロ組曲第1番%' OR title LIKE '%無伴奏チェロ組曲 第1番%')
    AND composer LIKE '%バッハ%';
  
  -- 更新された行数を表示
  IF FOUND THEN
    RAISE NOTICE 'チェロの無伴奏チェロ組曲第1番のYouTube URLを更新しました';
  ELSE
    RAISE NOTICE '該当する曲が見つかりませんでした。新規追加します。';
    -- 見つからない場合は新規追加
    INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
    SELECT cello_id, '無伴奏チェロ組曲第1番 プレリュード', 'J.S.バッハ', 'バロック', '無伴奏', 4, 'https://youtu.be/JcyAVHc9_WU?si=9-GeFPt8by7sVi_G', 'バッハの無伴奏チェロ組曲の第1番プレリュード。中木健二による演奏。', true, 7
    WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = '無伴奏チェロ組曲第1番 プレリュード' AND composer = 'J.S.バッハ');
  END IF;
END $$;

-- 確認クエリ
SELECT id, title, composer, youtube_url, display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440011'
ORDER BY display_order;
