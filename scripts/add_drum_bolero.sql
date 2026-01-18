-- ドラムの代表曲に「ボレロ」を追加または更新
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  drum_id UUID := '550e8400-e29b-41d4-a716-446655440006';
  updated_count INTEGER;
  max_display_order INTEGER;
BEGIN
  -- 既存の「ボレロ」を更新
  UPDATE representative_songs
  SET 
    youtube_url = 'https://youtu.be/ODeNHRtVNO4?si=3hqW6gyyExNCoHfz',
    famous_performer = 'MChelovek2012',
    famous_video_url = 'https://youtu.be/ODeNHRtVNO4?si=3hqW6gyyExNCoHfz',
    description_ja = COALESCE(description_ja, 'ラヴェルの代表作「ボレロ」。ドラムが重要な役割を果たす名曲。')
  WHERE instrument_id = drum_id
    AND (title = 'ボレロ' OR title LIKE '%ボレロ%')
    AND composer LIKE '%ラヴェル%';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'ドラムの「ボレロ」を % 件更新しました（MChelovek2012の演奏）', updated_count;
  ELSE
    -- 更新対象が見つからない場合は新規追加
    SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
    FROM representative_songs
    WHERE instrument_id = drum_id;
    
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
      drum_id,
      'ボレロ',
      'モーリス・ラヴェル',
      '近代',
      '管弦楽',
      5,
      'https://youtu.be/ODeNHRtVNO4?si=3hqW6gyyExNCoHfz',
      'ラヴェルの代表作「ボレロ」。ドラムが重要な役割を果たす名曲。',
      'MChelovek2012',
      'https://youtu.be/ODeNHRtVNO4?si=3hqW6gyyExNCoHfz',
      true,
      max_display_order + 1
    );
    
    RAISE NOTICE 'ドラムの代表曲に「ボレロ」を新規追加しました（MChelovek2012の演奏）';
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
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440006'::UUID
  AND (title = 'ボレロ' OR title LIKE '%ボレロ%')
  AND composer LIKE '%ラヴェル%'
ORDER BY display_order;
