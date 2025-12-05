-- ============================================
-- バイオリンの代表曲を復元・整理するマイグレーション
-- ============================================
-- 実行日: 2025-12-03
-- ============================================
-- このマイグレーションは、バイオリンの代表曲を元の設定に復元し、
-- すべての代表曲を整理します
-- ============================================

-- 1. representative_songsテーブルが存在することを確認
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'representative_songs') THEN
    RAISE NOTICE 'representative_songsテーブルが存在しません。先にテーブルを作成してください。';
    RETURN;
  END IF;
END $$;

-- 2. instrumentsテーブルにバイオリンが存在することを確認
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440003') THEN
    -- バイオリンを挿入（存在しない場合）
    INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) 
    VALUES ('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#6B4423', '#C9A961', '#D4AF37', 'G3', ARRAY['G3', 'D4', 'A4', 'E5'])
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'バイオリンデータを挿入しました';
  END IF;
END $$;

-- 3. バイオリンの代表曲データを復元・整理
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
BEGIN
  -- 既存のバイオリンの代表曲を一旦削除（整理のため）
  -- ただし、これは慎重に行う必要があるため、コメントアウト
  -- DELETE FROM representative_songs WHERE instrument_id = violin_id;
  
  -- 元々設定されていた代表曲を追加（重複チェック付き）
  -- 1. コウモリ序曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'コウモリ序曲', 'ヨハン・シュトラウス2世', 'ロマン派', 'オペレッタ', 4, 'https://youtu.be/BugDZWgVQnY?si=k-wwJiiY_lfx2wWI', 'オペレッタ「こうもり」の序曲。ウィーンを代表する軽快で華やかな旋律。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'コウモリ序曲' AND composer = 'ヨハン・シュトラウス2世');
  
  -- 2. 情熱大陸
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, '情熱大陸', '葉加瀬太郎', '現代', 'テレビ音楽', 3, 'https://www.youtube.com/watch?v=example_passion', 'TBS系「情熱大陸」のテーマ曲。現代的なバイオリンの音色で知られる。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = '情熱大陸' AND composer = '葉加瀬太郎');
  
  -- 3. G線のアリア
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'G線のアリア', 'ヨハン・セバスチャン・バッハ', 'バロック', 'クラシック', 3, 'https://www.youtube.com/watch?v=example_g_string', 'バッハの管弦楽組曲第3番から編曲された名曲。G線のみで演奏される美しい旋律。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'G線のアリア' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  -- 4. チャルダッシュ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'チャルダッシュ', 'ヴィットーリオ・モンティ', 'ロマン派', 'クラシック', 3, 'https://youtu.be/rXd1S2oiaTg?si=W-l35GBLXG1J11wW', 'ハンガリーの民族舞踊をモチーフにした華麗な作品。バイオリンの技巧を存分に発揮できる。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'チャルダッシュ' AND composer = 'ヴィットーリオ・モンティ');
  
  -- 5. ツィゴイネルワイゼン
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'ツィゴイネルワイゼン', 'パブロ・デ・サラサーテ', 'ロマン派', 'クラシック', 5, 'https://www.youtube.com/watch?v=example_zigeuner', 'ジプシーの音楽を題材にした超絶技巧の名曲。バイオリニストの登竜門として知られる。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'ツィゴイネルワイゼン' AND composer = 'パブロ・デ・サラサーテ');
  
  -- 6. カプリース第24番
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'カプリース第24番', 'ニコロ・パガニーニ', 'ロマン派', 'クラシック', 5, 'https://www.youtube.com/watch?v=example_caprice24', 'パガニーニの24のカプリースの中でも最も有名な作品。超絶技巧の集大成。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'カプリース第24番' AND composer = 'ニコロ・パガニーニ');
  
  -- 7. 四季「春」
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, '四季「春」', 'アントニオ・ヴィヴァルディ', 'バロック', 'クラシック', 2, 'https://www.youtube.com/watch?v=example_spring', 'バロック時代の名作。春の訪れを美しく表現した協奏曲。', true, 7
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = '四季「春」' AND composer = 'アントニオ・ヴィヴァルディ');
  
  -- 8. 愛のあいさつ（愛の挨拶）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, '愛のあいさつ', 'エドワード・エルガー', 'ロマン派', 'クラシック', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'エルガーの最も美しい作品の一つ。結婚式でもよく演奏されるロマンチックな名曲。', true, 8
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = '愛のあいさつ' AND composer = 'エドワード・エルガー');
  
  -- 9. ハバネラ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'ハバネラ', 'ジョルジュ・ビゼー', 'ロマン派', 'オペラ', 3, 'https://www.youtube.com/watch?v=example_habanera', 'カルメンの有名なアリアをバイオリン用に編曲。情熱的で印象的な旋律。', true, 9
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'ハバネラ' AND composer = 'ジョルジュ・ビゼー');
  
  -- 10. ユーモレスク
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'ユーモレスク', 'アントニン・ドヴォルザーク', 'ロマン派', 'クラシック', 2, 'https://www.youtube.com/watch?v=example_humoresque', 'チェコの作曲家による親しみやすい小品。美しい旋律が印象的。', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'ユーモレスク' AND composer = 'アントニン・ドヴォルザーク');
  
  -- 11. メンデルスゾーンのバイオリン協奏曲 第1楽章
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'メンデルスゾーンのバイオリン協奏曲 第1楽章', 'フェリックス・メンデルスゾーン', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example_mendelssohn', 'ロマン派の名協奏曲。美しい旋律と技巧的なパッセージが魅力。', true, 11
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'メンデルスゾーンのバイオリン協奏曲 第1楽章' AND composer = 'フェリックス・メンデルスゾーン');
  
  -- 12. ブラームスのバイオリン協奏曲 第1楽章
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'ブラームスのバイオリン協奏曲 第1楽章', 'ヨハネス・ブラームス', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example_brahms', 'ドイツ・ロマン派の巨匠による重厚で技巧的な協奏曲。', true, 12
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'ブラームスのバイオリン協奏曲 第1楽章' AND composer = 'ヨハネス・ブラームス');
  
  -- 13. 二つのバイオリンのための協奏曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, '二つのバイオリンのための協奏曲', 'ヨハン・セバスチャン・バッハ', 'バロック', '協奏曲', 4, 'https://youtu.be/P_4rbNHsPaQ?si=2f2uIoBmkNSbPY87', 'バッハの二重協奏曲。二つのバイオリンが美しく絡み合う名作。', true, 13
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = '二つのバイオリンのための協奏曲' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  -- 追加の代表曲（他のマイグレーションで追加されたものも含める）
  -- 14. カノン
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'カノン', 'パッヘルベル', 'バロック', 'カノン', 2, 'https://www.youtube.com/watch?v=NlprozGcs80', '美しい和声進行で知られる名曲。', true, 14
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'カノン' AND composer = 'パッヘルベル');
  
  -- 15. サマータイム
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'サマータイム', 'ガーシュウィン', '近代', 'ジャズ', 3, 'https://www.youtube.com/watch?v=O7-Qa92Rzb4', 'ジャズクラシックの名曲。', true, 15
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'サマータイム' AND composer = 'ガーシュウィン');
  
  RAISE NOTICE 'バイオリンの代表曲を復元しました（合計15曲）';
  
