-- ギターの代表曲に「ライラック」のギターカバーを追加
-- 若井滉斗さんの演奏
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
  inserted_count INTEGER;
BEGIN
  -- Mrs. GREEN APPLE「ライラック」のギターカバーを追加
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
    'ライラック',
    'Mrs. GREEN APPLE',
    '現代',
    'J-POP',
    3,
    'https://youtu.be/3vQkWyUWWj4?si=vpunNNb1qKoarNpK',
    'Mrs. GREEN APPLEの名曲。若井滉斗さんのギターカバー。',
    true,
    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM representative_songs WHERE instrument_id = guitar_id),
    '若井滉斗',
    'https://youtu.be/3vQkWyUWWj4?si=vpunNNb1qKoarNpK'
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = guitar_id 
      AND title = 'ライラック' 
      AND composer = 'Mrs. GREEN APPLE'
  );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  IF inserted_count > 0 THEN
    RAISE NOTICE 'ギターの「ライラック」を追加しました（若井滉斗さんの演奏）';
  ELSE
    RAISE NOTICE '「ライラック」は既に存在するか、追加に失敗しました。';
  END IF;
END $$;
