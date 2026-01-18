-- バイオリンの既存の「Autumn Leaves」を削除して、新しい動画に置き換え
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  deleted_count INTEGER;
  max_display_order INTEGER;
BEGIN
  -- 既存の「Autumn Leaves」関連の曲を削除
  DELETE FROM representative_songs
  WHERE instrument_id = violin_id
    AND (
      title = 'Autumn leaves'
      OR title LIKE '%Autumn leaves%'
      OR title LIKE '%Autumn Leaves%'
      OR title LIKE '%AUTUMN LEAVES%'
      OR title LIKE '%秋の葉%'
      OR title LIKE '%枯葉%'
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'バイオリンの既存の「Autumn Leaves」を % 件削除しました', deleted_count;
  
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = violin_id;
  
  -- 新しい「Autumn leaves」を追加
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
    violin_id,
    '콘트라베이스 최준혁_이탈리아여행 중 거리연주가들과 함께 즉흥연주_Autumn leaves',
    'ジョゼフ・コスマ',
    '現代',
    'ジャズ',
    3,
    'https://youtu.be/7t3xBqAWLaU?si=ArauQ48ueW5Nbz0T',
    'ジャズのスタンダード曲「Autumn leaves」。イタリア旅行中の即興演奏。',
    'JAzz Music Korea',
    'https://youtu.be/7t3xBqAWLaU?si=ArauQ48ueW5Nbz0T',
    true,
    max_display_order + 1
  );
  
  RAISE NOTICE 'バイオリンの代表曲に新しい「Autumn leaves」を追加しました（JAzz Music Koreaの演奏）';
END $$;

-- 更新結果を確認
SELECT 
  title,
  composer,
  famous_performer,
  youtube_url,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'::UUID
  AND (
    title LIKE '%Autumn leaves%'
    OR title LIKE '%Autumn Leaves%'
    OR youtube_url = 'https://youtu.be/7t3xBqAWLaU?si=ArauQ48ueW5Nbz0T'
  )
ORDER BY display_order;
