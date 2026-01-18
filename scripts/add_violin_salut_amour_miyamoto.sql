-- バイオリンの代表曲に「愛のあいさつ（宮本笑里の演奏）」を追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = violin_id;
  
  -- 愛のあいさつ（宮本笑里の演奏）を追加
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
    violin_id,
    '愛のあいさつ',
    'エドワード・エルガー',
    'ロマン派',
    'クラシック',
    2,
    'https://youtu.be/dBrtiVWxGZg?si=1gk7awyWpvAdgdQr',
    '結婚式でよく演奏される美しい旋律。ロマンチックで親しみやすい作品。',
    '宮本笑里',
    'https://youtu.be/dBrtiVWxGZg?si=1gk7awyWpvAdgdQr',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = violin_id 
      AND (title = '愛のあいさつ' OR title = '愛の挨拶')
      AND composer = 'エドワード・エルガー'
      AND famous_performer = '宮本笑里'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'バイオリンの代表曲に「愛のあいさつ（宮本笑里の演奏）」を追加しました';
  ELSE
    RAISE NOTICE '「愛のあいさつ（宮本笑里の演奏）」は既に登録されています。';
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'::UUID
  AND (title = '愛のあいさつ' OR title = '愛の挨拶')
  AND composer = 'エドワード・エルガー'
ORDER BY display_order;
