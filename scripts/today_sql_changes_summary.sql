-- ============================================
-- 今日のSQL変更まとめ
-- 作成日: 2026-01-15
-- ============================================
-- Supabase StudioのSQL Editorで実行してください
-- 各セクションを個別に実行することも可能です
-- ============================================

-- ============================================
-- 1. バイオリンの代表曲 - 更新・追加・削除
-- ============================================

-- 1-1. バイオリンの「幻想即興曲」の説明を更新
UPDATE representative_songs
SET description_ja = 'ショパンの幻想即興曲をバイオリンで演奏。ウィル - ViolinChannelによる演奏。'
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'::UUID
  AND title = '幻想即興曲'
  AND composer = 'ショパン';

-- 1-2. バイオリンの「G線上のアリア」を削除
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  deleted_count INTEGER;
BEGIN
  DELETE FROM representative_songs
  WHERE instrument_id = violin_id
    AND (title = 'G線上のアリア' OR title = 'G線のアリア')
    AND composer LIKE '%バッハ%';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'バイオリンの「G線上のアリア」を % 件削除しました', deleted_count;
END $$;

-- 1-3. バイオリンの「カプリース24番」を追加（David Garrett）
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  max_display_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs WHERE instrument_id = violin_id;
  
  INSERT INTO representative_songs (
    instrument_id, title, composer, era, genre, difficulty_level,
    youtube_url, description_ja, famous_performer, famous_video_url, is_popular, display_order
  )
  SELECT 
    violin_id, 'カプリース24番', 'パガニーニ', 'ロマン派', '練習曲', 5,
    'https://youtu.be/ITzcZia7fsQ?si=wNfypX7Wy7UYjG3a',
    'パガニーニの24のカプリースより第24番。超絶技巧を要する名曲。',
    'David Garrett', 'https://youtu.be/ITzcZia7fsQ?si=wNfypX7Wy7UYjG3a', true, max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 FROM representative_songs 
    WHERE instrument_id = violin_id AND title = 'カプリース24番' AND composer = 'パガニーニ'
  );
END $$;

-- 1-4. バイオリンの「メンデルスゾーンのバイオリン協奏曲」を追加（Itzhak Perlman）
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  max_display_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs WHERE instrument_id = violin_id;
  
  INSERT INTO representative_songs (
    instrument_id, title, composer, era, genre, difficulty_level,
    youtube_url, description_ja, famous_performer, famous_video_url, is_popular, display_order
  )
  SELECT 
    violin_id, 'メンデルスゾーンのバイオリン協奏曲', 'フェリックス・メンデルスゾーン', 'ロマン派', '協奏曲', 4,
    'https://youtu.be/PC6cPairOTA?si=U8Jo-Pu5Ybx8fqqV',
    'ロマン派の名協奏曲。美しい旋律と技巧的なパッセージが魅力。',
    'Itzhak Perlman', 'https://youtu.be/PC6cPairOTA?si=U8Jo-Pu5Ybx8fqqV', true, max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 FROM representative_songs 
    WHERE instrument_id = violin_id AND title = 'メンデルスゾーンのバイオリン協奏曲' AND composer = 'フェリックス・メンデルスゾーン'
  );
END $$;

-- 1-5. バイオリンの「ツィゴイネルワイゼン」を追加（ひまりちゃん）
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  max_display_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs WHERE instrument_id = violin_id;
  
  INSERT INTO representative_songs (
    instrument_id, title, composer, era, genre, difficulty_level,
    youtube_url, description_ja, famous_performer, famous_video_url, is_popular, display_order
  )
  SELECT 
    violin_id, 'ツィゴイネルワイゼン', 'パブロ・デ・サラサーテ', 'ロマン派', 'クラシック', 5,
    'https://youtu.be/4H6BitFb9zw?si=EVXpLg1o4PUE3A5E',
    'ジプシーの音楽を題材にした超絶技巧の名曲。バイオリニストの登竜門として知られる。',
    'ひまりちゃん (Химари Йошимура)', 'https://youtu.be/4H6BitFb9zw?si=EVXpLg1o4PUE3A5E', true, max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 FROM representative_songs 
    WHERE instrument_id = violin_id AND title = 'ツィゴイネルワイゼン' 
      AND composer = 'パブロ・デ・サラサーテ'
      AND famous_performer = 'ひまりちゃん (Химари Йошимура)'
  );
END $$;

-- 1-6. バイオリンの「愛のあいさつ」を追加（宮本笑里）
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  max_display_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs WHERE instrument_id = violin_id;
  
  INSERT INTO representative_songs (
    instrument_id, title, composer, era, genre, difficulty_level,
    youtube_url, description_ja, famous_performer, famous_video_url, is_popular, display_order
  )
  SELECT 
    violin_id, '愛のあいさつ', 'エドワード・エルガー', 'ロマン派', 'クラシック', 2,
    'https://youtu.be/dBrtiVWxGZg?si=1gk7awyWpvAdgdQr',
    '結婚式でよく演奏される美しい旋律。ロマンチックで親しみやすい作品。',
    '宮本笑里', 'https://youtu.be/dBrtiVWxGZg?si=1gk7awyWpvAdgdQr', true, max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 FROM representative_songs 
    WHERE instrument_id = violin_id AND (title = '愛のあいさつ' OR title = '愛の挨拶')
      AND composer = 'エドワード・エルガー' AND famous_performer = '宮本笑里'
  );
END $$;

