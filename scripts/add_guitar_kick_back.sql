-- ギターの代表曲に「チェンソーマン OP - KICK BACK」のギターカバーを追加
-- Yewonさんの演奏
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
  inserted_count INTEGER;
BEGIN
  -- チェンソーマン OP - KICK BACKのギターカバーを追加
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
    'KICK BACK',
    'チェンソーマン',
    '現代',
    'アニメソング',
    3,
    'https://youtu.be/epnuvyNj0FM?si=ddwEmwuZghTutu6D',
    'チェンソーマンのオープニングテーマ。Yewonさんのギターカバー。',
    true,
    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM representative_songs WHERE instrument_id = guitar_id),
    'Yewon',
    'https://youtu.be/epnuvyNj0FM?si=ddwEmwuZghTutu6D'
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = guitar_id 
      AND title = 'KICK BACK' 
      AND composer = 'チェンソーマン'
  );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  IF inserted_count > 0 THEN
    RAISE NOTICE 'ギターの「KICK BACK」を追加しました（Yewonさんの演奏）';
  ELSE
    RAISE NOTICE '「KICK BACK」は既に存在するか、追加に失敗しました。';
  END IF;
END $$;
