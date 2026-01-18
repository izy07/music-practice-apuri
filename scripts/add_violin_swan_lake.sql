-- バイオリンの代表曲に「白鳥の湖」を追加
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
  
  -- 白鳥の湖を追加
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
    '白鳥の湖',
    'ピョートル・チャイコフスキー',
    'ロマン派',
    'バレエ音楽',
    4,
    'https://youtu.be/-tzvebu6U08?si=nV53o_1m25b14BRS',
    'チャイコフスキーの三大バレエの一つ。美しい旋律と叙情的な表現が特徴的な名曲。',
    'Sylwia Janiak-Kobylińska（指揮）/ Akademia Filmu i Telewizji',
    'https://youtu.be/-tzvebu6U08?si=nV53o_1m25b14BRS',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = violin_id 
      AND title = '白鳥の湖' 
      AND composer = 'ピョートル・チャイコフスキー'
      AND youtube_url = 'https://youtu.be/-tzvebu6U08?si=nV53o_1m25b14BRS'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'バイオリンの代表曲に「白鳥の湖」を追加しました';
  ELSE
    RAISE NOTICE '「白鳥の湖」は既に登録されています。';
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
  AND title = '白鳥の湖'
  AND composer = 'ピョートル・チャイコフスキー'
ORDER BY display_order;
