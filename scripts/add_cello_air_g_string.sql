-- チェロの代表曲に「G線上のアリア（HAUSERの演奏）」を追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  cello_id UUID := '550e8400-e29b-41d4-a716-446655440004';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = cello_id;
  
  -- G線上のアリア（HAUSERの演奏）を追加
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
    cello_id,
    'G線上のアリア',
    'ヨハン・セバスチャン・バッハ',
    'バロック',
    'クラシック',
    3,
    'https://youtu.be/CvglW3KNSsQ?si=enewA8K8QF_RJ-Xk',
    'バッハの管弦楽組曲第3番から編曲された名曲。G線のみで演奏される美しい旋律。',
    'HAUSER',
    'https://youtu.be/CvglW3KNSsQ?si=enewA8K8QF_RJ-Xk',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = cello_id 
      AND title = 'G線上のアリア' 
      AND composer = 'ヨハン・セバスチャン・バッハ'
      AND famous_performer = 'HAUSER'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'チェロの代表曲に「G線上のアリア（HAUSERの演奏）」を追加しました';
  ELSE
    RAISE NOTICE '「G線上のアリア（HAUSERの演奏）」は既に登録されています。';
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440004'::UUID
  AND title = 'G線上のアリア'
  AND composer = 'ヨハン・セバスチャン・バッハ'
ORDER BY display_order;
