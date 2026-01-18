-- ピアノの代表曲に「革命のエチュード（ショパン、juliusl9の演奏）」を追加
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
  
  -- 革命のエチュード（juliusl9の演奏）を追加
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
    '革命のエチュード',
    'フレデリック・ショパン',
    'ロマン派',
    '練習曲',
    5,
    'https://youtu.be/Mk1JQk90UbY?si=Jw8dEvepTm8LLunK',
    'ショパンの練習曲集より。左手の激しい動きが圧巻。',
    'juliusl9',
    'https://youtu.be/Mk1JQk90UbY?si=Jw8dEvepTm8LLunK',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = piano_id 
      AND (title = '革命のエチュード' OR title = '革命のエチュード op.10-12')
      AND (composer = 'フレデリック・ショパン' OR composer = 'ショパン')
      AND famous_performer = 'juliusl9'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'ピアノの代表曲に「革命のエチュード（juliusl9の演奏）」を追加しました';
  ELSE
    RAISE NOTICE '「革命のエチュード（juliusl9の演奏）」は既に登録されています。';
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
  AND (title = '革命のエチュード' OR title LIKE '%革命のエチュード%')
  AND (composer LIKE '%ショパン%' OR composer LIKE '%Chopin%')
ORDER BY display_order;
