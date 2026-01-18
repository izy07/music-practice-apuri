-- ヴィオラの代表曲に「Canon in D (Pachelbel) - Viola & Piano」を追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  viola_id UUID := '550e8400-e29b-41d4-a716-446655440018';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = viola_id;
  
  -- Canon in D (Pachelbel) - Viola & Pianoを追加
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
    viola_id,
    'Canon in D (Pachelbel) - Viola & Piano',
    'パッヘルベル',
    'バロック',
    'クラシック',
    3,
    'https://youtu.be/A5tfQi92UI0?si=CulsonTZGcVBAdDX',
    'パッヘルベルの「カノン ニ長調」。ヴィオラとピアノによる美しいアレンジ。',
    '캣올린CatOlin',
    'https://youtu.be/A5tfQi92UI0?si=CulsonTZGcVBAdDX',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = viola_id 
      AND youtube_url = 'https://youtu.be/A5tfQi92UI0?si=CulsonTZGcVBAdDX'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'ヴィオラの代表曲に「Canon in D (Pachelbel) - Viola & Piano」を追加しました';
  ELSE
    RAISE NOTICE '「Canon in D (Pachelbel) - Viola & Piano」は既に登録されています。';
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440018'::UUID
  AND youtube_url = 'https://youtu.be/A5tfQi92UI0?si=CulsonTZGcVBAdDX'
ORDER BY display_order;
