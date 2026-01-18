-- チェロの代表曲の重複を修正（「無伴奏チェロ組曲第1番」を削除し、「無伴奏チェロ組曲 第1番～プレリュード」を追加または更新）
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  cello_id UUID := '550e8400-e29b-41d4-a716-446655440011';
  deleted_count INTEGER;
  updated_count INTEGER;
  max_display_order INTEGER;
BEGIN
  -- 1. 「無伴奏チェロ組曲第1番」を削除（重複を解消）
  DELETE FROM representative_songs
  WHERE instrument_id = cello_id
    AND (
      title = '無伴奏チェロ組曲第1番'
      OR title LIKE '%無伴奏チェロ組曲第1番%'
      OR (title LIKE '%無伴奏チェロ組曲%第1番%' AND title NOT LIKE '%プレリュード%')
    )
    AND composer LIKE '%バッハ%';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'チェロの「無伴奏チェロ組曲第1番」を % 件削除しました', deleted_count;
  ELSE
    RAISE NOTICE '「無伴奏チェロ組曲第1番」は見つかりませんでした。';
  END IF;
  
  -- 2. 「無伴奏チェロ組曲 第1番～プレリュード」を更新または追加
  UPDATE representative_songs
  SET 
    youtube_url = 'https://youtu.be/JcyAVHc9_WU?si=eVkwtjTN140au5tE',
    famous_performer = '中木健二',
    famous_video_url = 'https://youtu.be/JcyAVHc9_WU?si=eVkwtjTN140au5tE',
    description_ja = COALESCE(description_ja, 'J.S.バッハの無伴奏チェロ組曲第1番よりプレリュード。チェロの名曲。')
  WHERE instrument_id = cello_id
    AND (
      title = '無伴奏チェロ組曲 第1番～プレリュード'
      OR title LIKE '%無伴奏チェロ組曲%第1番%プレリュード%'
      OR title LIKE '%無伴奏チェロ組曲%第1番～プレリュード%'
    )
    AND composer LIKE '%バッハ%';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'チェロの「無伴奏チェロ組曲 第1番～プレリュード」を % 件更新しました（中木健二の演奏）', updated_count;
  ELSE
    -- 更新対象が見つからない場合は新規追加
    SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
    FROM representative_songs
    WHERE instrument_id = cello_id;
    
    INSERT INTO representative_songs (
      instrument_id,
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
      display_order
    )
    VALUES (
      cello_id,
      '無伴奏チェロ組曲 第1番～プレリュード',
      'ヨハン・セバスチャン・バッハ',
      'バロック',
      '無伴奏',
      5,
      'https://youtu.be/JcyAVHc9_WU?si=eVkwtjTN140au5tE',
      'J.S.バッハの無伴奏チェロ組曲第1番よりプレリュード。チェロの名曲。',
      '中木健二',
      'https://youtu.be/JcyAVHc9_WU?si=eVkwtjTN140au5tE',
      true,
      max_display_order + 1
    );
    
    RAISE NOTICE 'チェロの代表曲に「無伴奏チェロ組曲 第1番～プレリュード」を新規追加しました（中木健二の演奏）';
  END IF;
END $$;

-- 修正結果を確認
SELECT 
  title,
  composer,
  famous_performer,
  youtube_url,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440011'::UUID
  AND (
    title LIKE '%無伴奏チェロ組曲%第1番%'
    OR title LIKE '%無伴奏チェロ組曲第1番%'
  )
ORDER BY display_order;
