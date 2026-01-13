-- ギターの代表曲に「ルージュの伝言」のギター弾き語りを追加
-- ジェラfeat.映秀さんの演奏
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
  inserted_count INTEGER;
BEGIN
  -- 松任谷由実「ルージュの伝言」のギター弾き語りを追加
  INSERT INTO representative_songs (
    instrument_id,
    title,
    composer,
    era,
    genre,
    difficulty_level,
    youtube_url,
    description_ja,
    is_popular,
    display_order,
    famous_performer,
    famous_video_url
  )
  SELECT 
    guitar_id,
    'ルージュの伝言',
    '松任谷由実',
    '現代',
    'J-POP',
    3,
    'https://youtu.be/JDJud5Y9l7s?si=X-AM1S7YolM4Dk5m',
    '松任谷由実の名曲。ジェラfeat.映秀さんのギター弾き語り。',
    true,
    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM representative_songs WHERE instrument_id = guitar_id),
    'ジェラfeat.映秀',
    'https://youtu.be/JDJud5Y9l7s?si=X-AM1S7YolM4Dk5m'
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = guitar_id 
      AND title = 'ルージュの伝言' 
      AND composer = '松任谷由実'
  );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  IF inserted_count > 0 THEN
    RAISE NOTICE 'ギターの「ルージュの伝言」を追加しました（ジェラfeat.映秀さんの演奏）';
  ELSE
    RAISE NOTICE '「ルージュの伝言」は既に存在するか、追加に失敗しました。';
  END IF;
END $$;
