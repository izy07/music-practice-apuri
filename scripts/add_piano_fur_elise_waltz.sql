-- ピアノの代表曲に「エリーゼのために」と「子犬のワルツ」を追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = piano_id;
  
  -- エリーゼのために（Lang Langの演奏）を追加
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
    piano_id,
    'エリーゼのために',
    'ルートヴィヒ・ヴァン・ベートーヴェン',
    '古典派',
    'バガテル',
    3,
    'https://youtu.be/s71I_EWJk7I?si=lZZdTyJCBi5Bgl0V',
    'ベートーヴェンの最も有名な作品の一つ。美しく親しみやすい旋律が特徴。',
    'Lang Lang',
    'https://youtu.be/s71I_EWJk7I?si=lZZdTyJCBi5Bgl0V',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = piano_id 
      AND (title = 'エリーゼのために' OR title = 'Für Elise' OR title LIKE '%エリーゼ%')
      AND composer LIKE '%ベートーヴェン%'
      AND famous_performer = 'Lang Lang'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'ピアノの代表曲に「エリーゼのために（Lang Langの演奏）」を追加しました';
  ELSE
    RAISE NOTICE '「エリーゼのために（Lang Langの演奏）」は既に登録されています。';
  END IF;
  
  -- display_orderを更新
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = piano_id;
  
  -- 子犬のワルツ（ショパン、pianomaedafulの演奏）を追加
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
    piano_id,
    '子犬のワルツ',
    'フレデリック・ショパン',
    'ロマン派',
    'ワルツ',
    3,
    'https://youtu.be/KXgYmOBHFj4?si=1dK9e54-k5koC_F7',
    'ショパンのワルツ第6番変ニ長調作品64-1。軽やかで愛らしい旋律が特徴的な名曲。',
    'pianomaedaful',
    'https://youtu.be/KXgYmOBHFj4?si=1dK9e54-k5koC_F7',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = piano_id 
      AND (title = '子犬のワルツ' OR title LIKE '%子犬%ワルツ%' OR title LIKE '%Valse op.64-1%')
      AND (composer = 'フレデリック・ショパン' OR composer = 'ショパン')
      AND famous_performer = 'pianomaedaful'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'ピアノの代表曲に「子犬のワルツ（pianomaedafulの演奏）」を追加しました';
  ELSE
    RAISE NOTICE '「子犬のワルツ（pianomaedafulの演奏）」は既に登録されています。';
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
  AND (
    (title = 'エリーゼのために' OR title LIKE '%エリーゼ%')
    OR (title = '子犬のワルツ' OR title LIKE '%子犬%ワルツ%')
  )
ORDER BY display_order;
