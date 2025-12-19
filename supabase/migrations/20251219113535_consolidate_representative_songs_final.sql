-- ============================================
-- 代表曲テーブルの統合マイグレーション（最終版）
-- ============================================
-- このマイグレーションは、全ての楽器の代表曲を統合し、
-- ヴァイオリンは現状維持、他の楽器に10曲ずつ追加します
-- ============================================

-- 1. representative_songsテーブルの存在確認
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'representative_songs') THEN
    RAISE EXCEPTION 'representative_songsテーブルが存在しません。先にテーブルを作成してください。';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instruments') THEN
    RAISE EXCEPTION 'instrumentsテーブルが存在しません。先にテーブルを作成してください。';
  END IF;
END $$;

-- 2. 楽器IDの取得（変数として定義）
DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
  flute_id UUID := '550e8400-e29b-41d4-a716-446655440004';
  trumpet_id UUID := '550e8400-e29b-41d4-a716-446655440005';
  drums_id UUID := '550e8400-e29b-41d4-a716-446655440006';
  saxophone_id UUID := '550e8400-e29b-41d4-a716-446655440007';
  horn_id UUID := '550e8400-e29b-41d4-a716-446655440008';
  clarinet_id UUID := '550e8400-e29b-41d4-a716-446655440009';
  trombone_id UUID := '550e8400-e29b-41d4-a716-446655440010';
  cello_id UUID := '550e8400-e29b-41d4-a716-446655440011';
  bassoon_id UUID := '550e8400-e29b-41d4-a716-446655440012';
  oboe_id UUID := '550e8400-e29b-41d4-a716-446655440013';
  harp_id UUID := '550e8400-e29b-41d4-a716-446655440014';
  contrabass_id UUID := '550e8400-e29b-41d4-a716-446655440015';
  other_id UUID := '550e8400-e29b-41d4-a716-446655440017';
  viola_id UUID := '550e8400-e29b-41d4-a716-446655440018';
  koto_id UUID := '550e8400-e29b-41d4-a716-446655440019';
  synthesizer_id UUID := '550e8400-e29b-41d4-a716-446655440020';
  taiko_id UUID := '550e8400-e29b-41d4-a716-446655440021';
