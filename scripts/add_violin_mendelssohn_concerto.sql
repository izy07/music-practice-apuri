-- バイオリンの代表曲に「メンデルスゾーンのバイオリン協奏曲」を追加
-- Supabase StudioのSQL Editorで実行してください

DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  max_display_order INTEGER;
BEGIN
  -- 現在の最大display_orderを取得
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs
  WHERE instrument_id = violin_id;
  
  -- メンデルスゾーンのバイオリン協奏曲を追加
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
    violin_id,
    'メンデルスゾーンのバイオリン協奏曲',
    'フェリックス・メンデルスゾーン',
    'ロマン派',
    '協奏曲',
    4,
    'https://youtu.be/PC6cPairOTA?si=U8Jo-Pu5Ybx8fqqV',
    'ロマン派の名協奏曲。美しい旋律と技巧的なパッセージが魅力。',
    'Itzhak Perlman',
    'https://youtu.be/PC6cPairOTA?si=U8Jo-Pu5Ybx8fqqV',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = violin_id 
      AND title = 'メンデルスゾーンのバイオリン協奏曲' 
      AND composer = 'フェリックス・メンデルスゾーン'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'バイオリンの代表曲に「メンデルスゾーンのバイオリン協奏曲」を追加しました（Itzhak Perlmanの演奏）';
  ELSE
    RAISE NOTICE '「メンデルスゾーンのバイオリン協奏曲」は既に登録されています。';
  END IF;
END $$;

-- 追加結果を確認
SELECT 
  title,
  composer,
  famous_performer,
  youtube_url,
  display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'::UUID
  AND title = 'メンデルスゾーンのバイオリン協奏曲'
  AND composer = 'フェリックス・メンデルスゾーン'
ORDER BY display_order;
