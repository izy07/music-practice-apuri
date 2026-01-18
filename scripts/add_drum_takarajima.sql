-- ドラムの代表曲に「宝島」を追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  drum_id UUID := '550e8400-e29b-41d4-a716-446655440006';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = drum_id;
  
  -- 宝島を追加
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
    drum_id,
    '宝島',
    '和泉宏隆',
    '現代',
    '吹奏楽',
    4,
    'https://youtu.be/PpqYYn2K1mQ?si=EQAzgEME-rh_Vnd-',
    '和泉宏隆作曲、真島俊夫編曲による吹奏楽曲。ドラムが活躍する名曲。',
    '川金アンサンブルリベルテ吹奏楽団',
    'https://youtu.be/PpqYYn2K1mQ?si=EQAzgEME-rh_Vnd-',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = drum_id 
      AND title = '宝島'
      AND composer = '和泉宏隆'
      AND famous_performer = '川金アンサンブルリベルテ吹奏楽団'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'ドラムの代表曲に「宝島」を追加しました';
  ELSE
    RAISE NOTICE '「宝島」は既に登録されています。';
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440006'::UUID
  AND title = '宝島'
  AND composer = '和泉宏隆'
ORDER BY display_order;
