-- トランペットの代表曲を修正（「トランペット吹きの休日」と「ハトと少年」を分離）
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  trumpet_id UUID := '550e8400-e29b-41d4-a716-446655440005';
  deleted_count INTEGER;
  max_display_order INTEGER;
BEGIN
  -- 1. 混ざっている既存の「トランペット吹きの休日」関連の曲を削除
  DELETE FROM representative_songs
  WHERE instrument_id = trumpet_id
    AND (
      title LIKE '%トランペット吹き%休日%'
      OR title LIKE '%トランペット吹きと%'
      OR title LIKE '%Bugler%Holiday%'
      OR title LIKE '%ハトと少年%'
      OR (title LIKE '%天空の城%' AND composer LIKE '%久石%')
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '混ざっている既存の曲を % 件削除しました', deleted_count;
  
  -- 2. 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = trumpet_id;
  
  -- 3. 「トランペット吹きの休日」を追加
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
    trumpet_id,
    'トランペット吹きの休日',
    'ルロイ・アンダーソン',
    '現代',
    '吹奏楽',
    4,
    'https://youtu.be/qEV2IDqJA3o?si=o9mT146a-jCmFlVX',
    '3本のトランペットが、休みの日なのに忙しく吹き鳴らすような、非常に速くてコミカルな名曲。運動会のBGMなどでもよく耳にします。',
    '徳岡直樹',
    'https://youtu.be/qEV2IDqJA3o?si=o9mT146a-jCmFlVX',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = trumpet_id 
      AND title = 'トランペット吹きの休日'
      AND composer = 'ルロイ・アンダーソン'
  );
  
  -- 4. display_orderを更新
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = trumpet_id;
  
  -- 5. 「ハトと少年」を追加
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
    trumpet_id,
    'ハトと少年',
    '久石譲',
    '現代',
    '映画音楽',
    3,
    'https://youtu.be/8DJ1Rkv90rw?si=FAkh-eSZNvGYPsmX',
    '映画「天空の城ラピュタ」より。主人公パズーが朝、屋根の上で吹くあの有名なファンファーレ。',
    'ティム・モリソン（トランペット）',
    'https://youtu.be/8DJ1Rkv90rw?si=FAkh-eSZNvGYPsmX',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = trumpet_id 
      AND title = 'ハトと少年'
      AND composer = '久石譲'
  );
  
  RAISE NOTICE 'トランペットの代表曲を修正しました';
END $$;

-- 修正結果を確認
SELECT 
  title,
  composer,
  famous_performer,
  youtube_url,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440005'::UUID
  AND (
    title LIKE '%トランペット吹き%休日%'
    OR title LIKE '%ハトと少年%'
  )
ORDER BY display_order;