-- 1-7. バイオリンの「ブラームスのバイオリン協奏曲」のURLと演奏者情報を更新
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  updated_count INTEGER;
BEGIN
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
  
  IF updated_count = 0 THEN
    -- 更新対象が見つからない場合は新規追加
    DECLARE
      max_display_order INTEGER;
    BEGIN
      SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
      FROM representative_songs WHERE instrument_id = violin_id;
      
      INSERT INTO representative_songs (
        instrument_id, title, composer, era, genre, difficulty_level,
        youtube_url, description_ja, famous_performer, famous_video_url, is_popular, display_order
      )
      VALUES (
        violin_id, 'ブラームスのバイオリン協奏曲', 'ヨハネス・ブラームス', 'ロマン派', '協奏曲', 5,
        'https://youtu.be/UFl9xuYP5T8?si=ihIT1nHyUv_vTCXU',
        'ドイツ・ロマン派の巨匠による重厚で技巧的な協奏曲。Hilary Hahnによる演奏。',
        'Hilary Hahn', 'https://youtu.be/UFl9xuYP5T8?si=ihIT1nHyUv_vTCXU', true, max_display_order + 1
      );
    END;
  END IF;
END $$;

-- ============================================
-- 2. チェロの代表曲 - 追加
-- ============================================

-- 2-1. チェロの「G線上のアリア」を追加（HAUSER）
DO $$
DECLARE
  cello_id UUID := '550e8400-e29b-41d4-a716-446655440004';
  max_display_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs WHERE instrument_id = cello_id;
  
  INSERT INTO representative_songs (
    instrument_id, title, composer, era, genre, difficulty_level,
    youtube_url, description_ja, famous_performer, famous_video_url, is_popular, display_order
  )
  SELECT 
    cello_id, 'G線上のアリア', 'ヨハン・セバスチャン・バッハ', 'バロック', 'クラシック', 3,
    'https://youtu.be/CvglW3KNSsQ?si=enewA8K8QF_RJ-Xk',
    'バッハの管弦楽組曲第3番から編曲された名曲。G線のみで演奏される美しい旋律。',
    'HAUSER', 'https://youtu.be/CvglW3KNSsQ?si=enewA8K8QF_RJ-Xk', true, max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 FROM representative_songs 
    WHERE instrument_id = cello_id AND title = 'G線上のアリア' 
      AND composer = 'ヨハン・セバスチャン・バッハ' AND famous_performer = 'HAUSER'
  );
END $$;

-- ============================================
-- 3. ピアノの代表曲 - 追加・重複削除
-- ============================================

-- 3-1. ピアノの「革命のエチュード」を追加（juliusl9）
DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  max_display_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM representative_songs WHERE instrument_id = piano_id;
  
  INSERT INTO representative_songs (
    instrument_id, title, composer, era, genre, difficulty_level,
    youtube_url, description_ja, famous_performer, famous_video_url, is_popular, display_order
  )
  SELECT 
    piano_id, '革命のエチュード', 'フレデリック・ショパン', 'ロマン派', '練習曲', 5,
    'https://youtu.be/Mk1JQk90UbY?si=Jw8dEvepTm8LLunK',
    'ショパンの練習曲集より。左手の激しい動きが圧巻。',
    'juliusl9', 'https://youtu.be/Mk1JQk90UbY?si=Jw8dEvepTm8LLunK', true, max_display_order + 1
  WHERE NOT EXISTS (
    SELECT 1 FROM representative_songs 
    WHERE instrument_id = piano_id AND (title = '革命のエチュード' OR title = '革命のエチュード op.10-12')
      AND (composer = 'フレデリック・ショパン' OR composer = 'ショパン') AND famous_performer = 'juliusl9'
  );
END $$;

-- 3-2. ピアノの「幻想即興曲」の重複を削除
DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  deleted_count INTEGER;
  keep_id UUID;
BEGIN
  -- 演奏者情報があるものを優先して保持
  SELECT id INTO keep_id
  FROM representative_songs
  WHERE instrument_id = piano_id
    AND (title = '幻想即興曲' OR title LIKE '%幻想即興曲%')
    AND (composer LIKE '%ショパン%' OR composer LIKE '%Chopin%')
  ORDER BY 
    CASE WHEN famous_performer IS NOT NULL AND famous_performer != '' THEN 0 ELSE 1 END,
    created_at DESC
  LIMIT 1;
  
  -- 保持するレコード以外を削除
  DELETE FROM representative_songs
  WHERE instrument_id = piano_id
    AND (title = '幻想即興曲' OR title LIKE '%幻想即興曲%')
    AND (composer LIKE '%ショパン%' OR composer LIKE '%Chopin%')
    AND id != keep_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE 'ピアノの「幻想即興曲」の重複を % 件削除しました。ID % を保持しました。', deleted_count, keep_id;
  END IF;
END $$;

-- ============================================
-- 実行結果の確認
-- ============================================

-- バイオリンの代表曲を確認
SELECT 'バイオリン' as instrument, title, composer, famous_performer, youtube_url, display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003'::UUID
  AND (
    title IN ('カプリース24番', 'メンデルスゾーンのバイオリン協奏曲', 'ツィゴイネルワイゼン', '愛のあいさつ', '愛の挨拶')
    OR title LIKE '%ブラームス%バイオリン協奏曲%'
  )
ORDER BY display_order;

-- チェロの代表曲を確認
SELECT 'チェロ' as instrument, title, composer, famous_performer, youtube_url, display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440004'::UUID
  AND title = 'G線上のアリア'
ORDER BY display_order;

-- ピアノの代表曲を確認
SELECT 'ピアノ' as instrument, title, composer, famous_performer, youtube_url, display_order
FROM representative_songs
WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440001'::UUID
  AND (title = '革命のエチュード' OR title = '幻想即興曲')
ORDER BY display_order;
