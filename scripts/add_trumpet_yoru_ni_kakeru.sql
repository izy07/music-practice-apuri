-- トランペットの代表曲に「夜に駆ける」（YOASOBI）を追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  trumpet_id UUID := '550e8400-e29b-41d4-a716-446655440005';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = trumpet_id;
  
  -- 夜に駆ける（YOASOBI、Musicproの演奏）を追加
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
  SELECT 
    trumpet_id,
    '夜に駆ける',
    'YOASOBI',
    '現代',
    'J-POP',
    3,
    'https://youtu.be/xDVH1a4Dnuk?si=yTgMY0V-YksbzKir',
    'YOASOBIの代表曲。トランペットによるカバー演奏。',
    'Musicpro',
    'https://youtu.be/xDVH1a4Dnuk?si=yTgMY0V-YksbzKir',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = trumpet_id 
      AND title = '夜に駆ける'
      AND composer = 'YOASOBI'
      AND famous_performer = 'Musicpro'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'トランペットの代表曲に「夜に駆ける（YOASOBI、Musicproの演奏）」を追加しました';
  ELSE
    RAISE NOTICE '「夜に駆ける（YOASOBI、Musicproの演奏）」は既に登録されています。';
  END IF;
END $$;

-- 追加結果を確認
SELECT 
  title,
  composer,
  famous_performer,
  youtube_url,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440005'::UUID
  AND title = '夜に駆ける'
  AND composer = 'YOASOBI'
ORDER BY display_order;