BEGIN
  -- ヴァイオリンは既存のデータを保持（追加のみ）
  -- 他の楽器は10曲ずつ追加（重複チェック付き）
  
  -- ============================================
  -- ピアノの代表曲（10曲）
  -- ============================================
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, 'エリーゼのために', 'ルートヴィヒ・ヴァン・ベートーヴェン', '古典派', 'バガテル', 2, 'https://www.youtube.com/watch?v=_mVW8tgGY_w', 'ベートーヴェンの最も有名な作品の一つ。美しいメロディーで親しまれています。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = 'エリーゼのために' AND composer = 'ルートヴィヒ・ヴァン・ベートーヴェン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '幻想即興曲', 'フレデリック・ショパン', 'ロマン派', '即興曲', 4, 'https://www.youtube.com/watch?v=9E6b3swbnWg', 'ショパンの代表的な即興曲。華やかで技巧的な作品です。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '幻想即興曲' AND composer = 'フレデリック・ショパン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, 'ラ・カンパネラ', 'フランツ・リスト', 'ロマン派', '練習曲', 5, 'https://www.youtube.com/watch?v=H1Dvg2MxQn8', 'リストの超絶技巧練習曲。跳躍と装飾音の見せ場が満載。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = 'ラ・カンパネラ' AND composer = 'フランツ・リスト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '革命のエチュード', 'フレデリック・ショパン', 'ロマン派', '練習曲', 5, 'https://www.youtube.com/watch?v=g1uLrHq9TDg', 'ショパンの練習曲集より。左手の激しい動きが圧巻。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '革命のエチュード' AND composer = 'フレデリック・ショパン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '月光ソナタ 第3楽章', 'ルートヴィヒ・ヴァン・ベートーヴェン', '古典派', 'ソナタ', 5, 'https://www.youtube.com/watch?v=4Tr0otuiQuU', 'ベートーヴェンのソナタ。激しいパッセージが印象的。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '月光ソナタ 第3楽章' AND composer = 'ルートヴィヒ・ヴァン・ベートーヴェン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, 'トルコ行進曲', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', 'ソナタ', 3, 'https://www.youtube.com/watch?v=8OqYTe8lq7o', 'モーツァルトのピアノソナタ第11番より。軽快で華やかな旋律。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = 'トルコ行進曲' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, 'ノクターン第2番', 'フレデリック・ショパン', 'ロマン派', 'ノクターン', 3, 'https://www.youtube.com/watch?v=YGRO05WcNDk', 'ショパンの美しいノクターン。優雅で情感豊かな作品。', true, 7
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = 'ノクターン第2番' AND composer = 'フレデリック・ショパン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '愛の夢 第3番', 'フランツ・リスト', 'ロマン派', '小品', 4, 'https://www.youtube.com/watch?v=KpOtuoHL45Y', 'リストの美しい小品。ロマンチックな旋律が印象的。', true, 8
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '愛の夢 第3番' AND composer = 'フランツ・リスト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '子犬のワルツ', 'フレデリック・ショパン', 'ロマン派', 'ワルツ', 2, 'https://www.youtube.com/watch?v=zSgX3K9oQvk', 'ショパンの軽快なワルツ。親しみやすい旋律。', true, 9
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '子犬のワルツ' AND composer = 'フレデリック・ショパン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, 'パッヘルベルのカノン', 'ヨハン・パッヘルベル', 'バロック', 'カノン', 3, 'https://www.youtube.com/watch?v=JvNQLJ1_HQ0', 'パッヘルベルの有名なカノン。美しい和声進行が特徴。', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = 'パッヘルベルのカノン' AND composer = 'ヨハン・パッヘルベル');
  
  -- ============================================
  -- ギターの代表曲（10曲）
  -- ============================================
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'アルハンブラの思い出', 'フランシスコ・タルレガ', 'ロマン派', 'ソロ', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'タルレガの代表的なトレモロ作品。右手の技巧が光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'アルハンブラの思い出' AND composer = 'フランシスコ・タルレガ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'アストゥリアス（伝説）', 'イサーク・アルベニス', '近代', 'ソロ', 5, 'https://www.youtube.com/watch?v=RxPx4b00f0s', 'スペインの情熱的な名曲。速いパッセージとリズムが特徴。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'アストゥリアス（伝説）' AND composer = 'イサーク・アルベニス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'カヴァティーナ', 'スタンリー・マイヤーズ', '現代', '映画音楽', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '映画「ディア・ハンター」のテーマ。美しい旋律が印象的。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'カヴァティーナ' AND composer = 'スタンリー・マイヤーズ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'カプリース第24番', 'ニコロ・パガニーニ', 'ロマン派', '練習曲', 5, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'パガニーニの超絶技巧曲をギター用に編曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'カプリース第24番' AND composer = 'ニコロ・パガニーニ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, '禁じられた遊び', 'ナルシソ・イエペス', '現代', '映画音楽', 3, 'https://www.youtube.com/watch?v=example', '映画「禁じられた遊び」のテーマ。美しいメロディー。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = '禁じられた遊び' AND composer = 'ナルシソ・イエペス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'ラグリマ', 'フランシスコ・タルレガ', 'ロマン派', '小品', 2, 'https://www.youtube.com/watch?v=example', 'タルレガの美しい小品。情感豊かな作品。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'ラグリマ' AND composer = 'フランシスコ・タルレガ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'グラナダ', 'イサーク・アルベニス', '近代', 'ソロ', 4, 'https://www.youtube.com/watch?v=example', 'スペインのグラナダをイメージした情熱的な作品。', true, 7
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'グラナダ' AND composer = 'イサーク・アルベニス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'アランフエス協奏曲 第2楽章', 'ホアキン・ロドリーゴ', '現代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ギター協奏曲の名作。美しい第2楽章。', true, 8
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'アランフエス協奏曲 第2楽章' AND composer = 'ホアキン・ロドリーゴ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'マラゲーニャ', 'イサーク・アルベニス', '近代', 'ソロ', 4, 'https://www.youtube.com/watch?v=example', 'スペインの民族舞踊をモチーフにした情熱的な作品。', true, 9
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'マラゲーニャ' AND composer = 'イサーク・アルベニス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'ロマンス', '不明', 'ロマン派', '小品', 2, 'https://www.youtube.com/watch?v=example', 'ギターの定番曲。美しいメロディーが印象的。', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'ロマンス' AND composer = '不明');
  
  -- ============================================
  -- フルートの代表曲（10曲）
  -- ============================================
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲 第2番', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=3rGqV7oA8Yk', 'モーツァルトの美しいフルート協奏曲。技巧的なパッセージが光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲 第2番' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'シランクス', 'クロード・ドビュッシー', '印象派', 'ソロ', 5, 'https://www.youtube.com/watch?v=YGR5ebY4I0k', 'ドビュッシーの印象的なフルートソロ。音色の美しさが際立つ。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'シランクス' AND composer = 'クロード・ドビュッシー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルートソナタ ホ短調', 'ヨハン・セバスチャン・バッハ', 'バロック', 'ソナタ', 4, 'https://www.youtube.com/watch?v=7X9jv3_4XwY', 'バッハの技巧的なフルートソナタ。対位法の美しさが光る。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルートソナタ ホ短調' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲 ニ長調', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトのもう一つのフルート協奏曲。軽快で華やか。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲 ニ長調' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルートソナタ イ長調', 'ヨハン・セバスチャン・バッハ', 'バロック', 'ソナタ', 3, 'https://www.youtube.com/watch?v=example', 'バッハの美しいフルートソナタ。対位法の技巧が光る。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルートソナタ イ長調' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲', 'カール・フィリップ・エマヌエル・バッハ', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'C.P.E.バッハの技巧的な協奏曲。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲' AND composer = 'カール・フィリップ・エマヌエル・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルートソナタ', 'ゲオルク・フィリップ・テレマン', 'バロック', 'ソナタ', 3, 'https://www.youtube.com/watch?v=example', 'テレマンの美しいフルートソナタ。', true, 7
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルートソナタ' AND composer = 'ゲオルク・フィリップ・テレマン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲 ト長調', 'ヨハン・ヨアヒム・クヴァンツ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'クヴァンツの技巧的な協奏曲。', true, 8
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲 ト長調' AND composer = 'ヨハン・ヨアヒム・クヴァンツ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルートソナタ ロ短調', 'ヨハン・セバスチャン・バッハ', 'バロック', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'バッハのもう一つのフルートソナタ。', true, 9
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルートソナタ ロ短調' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲 ニ短調', 'アントニオ・ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ヴィヴァルディの美しいフルート協奏曲。', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲 ニ短調' AND composer = 'アントニオ・ヴィヴァルディ');
  
  -- ============================================
  -- トランペットの代表曲（10曲）
  -- ============================================
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'フランツ・ヨーゼフ・ハイドン', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ハイドンの明るいトランペット協奏曲。高音域の技巧が光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'フランツ・ヨーゼフ・ハイドン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'ヨハン・ネポムク・フンメル', '古典派', '協奏曲', 5, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'フンメルの技巧的な協奏曲。超絶技巧の見せ場が満載。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'ヨハン・ネポムク・フンメル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット吹きの休日', 'ルロイ・アンダーソン', '近代', '軽音楽', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '軽快で楽しいトランペット曲。リズムの見せ場が光る。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット吹きの休日' AND composer = 'ルロイ・アンダーソン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲 変ホ長調', 'ヨハン・ネポムク・フンメル', '古典派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'フンメルのもう一つの協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲 変ホ長調' AND composer = 'ヨハン・ネポムク・フンメル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'アレクサンドル・アルチュニアン', '現代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'アルチュニアンの技巧的な協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'アレクサンドル・アルチュニアン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'ゲオルク・フィリップ・テレマン', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'テレマンの美しいトランペット協奏曲。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'ゲオルク・フィリップ・テレマン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'アントニオ・ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ヴィヴァルディの技巧的な協奏曲。', true, 7
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'アントニオ・ヴィヴァルディ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'ヨハン・セバスチャン・バッハ', 'バロック', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'バッハの美しいトランペット協奏曲。', true, 8
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'ゲオルク・フリードリヒ・ヘンデル', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ヘンデルの技巧的な協奏曲。', true, 9
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'ゲオルク・フリードリヒ・ヘンデル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'ヨハン・メルヒオール・モルター', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'モルターの美しいトランペット協奏曲。', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'ヨハン・メルヒオール・モルター');
  
  -- ============================================
  -- サックスの代表曲（10曲）
  -- ============================================
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'アレクサンドル・グラズノフ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'グラズノフの美しいサックス協奏曲。音色の豊かさが光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'アレクサンドル・グラズノフ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'ケアレス・ウィスパー', 'ジョージ・マイケル', '現代', 'ポップス', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'サックスの美しいソロが印象的な名曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'ケアレス・ウィスパー' AND composer = 'ジョージ・マイケル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'ジャック・イベール', '現代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'イベールの技巧的なサックス協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'ジャック・イベール');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'ポール・クレストン', '現代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'クレストンの超絶技巧協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'ポール・クレストン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'アンリ・トマジ', '現代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'トマジの美しいサックス協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'アンリ・トマジ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'アレクサンドル・グラズノフ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'グラズノフのもう一つの協奏曲。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'アレクサンドル・グラズノフ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'ジャン・アブシル', '現代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'アブシルの技巧的な協奏曲。', true, 7
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'ジャン・アブシル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'アンリ・トマジ', '現代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'トマジのもう一つの協奏曲。', true, 8
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'アンリ・トマジ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'ポール・クレストン', '現代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'クレストンのもう一つの協奏曲。', true, 9
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'ポール・クレストン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'ジャック・イベール', '現代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'イベールのもう一つの協奏曲。', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'ジャック・イベール');
  
  -- ============================================
  -- チェロの代表曲（10曲）
  -- ============================================
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, '無伴奏チェロ組曲 第1番 プレリュード', 'ヨハン・セバスチャン・バッハ', 'バロック', '組曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'バッハの無伴奏チェロ組曲。チェロの表現力の極致。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = '無伴奏チェロ組曲 第1番 プレリュード' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'アントニン・ドヴォルザーク', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ドヴォルザークの美しいチェロ協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'アントニン・ドヴォルザーク');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'エドゥアルド・エルガー', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'エルガーの技巧的なチェロ協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'エドゥアルド・エルガー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'カミーユ・サン＝サーンス', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'サン＝サーンスの美しいチェロ協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'カミーユ・サン＝サーンス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'ロベルト・シューマン', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'シューマンの技巧的なチェロ協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'ロベルト・シューマン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, '無伴奏チェロ組曲 第3番 プレリュード', 'ヨハン・セバスチャン・バッハ', 'バロック', '組曲', 4, 'https://www.youtube.com/watch?v=example', 'バッハの無伴奏チェロ組曲第3番。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = '無伴奏チェロ組曲 第3番 プレリュード' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, '無伴奏チェロ組曲 第5番 プレリュード', 'ヨハン・セバスチャン・バッハ', 'バロック', '組曲', 5, 'https://www.youtube.com/watch?v=example', 'バッハの無伴奏チェロ組曲第5番。', true, 7
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = '無伴奏チェロ組曲 第5番 プレリュード' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'ヨーゼフ・ハイドン', '古典派', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ハイドンの美しいチェロ協奏曲。', true, 8
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'ヨーゼフ・ハイドン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'ルイージ・ボッケリーニ', '古典派', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ボッケリーニの技巧的なチェロ協奏曲。', true, 9
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'ルイージ・ボッケリーニ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'アントニオ・ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ヴィヴァルディの美しいチェロ協奏曲。', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'アントニオ・ヴィヴァルディ');
  
  -- ヴァイオリンは既存のデータを保持（追加のみ）
  -- 既存のヴァイオリンの代表曲は変更しない
  
  RAISE NOTICE '代表曲の統合マイグレーションが完了しました。各楽器に10曲ずつ追加されました（ヴァイオリンは既存データを保持）。';
END $$;

