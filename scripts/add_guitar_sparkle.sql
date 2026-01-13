-- ギターの代表曲に「スパークル」のフィンガースタイルギターカバーを追加
-- Edward Ongさんの演奏
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
  inserted_count INTEGER;
BEGIN
  -- 君の名は。「スパークル」のフィンガースタイルギターカバーを追加
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
    'スパークル',
    '君の名は。',
    '現代',
    'アニメソング',
    4,
    'https://youtu.be/w-tYngyVXLM?si=Qkoc_Aq5qjMGbR7t',
    '君の名は。の名曲。Edward Ongさんのフィンガースタイルギターカバー。',
    true,
    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM representative_songs WHERE instrument_id = guitar_id),
    'Edward Ong',
    'https://youtu.be/w-tYngyVXLM?si=Qkoc_Aq5qjMGbR7t'
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = guitar_id 
      AND title = 'スパークル' 
      AND composer = '君の名は。'
  );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  IF inserted_count > 0 THEN
    RAISE NOTICE 'ギターの「スパークル」を追加しました（Edward Ongさんの演奏）';
  ELSE
    RAISE NOTICE '「スパークル」は既に存在するか、追加に失敗しました。';
  END IF;
END $$;
