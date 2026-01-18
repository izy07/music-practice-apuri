-- トランペットの代表曲に「ハイドン：トランペット協奏曲」を追加
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
  
  -- ハイドン：トランペット協奏曲を追加
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
    'J. Haydn: Concerto para Trompete e orquestra em Mi bemol maior',
    'ハイドン',
    '古典派',
    '協奏曲',
    4,
    'https://youtu.be/ZKdeqvmSq5M?si=cI6oTs1FBgPl8LjN',
    'ハイドンのトランペット協奏曲変ホ長調。トランペットの名曲として知られる古典派の協奏曲。',
    'apreciarmusica',
    'https://youtu.be/ZKdeqvmSq5M?si=cI6oTs1FBgPl8LjN',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = trumpet_id 
      AND youtube_url = 'https://youtu.be/ZKdeqvmSq5M?si=cI6oTs1FBgPl8LjN'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'トランペットの代表曲に「ハイドン：トランペット協奏曲」を追加しました';
  ELSE
    RAISE NOTICE '「ハイドン：トランペット協奏曲」は既に登録されています。';
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
  AND youtube_url = 'https://youtu.be/ZKdeqvmSq5M?si=cI6oTs1FBgPl8LjN'
ORDER BY display_order;
