-- フルートの活躍曲を追加: メヌエット「アルルの女」第２組曲 ３メヌエット
DO $$
DECLARE
  flute_id UUID := '550e8400-e29b-41d4-a716-446655440004';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = flute_id;
  
  -- メヌエット「アルルの女」第２組曲 ３メヌエットを追加
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
    flute_id,
    'メヌエット「アルルの女」第２組曲 ３メヌエット',
    'ビゼー',
    'ロマン派',
    '組曲',
    3,
    'https://youtu.be/DxUYsJaGaBA?si=x0vkJf2N-fDHbUBW',
    'ビゼーの「アルルの女」第２組曲より、優雅なメヌエット。フルートの美しい旋律が印象的。',
    'noboru 1947-3',
    'https://youtu.be/DxUYsJaGaBA?si=x0vkJf2N-fDHbUBW',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1
    FROM representative_songs
    WHERE instrument_id = flute_id
      AND title = 'メヌエット「アルルの女」第２組曲 ３メヌエット'
      AND composer = 'ビゼー'
  );
  
  RAISE NOTICE 'フルートの活躍曲を追加しました: メヌエット「アルルの女」第２組曲 ３メヌエット';
END $$;
