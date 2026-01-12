-- ピアノの活躍曲にノクターン9番（op.9 No.2）を追加
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
  
  -- ノクターン9番（op.9 No.2）を追加
  INSERT INTO representative_songs (
    instrument_id, 
    title, 
    composer, 
    era, 
    genre, 
    difficulty_level, 
    youtube_url, 
    description_ja, 
    is_popular, 
    display_order,
    famous_performer,
    famous_video_url
  ) 
  SELECT 
    piano_id, 
    'ノクターン op.9 No.2', 
    'ショパン', 
    'ロマン派', 
    'ノクターン', 
    3, 
    'https://youtu.be/9E6b3swbnWg?si=QYskyG4C5h1_05AQ', 
    'ショパンの最も有名なノクターンの一つ。美しく優雅な旋律が印象的。', 
    true, 
    max_display_order + 1,
    'andrea romano',
    'https://youtu.be/9E6b3swbnWg?si=QYskyG4C5h1_05AQ'
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = piano_id 
      AND title = 'ノクターン op.9 No.2' 
      AND composer = 'ショパン'
  );
  
  RAISE NOTICE 'ピアノのノクターン op.9 No.2 を追加しました（display_order: %)', max_display_order + 1;
END $$;
