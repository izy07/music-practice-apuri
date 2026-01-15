-- トランペットとクラリネットの活躍曲を更新
-- 既存の曲を削除して新しい曲を追加

DO $$
DECLARE
  trumpet_id UUID := '550e8400-e29b-41d4-a716-446655440005';
  clarinet_id UUID := '550e8400-e29b-41d4-a716-446655440009';
BEGIN
  -- トランペットの既存の活躍曲をすべて削除
  DELETE FROM representative_songs
  WHERE instrument_id = trumpet_id;
  
  RAISE NOTICE 'トランペットの既存の活躍曲を削除しました。';
  
  -- トランペットの新しい活躍曲を追加
  -- 1. トランペット吹きの休日（Tp082） - 天空の城ラピュタ ハトと少年
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
    trumpet_id,
    'トランペット吹きの休日（Tp082）',
    '久石譲',
    '現代',
    '映画音楽',
    3,
    'https://youtu.be/8DJ1Rkv90rw?si=0QK-TZAciIpbCgYL',
    '天空の城ラピュタより「ハトと少年」。トランペットの美しい旋律が印象的な名曲。',
    'ティム・モリソン（トランペット）',
    'https://youtu.be/8DJ1Rkv90rw?si=0QK-TZAciIpbCgYL',
    true,
    1
  );
  
  -- 2. 展覧会の絵 - Promenade (part 1)
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
    trumpet_id,
    '展覧会の絵: Promenade (part 1)',
    'ムソルグスキー',
    'ロマン派',
    '組曲',
    4,
    'https://youtu.be/_5r8sa863Ts?si=bNgdoFTowz3INhFX',
    'ムソルグスキーの組曲「展覧会の絵」より「プロムナード」。トランペットの雄大な旋律が特徴的。',
    'listener077',
    'https://youtu.be/_5r8sa863Ts?si=bNgdoFTowz3INhFX',
    true,
    2
  );
  
  RAISE NOTICE 'トランペットの新しい活躍曲を追加しました。';
  
  -- クラリネットの既存の活躍曲をすべて削除
  DELETE FROM representative_songs
  WHERE instrument_id = clarinet_id;
  
  RAISE NOTICE 'クラリネットの既存の活躍曲を削除しました。';
  
  -- クラリネットの新しい活躍曲を追加
  -- 1. クラリネット・ポルカ（Clarinet Polka）
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
    clarinet_id,
    'クラリネット・ポルカ',
    '伝統曲',
    '伝統',
    '舞曲',
    3,
    'https://youtu.be/8dYGm_rNhAA?si=0ywCQCGq9JTfLUSr',
    'クラリネットの代表的なポルカ。軽快で楽しい旋律が特徴的。',
    'Masaaki Fujiwara',
    'https://youtu.be/8dYGm_rNhAA?si=0ywCQCGq9JTfLUSr',
    true,
    1
  );
  
  RAISE NOTICE 'クラリネットの新しい活躍曲を追加しました。';
END $$;
