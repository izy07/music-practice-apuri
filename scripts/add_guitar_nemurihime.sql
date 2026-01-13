-- ギターの代表曲に「眠り姫」のギター弾き語りカバーを追加
-- Shunさんの演奏
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
  inserted_count INTEGER;
BEGIN
  -- SEKAI NO OWARI「眠り姫」のギター弾き語りカバーを追加
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
    '眠り姫',
    'SEKAI NO OWARI',
    '現代',
    'J-POP',
    3,
    'https://youtu.be/6WOFbYdp2hs?si=EQqfjvMC2Ztz4AK_',
    'SEKAI NO OWARIの名曲。Shunさんのギター弾き語りカバー。',
    true,
    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM representative_songs WHERE instrument_id = guitar_id),
    'Shun',
    'https://youtu.be/6WOFbYdp2hs?si=EQqfjvMC2Ztz4AK_'
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = guitar_id 
      AND title = '眠り姫' 
      AND composer = 'SEKAI NO OWARI'
  );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  IF inserted_count > 0 THEN
    RAISE NOTICE 'ギターの「眠り姫」を追加しました（Shunさんの演奏）';
  ELSE
    RAISE NOTICE '「眠り姫」は既に存在するか、追加に失敗しました。';
  END IF;
END $$;
