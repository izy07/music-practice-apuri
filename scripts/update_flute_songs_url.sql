-- フルートの代表曲のYouTube URLを更新
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  flute_id UUID := '550e8400-e29b-41d4-a716-446655440004';
  updated_count INTEGER;
BEGIN
  -- 1. モーツァルト フルート協奏曲第2番ニ長調 K.314 のURLを更新
  UPDATE representative_songs
  SET 
    youtube_url = 'https://youtu.be/l2EvHNzQV_M?si=yGpWzJQMn_x-Nzpi',
    famous_video_url = 'https://youtu.be/l2EvHNzQV_M?si=yGpWzJQMn_x-Nzpi',
    famous_performer = '高品質クラシック / High quality classical channels',
    updated_at = NOW()
  WHERE instrument_id = flute_id
    AND (
      (title LIKE '%フルート協奏曲%第2番%' OR title LIKE '%フルート協奏曲第2番%')
      AND composer LIKE '%モーツァルト%'
    );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'モーツァルト フルート協奏曲第2番のURLを % 件更新しました', updated_count;
  ELSE
    RAISE NOTICE 'モーツァルト フルート協奏曲第2番が見つかりませんでした。新規追加します。';
    -- 見つからない場合は新規追加
    INSERT INTO representative_songs (
      instrument_id, title, composer, era, genre, difficulty_level, 
      youtube_url, description_ja, is_popular, display_order,
      famous_performer, famous_video_url
    )
    SELECT 
      flute_id,
      'フルート協奏曲第2番ニ長調 K.314',
      'モーツァルト',
      '古典派',
      '協奏曲',
      4,
      'https://youtu.be/l2EvHNzQV_M?si=yGpWzJQMn_x-Nzpi',
      'モーツァルトの美しいフルート協奏曲。高品質クラシックチャンネルによる演奏。',
      true,
      (SELECT COALESCE(MAX(display_order), 0) + 1 FROM representative_songs WHERE instrument_id = flute_id),
      '高品質クラシック / High quality classical channels',
      'https://youtu.be/l2EvHNzQV_M?si=yGpWzJQMn_x-Nzpi'
    WHERE NOT EXISTS (
      SELECT 1 FROM representative_songs 
      WHERE instrument_id = flute_id 
        AND title LIKE '%フルート協奏曲%第2番%'
        AND composer LIKE '%モーツァルト%'
    );
  END IF;

  -- 2. Siciliano /Faure（シチリアーノ／フォーレ）のURLを更新
  UPDATE representative_songs
  SET 
    youtube_url = 'https://youtu.be/BYdjW0rKpH8?si=Psf-07JVgHO1wx9k',
    famous_video_url = 'https://youtu.be/BYdjW0rKpH8?si=Psf-07JVgHO1wx9k',
    famous_performer = 'Kayo Mitsunaga',
    updated_at = NOW()
  WHERE instrument_id = flute_id
    AND (
      (title LIKE '%シチリアーノ%' OR title LIKE '%Siciliano%')
      AND (composer LIKE '%フォーレ%' OR composer LIKE '%Faure%' OR composer LIKE '%フォーレ%')
    );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'フォーレ シチリアーノのURLを % 件更新しました', updated_count;
  ELSE
    RAISE NOTICE 'フォーレ シチリアーノが見つかりませんでした。新規追加します。';
    -- 見つからない場合は新規追加
    INSERT INTO representative_songs (
      instrument_id, title, composer, era, genre, difficulty_level, 
      youtube_url, description_ja, is_popular, display_order,
      famous_performer, famous_video_url
    )
    SELECT 
      flute_id,
      'シチリアーノ',
      'フォーレ',
      'ロマン派',
      '舞曲',
      3,
      'https://youtu.be/BYdjW0rKpH8?si=Psf-07JVgHO1wx9k',
      'フォーレの優雅なシチリアーノ舞曲。Kayo Mitsunagaによる演奏。',
      true,
      (SELECT COALESCE(MAX(display_order), 0) + 1 FROM representative_songs WHERE instrument_id = flute_id),
      'Kayo Mitsunaga',
      'https://youtu.be/BYdjW0rKpH8?si=Psf-07JVgHO1wx9k'
    WHERE NOT EXISTS (
      SELECT 1 FROM representative_songs 
      WHERE instrument_id = flute_id 
        AND title LIKE '%シチリアーノ%'
        AND (composer LIKE '%フォーレ%' OR composer LIKE '%Faure%')
    );
  END IF;
END $$;

-- 確認クエリ: 更新されたフルートの代表曲を表示
SELECT 
  title,
  composer,
  youtube_url,
  famous_video_url,
  famous_performer,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440004'
ORDER BY display_order;
