-- バイオリンの代表曲に「Autumn leaves」を追加またはURLを更新
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  updated_count INTEGER;
  max_display_order INTEGER;
BEGIN
  -- 既存の「Autumn leaves」を更新
  UPDATE representative_songs
  SET 
    youtube_url = 'https://youtu.be/7t3xBqAWLaU?si=Ae_dMCx-Vx4kfyHJ',
    famous_performer = 'JAzz Music Korea',
    famous_video_url = 'https://youtu.be/7t3xBqAWLaU?si=Ae_dMCx-Vx4kfyHJ',
    description_ja = COALESCE(description_ja, 'ジャズのスタンダード曲「Autumn leaves」。バイオリンの美しい演奏。')
  WHERE instrument_id = violin_id
    AND (
      title = 'Autumn leaves'
      OR title LIKE '%Autumn leaves%'
      OR title LIKE '%秋の葉%'
      OR title LIKE '%枯葉%'
    )
    AND (composer LIKE '%コスマ%' OR composer LIKE '%Kosma%' OR composer LIKE '%ジョゼフ%');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'バイオリンの「Autumn leaves」を % 件更新しました（JAzz Music Koreaの演奏）', updated_count;
  ELSE
    -- 更新対象が見つからない場合は新規追加
    SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
    FROM representative_songs
    WHERE instrument_id = violin_id;
    
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
      'Autumn leaves',
      'ジョゼフ・コスマ',
      '現代',
      'ジャズ',
      3,
      'https://youtu.be/7t3xBqAWLaU?si=Ae_dMCx-Vx4kfyHJ',
      'ジャズのスタンダード曲「Autumn leaves」。バイオリンの美しい演奏。',
      'JAzz Music Korea',
      'https://youtu.be/7t3xBqAWLaU?si=Ae_dMCx-Vx4kfyHJ',
      true,
      max_display_order + 1
    );
    
    RAISE NOTICE 'バイオリンの代表曲に「Autumn leaves」を新規追加しました（JAzz Music Koreaの演奏）';
  END IF;
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
    title = 'Autumn leaves'
    OR title LIKE '%Autumn leaves%'
    OR title LIKE '%秋の葉%'
    OR title LIKE '%枯葉%'
  )
ORDER BY display_order;
