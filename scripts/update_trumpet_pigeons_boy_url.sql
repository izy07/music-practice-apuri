-- トランペットの「ハトと少年」のURLと演奏者情報を更新
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  trumpet_id UUID := '550e8400-e29b-41d4-a716-446655440005';
  updated_count INTEGER;
BEGIN
  -- 「ハトと少年」のURLと演奏者情報を更新
  UPDATE representative_songs
  SET 
    youtube_url = 'https://youtu.be/8DJ1Rkv90rw?si=FAkh-eSZNvGYPsmX',
    famous_performer = 'ティム・モリソン（トランペット）',
    famous_video_url = 'https://youtu.be/8DJ1Rkv90rw?si=FAkh-eSZNvGYPsmX',
    description_ja = COALESCE(description_ja, '映画「天空の城ラピュタ」より。主人公パズーが朝、屋根の上で吹くあの有名なファンファーレ。')
  WHERE instrument_id = trumpet_id
    AND (title = 'ハトと少年' OR title LIKE '%ハトと少年%')
    AND composer LIKE '%久石%';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'トランペットの「ハトと少年」を % 件更新しました（ティム・モリソンの演奏）', updated_count;
  ELSE
    -- 更新対象が見つからない場合は新規追加
    DECLARE
      max_display_order INTEGER;
    BEGIN
      SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
      FROM representative_songs
      WHERE instrument_id = trumpet_id;
      
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
      );
      
      RAISE NOTICE 'トランペットの代表曲に「ハトと少年」を新規追加しました（ティム・モリソンの演奏）';
    END;
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440005'::UUID
  AND (title = 'ハトと少年' OR title LIKE '%ハトと少年%')
  AND composer LIKE '%久石%'
ORDER BY display_order;
