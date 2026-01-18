-- バイオリンの代表曲に「パガニーニ カプリース24番」を追加
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
  
  -- パガニーニ カプリース24番を追加
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
    'カプリース24番',
    'パガニーニ',
    'ロマン派',
    '練習曲',
    5,
    'https://youtu.be/ITzcZia7fsQ?si=wNfypX7Wy7UYjG3a',
    'パガニーニの24のカプリースより第24番。超絶技巧を要する名曲。',
    'David Garrett',
    'https://youtu.be/ITzcZia7fsQ?si=wNfypX7Wy7UYjG3a',
    true,
    max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 
    FROM representative_songs 
    WHERE instrument_id = violin_id 
      AND title = 'カプリース24番' 
      AND composer = 'パガニーニ'
  );
  
  IF FOUND THEN
    RAISE NOTICE 'バイオリンの代表曲に「パガニーニ カプリース24番」を追加しました（David Garrettの演奏）';
  ELSE
    RAISE NOTICE '「パガニーニ カプリース24番」は既に登録されています。';
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
  AND title = 'カプリース24番'
  AND composer = 'パガニーニ'
ORDER BY display_order;
