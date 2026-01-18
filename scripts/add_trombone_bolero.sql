-- トロンボーンの代表曲に「ボレロ一部」を追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  trombone_id UUID := '550e8400-e29b-41d4-a716-446655440010';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = trombone_id;
  
  -- ボレロ一部を追加
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
    trombone_id,
    'ボレロ一部',
    'モーリス・ラヴェル',
    '近代',
    '管弦楽',
    5,
    'https://youtu.be/d5SLpXOFStE?si=n_3GtkRVhC46mLAh',
    'ラヴェルの代表作「ボレロ」より。トロンボーンソロが印象的な名曲。',
    'Alexey Lobikov',
    'https://youtu.be/d5SLpXOFStE?si=n_3GtkRVhC46mLAh',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = trombone_id 
      AND (title = 'ボレロ一部' OR title LIKE '%ボレロ%一部%')
      AND composer LIKE '%ラヴェル%'
      AND famous_performer = 'Alexey Lobikov'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'トロンボーンの代表曲に「ボレロ一部」を追加しました';
  ELSE
    RAISE NOTICE '「ボレロ一部」は既に登録されています。';
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440010'::UUID
  AND (title LIKE '%ボレロ%一部%' OR title = 'ボレロ一部')
  AND composer LIKE '%ラヴェル%'
ORDER BY display_order;
