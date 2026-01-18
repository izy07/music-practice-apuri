-- バイオリンの代表曲に「ツィゴイネルワイゼン（ひまりちゃんの演奏）」を追加
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
  
  -- ツィゴイネルワイゼン（ひまりちゃんの演奏）を追加
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
    'ツィゴイネルワイゼン',
    'パブロ・デ・サラサーテ',
    'ロマン派',
    'クラシック',
    5,
    'https://youtu.be/4H6BitFb9zw?si=EVXpLg1o4PUE3A5E',
    'ジプシーの音楽を題材にした超絶技巧の名曲。バイオリニストの登竜門として知られる。',
    'ひまりちゃん (Химари Йошимура)',
    'https://youtu.be/4H6BitFb9zw?si=EVXpLg1o4PUE3A5E',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = violin_id 
      AND title = 'ツィゴイネルワイゼン' 
      AND composer = 'パブロ・デ・サラサーテ'
      AND famous_performer = 'ひまりちゃん (Химари Йошимура)'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'バイオリンの代表曲に「ツィゴイネルワイゼン（ひまりちゃんの演奏）」を追加しました';
  ELSE
    RAISE NOTICE '「ツィゴイネルワイゼン（ひまりちゃんの演奏）」は既に登録されています。';
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
  AND title = 'ツィゴイネルワイゼン'
  AND composer = 'パブロ・デ・サラサーテ'
ORDER BY display_order;
