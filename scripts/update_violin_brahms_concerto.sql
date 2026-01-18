-- バイオリンの「ブラームスのバイオリン協奏曲」のURLと演奏者情報を更新
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  updated_count INTEGER;
BEGIN
  -- ブラームスのバイオリン協奏曲のURLと演奏者情報を更新
  UPDATE representative_songs
  SET 
    youtube_url = 'https://youtu.be/UFl9xuYP5T8?si=ihIT1nHyUv_vTCXU',
    famous_performer = 'Hilary Hahn',
    famous_video_url = 'https://youtu.be/UFl9xuYP5T8?si=ihIT1nHyUv_vTCXU',
    description_ja = COALESCE(description_ja, 'ドイツ・ロマン派の巨匠による重厚で技巧的な協奏曲。') || ' Hilary Hahnによる演奏。'
  WHERE instrument_id = violin_id
    AND (title LIKE '%ブラームス%バイオリン協奏曲%' OR title LIKE '%Brahms%Violin%')
    AND composer LIKE '%ブラームス%';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'バイオリンの「ブラームスのバイオリン協奏曲」を % 件更新しました（Hilary Hahnの演奏）', updated_count;
  ELSE
    -- 更新対象が見つからない場合は新規追加
    DECLARE
      max_display_order INTEGER;
    BEGIN
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
        'ブラームスのバイオリン協奏曲',
        'ヨハネス・ブラームス',
        'ロマン派',
        '協奏曲',
        5,
        'https://youtu.be/UFl9xuYP5T8?si=ihIT1nHyUv_vTCXU',
        'ドイツ・ロマン派の巨匠による重厚で技巧的な協奏曲。Hilary Hahnによる演奏。',
        'Hilary Hahn',
        'https://youtu.be/UFl9xuYP5T8?si=ihIT1nHyUv_vTCXU',
        true,
        max_display_order + 1
      );
      
      RAISE NOTICE 'バイオリンの代表曲に「ブラームスのバイオリン協奏曲」を新規追加しました（Hilary Hahnの演奏）';
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'::UUID
  AND (title LIKE '%ブラームス%バイオリン協奏曲%' OR title LIKE '%Brahms%Violin%')
  AND composer LIKE '%ブラームス%'
ORDER BY display_order;
