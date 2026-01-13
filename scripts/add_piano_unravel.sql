-- ピアノの代表曲に「東京喰種トーキョーグール OP unravel」のピアノカバーを追加
-- Animenz Piano Sheetsさんの演奏
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  inserted_count INTEGER;
BEGIN
  -- 東京喰種トーキョーグール OP unravelのピアノカバーを追加
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
    piano_id,
    'unravel',
    '東京喰種トーキョーグール',
    '現代',
    'アニメソング',
    4,
    'https://youtu.be/sEQf5lcnj_o?si=23VDT4E-jqax5iZZ',
    '東京喰種トーキョーグールのオープニングテーマ。Animenz Piano Sheetsさんのピアノカバー。',
    true,
    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM representative_songs WHERE instrument_id = piano_id),
    'Animenz Piano Sheets',
    'https://youtu.be/sEQf5lcnj_o?si=23VDT4E-jqax5iZZ'
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = piano_id 
      AND title = 'unravel' 
      AND composer = '東京喰種トーキョーグール'
  );
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  IF inserted_count > 0 THEN
    RAISE NOTICE 'ピアノの「unravel」を追加しました（Animenz Piano Sheetsさんの演奏）';
  ELSE
    RAISE NOTICE '「unravel」は既に存在するか、追加に失敗しました。';
  END IF;
END $$;
