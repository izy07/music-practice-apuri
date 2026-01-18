-- サックスの代表曲に「名探偵コナン メインテーマ」を追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  saxophone_id UUID := '550e8400-e29b-41d4-a716-446655440007';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = saxophone_id;
  
  -- 名探偵コナン メインテーマを追加
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
    saxophone_id,
    '名探偵コナン メインテーマ',
    '大野克夫',
    '現代',
    'アニメ音楽',
    3,
    'https://youtu.be/g6dm2vjOaFY?si=G3uEekwEAmI9uu8E',
    '名探偵コナンのメインテーマ。サックスが活躍する吹奏楽アレンジ。',
    '浜松市消防音楽隊',
    'https://youtu.be/g6dm2vjOaFY?si=G3uEekwEAmI9uu8E',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = saxophone_id 
      AND (title = '名探偵コナン メインテーマ' OR title LIKE '%名探偵コナン%メインテーマ%')
      AND composer LIKE '%大野%'
      AND famous_performer = '浜松市消防音楽隊'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'サックスの代表曲に「名探偵コナン メインテーマ」を追加しました（浜松市消防音楽隊の演奏）';
  ELSE
    RAISE NOTICE '「名探偵コナン メインテーマ（浜松市消防音楽隊の演奏）」は既に登録されています。';
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440007'::UUID
  AND (title LIKE '%名探偵コナン%メインテーマ%' OR title = '名探偵コナン メインテーマ')
ORDER BY display_order;