END $$;

-- 4. マイグレーション完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'バイオリンの代表曲復元マイグレーション完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE '以下の代表曲が追加されました:';
  RAISE NOTICE '1. コウモリ序曲（ヨハン・シュトラウス2世）';
  RAISE NOTICE '2. 情熱大陸（葉加瀬太郎）';
  RAISE NOTICE '3. G線のアリア（バッハ）';
  RAISE NOTICE '4. チャルダッシュ（モンティ）';
  RAISE NOTICE '5. ツィゴイネルワイゼン（サラサーテ）';
  RAISE NOTICE '6. カプリース第24番（パガニーニ）';
  RAISE NOTICE '7. 四季「春」（ヴィヴァルディ）';
  RAISE NOTICE '8. 愛のあいさつ（エルガー）';
  RAISE NOTICE '9. ハバネラ（ビゼー）';
  RAISE NOTICE '10. ユーモレスク（ドヴォルザーク）';
  RAISE NOTICE '11. メンデルスゾーンのバイオリン協奏曲';
  RAISE NOTICE '12. ブラームスのバイオリン協奏曲';
  RAISE NOTICE '13. 二つのバイオリンのための協奏曲（バッハ）';
  RAISE NOTICE '14. カノン（パッヘルベル）';
  RAISE NOTICE '15. サマータイム（ガーシュウィン）';
  RAISE NOTICE '========================================';
END $$;

