-- オーボエの活躍曲を更新
-- 既存の曲を削除して新しい曲を追加

DO $$
DECLARE
  oboe_id UUID := '550e8400-e29b-41d4-a716-446655440013';
BEGIN
  -- オーボエの既存の活躍曲をすべて削除
  DELETE FROM representative_songs
  WHERE instrument_id = oboe_id;
  
  RAISE NOTICE 'オーボエの既存の活躍曲を削除しました。';
  
  -- オーボエの新しい活躍曲を追加
  -- 1. 韃靼人の踊り（オペラ「イーゴリ公」より）
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
  VALUES (
    oboe_id,
    '韃靼人の踊り',
    'ボロディン',
    'ロマン派',
    'オペラ',
    4,
    'https://youtu.be/Uq984sKqokI?si=aSTt32MmymfZNepx',
    'オペラ「イーゴリ公」より「韃靼人の踊り」。オーボエの美しい旋律とリズムが印象的な名曲。',
    'Greatest Musics',
    'https://youtu.be/Uq984sKqokI?si=aSTt32MmymfZNepx',
    true,
    1
  );
  
  RAISE NOTICE 'オーボエの新しい活躍曲を追加しました。';
END $$;
