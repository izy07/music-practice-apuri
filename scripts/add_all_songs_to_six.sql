-- バイオリン以外の各楽器の代表曲を6つにする包括的なスクリプト
-- 既存の曲を確認し、不足分を追加します
-- Supabase StudioのSQL Editorで実行してください

-- ピアノの曲を6つに
DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count FROM representative_songs WHERE instrument_id = piano_id;
  
  -- 1. エリーゼのために
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, 'エリーゼのために', 'ベートーヴェン', '古典派', 'バガテル', 2, 'https://www.youtube.com/watch?v=_mVW8tgGY_w', 'ベートーヴェンの最も有名な作品の一つ。美しいメロディーで親しまれています。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = 'エリーゼのために' AND composer = 'ベートーヴェン');
  
  -- 2. 幻想即興曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '幻想即興曲', 'ショパン', 'ロマン派', '即興曲', 4, 'https://www.youtube.com/watch?v=9E6b3swbnWg', 'ショパンの代表的な即興曲。華やかで技巧的な作品です。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '幻想即興曲' AND composer = 'ショパン');
  
  -- 3. 月光ソナタ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '月光ソナタ', 'ベートーヴェン', '古典派', 'ソナタ', 3, 'https://www.youtube.com/watch?v=4Tr0otuiQuU', '第1楽章の美しいアルペジオで知られる名曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '月光ソナタ' AND composer = 'ベートーヴェン');
  
  -- 4. 愛の夢
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '愛の夢', 'リスト', 'ロマン派', '夜想曲', 3, 'https://www.youtube.com/watch?v=KpOtuoHL45Y', 'リストの最も美しい作品の一つ。ロマンチックな旋律が印象的。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '愛の夢' AND composer = 'リスト');
  
  -- 5. 子犬のワルツ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '子犬のワルツ', 'ショパン', 'ロマン派', 'ワルツ', 2, 'https://www.youtube.com/watch?v=oGXf6t7a5gE', '軽やかで可愛らしいワルツ。初心者にも人気。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '子犬のワルツ' AND composer = 'ショパン');
  
  -- 6. 運命交響曲 第1楽章（ピアノ編曲版）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '運命交響曲 第1楽章', 'ベートーヴェン', '古典派', '交響曲', 4, 'https://www.youtube.com/watch?v=example_piano_fate', 'ベートーヴェンの交響曲第5番。ピアノ編曲版でも有名。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '運命交響曲 第1楽章' AND composer = 'ベートーヴェン');
END $$;

-- ギターの曲を6つに
DO $$
DECLARE
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
BEGIN
  -- 1. アルハンブラの思い出
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'アルハンブラの思い出', 'タルレガ', 'ロマン派', 'ソロ', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'タルレガの代表的なトレモロ作品。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'アルハンブラの思い出' AND composer = 'タルレガ');
  
  -- 2. アストゥリアス
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'アストゥリアス', 'アルベニス', '近代', 'ソロ', 4, 'https://www.youtube.com/watch?v=RxPx4b00f0s', 'スペインの情熱的な名曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'アストゥリアス' AND composer = 'アルベニス');
  
  -- 3. ラグリマ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'ラグリマ', 'タルレガ', 'ロマン派', 'ソロ', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '美しい旋律の小品。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'ラグリマ' AND composer = 'タルレガ');
  
  -- 4. カヴァティーナ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'カヴァティーナ', 'マイヤーズ', '現代', '映画音楽', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '映画「ディア・ハンター」のテーマ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'カヴァティーナ' AND composer = 'マイヤーズ');
  
  -- 5. ロマンス
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'ロマンス', 'アノニマス', '古典', 'フォルクローレ', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'スペインの伝統的なロマンス。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'ロマンス' AND composer = 'アノニマス');
  
  -- 6. セビリアの理髪師より序曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'セビリアの理髪師より序曲', 'ロッシーニ', 'ロマン派', 'オペラ', 3, 'https://www.youtube.com/watch?v=example_guitar_rossini', 'ロッシーニのオペラ序曲。ギター編曲版が人気。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'セビリアの理髪師より序曲' AND composer = 'ロッシーニ');
END $$;

-- フルートの曲を6つに
DO $$
DECLARE
  flute_id UUID := '550e8400-e29b-41d4-a716-446655440004';
BEGIN
  -- 1. フルート協奏曲第2番
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲第2番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=3rGqV7oA8Yk', 'モーツァルトの美しいフルート協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲第2番' AND composer = 'モーツァルト');
  
  -- 2. シチリアーノ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'シチリアーノ', 'バッハ', 'バロック', '舞曲', 3, 'https://www.youtube.com/watch?v=6JQm5aSjX6g', 'バッハの優雅なシチリアーノ舞曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'シチリアーノ' AND composer = 'バッハ');
  
  -- 3. フルートソナタ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルートソナタ', 'バッハ', 'バロック', 'ソナタ', 4, 'https://www.youtube.com/watch?v=7X9jv3_4XwY', 'バッハの技巧的なフルートソナタ。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルートソナタ' AND composer = 'バッハ');
  
  -- 4. シランクス
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'シランクス', 'ドビュッシー', '印象派', 'ソロ', 4, 'https://www.youtube.com/watch?v=YGR5ebY4I0k', 'ドビュッシーの印象的なフルートソロ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'シランクス' AND composer = 'ドビュッシー');
  
  -- 5. フルート協奏曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲', 'ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=6JQm5aSjX6g', 'ヴィヴァルディの明るいフルート協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲' AND composer = 'ヴィヴァルディ');
  
  -- 6. カルメン組曲より「ハバネラ」
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'カルメン組曲より「ハバネラ」', 'ビゼー', 'ロマン派', 'オペラ', 3, 'https://www.youtube.com/watch?v=example_flute_carmen', 'ビゼーのオペラ「カルメン」より。フルートでよく演奏される。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'カルメン組曲より「ハバネラ」' AND composer = 'ビゼー');
END $$;

-- トランペットの曲を6つに
DO $$
DECLARE
  trumpet_id UUID := '550e8400-e29b-41d4-a716-446655440005';
BEGIN
  -- 1. トランペット協奏曲（ハイドン）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'ハイドン', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ハイドンの明るいトランペット協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'ハイドン');
  
  -- 2. トランペット吹きの休日
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット吹きの休日', 'アンダーソン', '近代', '軽音楽', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '軽快で楽しいトランペット曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット吹きの休日' AND composer = 'アンダーソン');
  
  -- 3. トランペット協奏曲（フンメル）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'フンメル', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'フンメルの技巧的な協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'フンメル');
  
  -- 4. トランペット吹きの子守歌
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット吹きの子守歌', 'アンダーソン', '近代', '軽音楽', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '優しい子守歌のトランペット版。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット吹きの子守歌' AND composer = 'アンダーソン');
  
  -- 5. トランペット協奏曲（テレマン）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'テレマン', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'テレマンのバロック協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'テレマン');
  
  -- 6. 威風堂々
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, '威風堂々', 'エルガー', 'ロマン派', '行進曲', 3, 'https://www.youtube.com/watch?v=example_trumpet_pomp', 'エルガーの有名な行進曲。トランペットのファンファーレが印象的。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = '威風堂々' AND composer = 'エルガー');
END $$;

-- クラリネットの曲を6つに
DO $$
DECLARE
  clarinet_id UUID := '550e8400-e29b-41d4-a716-446655440009';
BEGIN
  -- 1. クラリネット協奏曲（モーツァルト）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネット協奏曲', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの美しいクラリネット協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネット協奏曲' AND composer = 'モーツァルト');
  
  -- 2. クラリネット五重奏曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネット五重奏曲', 'モーツァルト', '古典派', '室内楽', 3, 'https://www.youtube.com/watch?v=example', 'モーツァルトの名作室内楽曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネット五重奏曲' AND composer = 'モーツァルト');
  
  -- 3. クラリネット協奏曲（ウェーバー）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネット協奏曲', 'ウェーバー', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ウェーバーの技巧的な協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネット協奏曲' AND composer = 'ウェーバー');
  
  -- 4. クラリネットソナタ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネットソナタ', 'ブラームス', 'ロマン派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'ブラームスの重厚なソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネットソナタ' AND composer = 'ブラームス');
  
  -- 5. ラプソディ・イン・ブルー
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'ラプソディ・イン・ブルー', 'ガーシュウィン', '近代', 'ジャズ', 3, 'https://www.youtube.com/watch?v=example', 'ガーシュウィンのジャズクラシック名曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'ラプソディ・イン・ブルー' AND composer = 'ガーシュウィン');
  
  -- 6. クラリネットポルカ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネットポルカ', 'ヨハン・シュトラウス2世', 'ロマン派', '舞曲', 3, 'https://www.youtube.com/watch?v=example_clarinet_polka', 'シュトラウスの軽快なポルカ。クラリネットが主役。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネットポルカ' AND composer = 'ヨハン・シュトラウス2世');
END $$;

-- サックスの曲を6つに
DO $$
DECLARE
  saxophone_id UUID := '550e8400-e29b-41d4-a716-446655440007';
BEGIN
  -- 1. サクソフォン協奏曲（グラズノフ）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'グラズノフ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'グラズノフの美しいサックス協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'グラズノフ');
  
  -- 2. サクソフォン四重奏曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン四重奏曲', 'デボダ', '近代', '室内楽', 3, 'https://www.youtube.com/watch?v=example', 'デボダの技巧的な四重奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン四重奏曲' AND composer = 'デボダ');
  
  -- 3. ラプソディ・イン・ブルー
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'ラプソディ・イン・ブルー', 'ガーシュウィン', '近代', 'ジャズ', 4, 'https://www.youtube.com/watch?v=example', 'ガーシュウィンのジャズクラシック名曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'ラプソディ・イン・ブルー' AND composer = 'ガーシュウィン');
  
  -- 4. サクソフォン協奏曲（イベール）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'イベール', '近代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'イベールの技巧的な協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'イベール');
  
  -- 5. サマータイム
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サマータイム', 'ガーシュウィン', '近代', 'ジャズ', 3, 'https://www.youtube.com/watch?v=example', 'ガーシュウィンのジャズクラシック名曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サマータイム' AND composer = 'ガーシュウィン');
  
  -- 6. カーミーナ・ブラーナより「おお、運命の女神よ」
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'カーミーナ・ブラーナより「おお、運命の女神よ」', 'オルフ', '近代', 'カンタータ', 4, 'https://www.youtube.com/watch?v=example_sax_carmina', 'オルフのカンタータ。サックスが活躍する編曲版がある。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'カーミーナ・ブラーナより「おお、運命の女神よ」' AND composer = 'オルフ');
END $$;

-- トロンボーンの曲を6つに
DO $$
DECLARE
  trombone_id UUID := '550e8400-e29b-41d4-a716-446655440010';
BEGIN
  -- 1. トロンボーン協奏曲（リムスキー・コルサコフ）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'リムスキー・コルサコフ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'リムスキー・コルサコフの技巧的な協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'リムスキー・コルサコフ');
  
  -- 2. トロンボーン協奏曲（デビッド）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'デビッド', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'デビッドの美しい協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'デビッド');
  
  -- 3. トロンボーン協奏曲（ラッセル）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'ラッセル', '近代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ラッセルの技巧的な協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'ラッセル');
  
  -- 4. トロンボーン協奏曲（グリエール）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'グリエール', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'グリエールの重厚な協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'グリエール');
  
  -- 5. トロンボーン協奏曲（ボルドウィン）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'ボルドウィン', '近代', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ボルドウィンの親しみやすい協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'ボルドウィン');
  
  -- 6. ボレロ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'ボレロ', 'ラヴェル', '近代', 'バレエ音楽', 4, 'https://www.youtube.com/watch?v=example_trombone_bolero', 'ラヴェルの名曲。トロンボーンが重要な旋律を担当。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'ボレロ' AND composer = 'ラヴェル');
END $$;

-- チェロの曲を6つに
DO $$
DECLARE
  cello_id UUID := '550e8400-e29b-41d4-a716-446655440011';
BEGIN
  -- 1. チェロ協奏曲（ドヴォルザーク）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'ドヴォルザーク', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ドヴォルザークの名作チェロ協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'ドヴォルザーク');
  
  -- 2. チェロ協奏曲（エルガー）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'エルガー', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'エルガーの重厚なチェロ協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'エルガー');
  
  -- 3. 無伴奏チェロ組曲第1番
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, '無伴奏チェロ組曲第1番', 'バッハ', 'バロック', '無伴奏', 4, 'https://youtu.be/JcyAVHc9_WU?si=9-GeFPt8by7sVi_G', 'バッハの無伴奏チェロ組曲の第1番。中木健二による演奏。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = '無伴奏チェロ組曲第1番' AND composer = 'バッハ');
  
  -- 4. チェロソナタ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロソナタ', 'ベートーヴェン', '古典派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'ベートーヴェンの技巧的なソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロソナタ' AND composer = 'ベートーヴェン');
  
  -- 5. チェロ協奏曲（ハイドン）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'ハイドン', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ハイドンの明るいチェロ協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'ハイドン');
  
  -- 6. アダージョ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'アダージョ', 'アルビノーニ', 'バロック', 'アダージョ', 3, 'https://www.youtube.com/watch?v=example_cello_albinoni', 'アルビノーニのアダージョ。チェロで美しく演奏される。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'アダージョ' AND composer = 'アルビノーニ');
END $$;

-- ドラム（打楽器）の曲を6つに
DO $$
DECLARE
  drums_id UUID := '550e8400-e29b-41d4-a716-446655440006';
BEGIN
  -- 1. ボレロ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, 'ボレロ', 'ラヴェル', '近代', '管弦楽', 3, 'https://www.youtube.com/watch?v=example', 'ラヴェルの打楽器が主役の名曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = 'ボレロ' AND composer = 'ラヴェル');
  
  -- 2. シンフォニエッタ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, 'シンフォニエッタ', 'ヤナーチェク', '近代', '管弦楽', 4, 'https://www.youtube.com/watch?v=example', 'ヤナーチェクの打楽器が活躍する作品。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = 'シンフォニエッタ' AND composer = 'ヤナーチェク');
  
  -- 3. 打楽器協奏曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, '打楽器協奏曲', 'バルトーク', '近代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'バルトークの技巧的な打楽器協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = '打楽器協奏曲' AND composer = 'バルトーク');
  
  -- 4. マルタンバ協奏曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, 'マルタンバ協奏曲', 'ミヨー', '近代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ミヨーの美しいマルタンバ協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = 'マルタンバ協奏曲' AND composer = 'ミヨー');
  
  -- 5. 打楽器のための音楽
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, '打楽器のための音楽', 'ケージ', '現代', '現代音楽', 4, 'https://www.youtube.com/watch?v=example', 'ケージの実験的な打楽器作品。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = '打楽器のための音楽' AND composer = 'ケージ');
  
  -- 6. 1812年序曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, '1812年序曲', 'チャイコフスキー', 'ロマン派', '序曲', 4, 'https://www.youtube.com/watch?v=example_drums_1812', 'チャイコフスキーの序曲。打楽器が大活躍する。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = '1812年序曲' AND composer = 'チャイコフスキー');
END $$;

-- ヴィオラの曲を6つに
DO $$
DECLARE
  viola_id UUID := '550e8400-e29b-41d4-a716-446655440018';
BEGIN
  -- 1. ヴィオラ協奏曲（バルトーク）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ヴィオラ協奏曲', 'バルトーク', '近代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'バルトークの技巧的なヴィオラ協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ヴィオラ協奏曲' AND composer = 'バルトーク');
  
  -- 2. ヴィオラ協奏曲（ヒンデミット）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ヴィオラ協奏曲', 'ヒンデミット', '近代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ヒンデミットの重厚な協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ヴィオラ協奏曲' AND composer = 'ヒンデミット');
  
  -- 3. ヴィオラソナタ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ヴィオラソナタ', 'ブラームス', 'ロマン派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'ブラームスの重厚なソナタ。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ヴィオラソナタ' AND composer = 'ブラームス');
  
  -- 4. ハロルド・イン・イタリア
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ハロルド・イン・イタリア', 'ベルリオーズ', 'ロマン派', '交響曲', 4, 'https://www.youtube.com/watch?v=example', 'ベルリオーズのヴィオラが主役の交響曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ハロルド・イン・イタリア' AND composer = 'ベルリオーズ');
  
  -- 5. ヴィオラ協奏曲（テレマン）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ヴィオラ協奏曲', 'テレマン', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'テレマンの優雅な協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ヴィオラ協奏曲' AND composer = 'テレマン');
  
  -- 6. ドン・キホーテよりヴィオラソロ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ドン・キホーテよりヴィオラソロ', 'リヒャルト・シュトラウス', 'ロマン派', '交響詩', 5, 'https://www.youtube.com/watch?v=example_viola_don', 'リヒャルト・シュトラウスの交響詩。ヴィオラが重要な役割。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ドン・キホーテよりヴィオラソロ' AND composer = 'リヒャルト・シュトラウス');
END $$;

-- オーボエの曲を6つに
DO $$
DECLARE
  oboe_id UUID := '550e8400-e29b-41d4-a716-446655440013';
BEGIN
  -- 1. オーボエ協奏曲（モーツァルト）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエ協奏曲', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの美しいオーボエ協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエ協奏曲' AND composer = 'モーツァルト');
  
  -- 2. オーボエ協奏曲（マルチェッロ）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエ協奏曲', 'マルチェッロ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'マルチェッロの優雅な協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエ協奏曲' AND composer = 'マルチェッロ');
  
  -- 3. オーボエ協奏曲（リヒャルト・シュトラウス）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエ協奏曲', 'リヒャルト・シュトラウス', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'リヒャルト・シュトラウスの技巧的な協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエ協奏曲' AND composer = 'リヒャルト・シュトラウス');
  
  -- 4. オーボエソナタ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエソナタ', 'サン＝サーンス', 'ロマン派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'サン＝サーンスの技巧的なソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエソナタ' AND composer = 'サン＝サーンス');
  
  -- 5. オーボエ協奏曲（ヴィヴァルディ）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエ協奏曲', 'ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ヴィヴァルディの明るいオーボエ協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエ協奏曲' AND composer = 'ヴィヴァルディ');
  
  -- 6. シェヘラザードより「若き王子と王女」
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'シェヘラザードより「若き王子と王女」', 'リムスキー・コルサコフ', 'ロマン派', '交響組曲', 4, 'https://www.youtube.com/watch?v=example_oboe_scheherazade', 'リムスキー・コルサコフの交響組曲。オーボエが美しい旋律を奏でる。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'シェヘラザードより「若き王子と王女」' AND composer = 'リムスキー・コルサコフ');
END $$;

-- コントラバスの曲を6つに
DO $$
DECLARE
  contrabass_id UUID := '550e8400-e29b-41d4-a716-446655440015';
BEGIN
  -- 1. コントラバス協奏曲（ドラゴネッティ）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'ドラゴネッティ', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ドラゴネッティの技巧的な協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'ドラゴネッティ');
  
  -- 2. コントラバス協奏曲（クセナキス）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'クセナキス', '現代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'クセナキスの現代的な協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'クセナキス');
  
  -- 3. コントラバス協奏曲（ボッテジーニ）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'ボッテジーニ', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ボッテジーニの超絶技巧協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'ボッテジーニ');
  
  -- 4. コントラバス協奏曲（カプッツィ）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'カプッツィ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'カプッツィの美しい協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'カプッツィ');
  
  -- 5. コントラバス協奏曲（ヴァン・ハル）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'ヴァン・ハル', '現代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ヴァン・ハルの現代的な協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'ヴァン・ハル');
  
  -- 6. 動物の謝肉祭より「象」
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, '動物の謝肉祭より「象」', 'サン＝サーンス', 'ロマン派', '組曲', 2, 'https://www.youtube.com/watch?v=example_contrabass_elephant', 'サン＝サーンスの組曲。コントラバスが象を表現。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = '動物の謝肉祭より「象」' AND composer = 'サン＝サーンス');
END $$;

-- ホルンの曲を6つに
DO $$
DECLARE
  horn_id UUID := '550e8400-e29b-41d4-a716-446655440008';
BEGIN
  -- 1. ホルン協奏曲第1番
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲第1番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの美しいホルン協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲第1番' AND composer = 'モーツァルト');
  
  -- 2. ホルン協奏曲第2番
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲第2番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの技巧的なホルン協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲第2番' AND composer = 'モーツァルト');
  
  -- 3. ホルン協奏曲第3番
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲第3番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの名作ホルン協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲第3番' AND composer = 'モーツァルト');
  
  -- 4. ホルン協奏曲第4番
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲第4番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの最後のホルン協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲第4番' AND composer = 'モーツァルト');
  
  -- 5. ホルン協奏曲（シュトラウス）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲', 'シュトラウス', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'シュトラウスの技巧的な協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲' AND composer = 'シュトラウス');
  
  -- 6. ジークフリートの牧歌
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ジークフリートの牧歌', 'ワーグナー', 'ロマン派', 'オペラ', 4, 'https://www.youtube.com/watch?v=example_horn_siegfried', 'ワーグナーのオペラ「ジークフリート」より。ホルンが重要な役割。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ジークフリートの牧歌' AND composer = 'ワーグナー');
END $$;

-- ファゴットの曲を6つに
DO $$
DECLARE
  bassoon_id UUID := '550e8400-e29b-41d4-a716-446655440012';
BEGIN
  -- 1. ファゴット協奏曲（モーツァルト）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴット協奏曲', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの美しいファゴット協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴット協奏曲' AND composer = 'モーツァルト');
  
  -- 2. ファゴット協奏曲（ウェーバー）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴット協奏曲', 'ウェーバー', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ウェーバーの技巧的な協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴット協奏曲' AND composer = 'ウェーバー');
  
  -- 3. ファゴット協奏曲（ヴィヴァルディ）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴット協奏曲', 'ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ヴィヴァルディの明るいファゴット協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴット協奏曲' AND composer = 'ヴィヴァルディ');
  
  -- 4. ファゴットソナタ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴットソナタ', 'サン＝サーンス', 'ロマン派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'サン＝サーンスの技巧的なソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴットソナタ' AND composer = 'サン＝サーンス');
  
  -- 5. ファゴット協奏曲（フンメル）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴット協奏曲', 'フンメル', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'フンメルの明るい協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴット協奏曲' AND composer = 'フンメル');
  
  -- 6. ピーターと狼
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ピーターと狼', 'プロコフィエフ', '近代', '交響的物語', 3, 'https://www.youtube.com/watch?v=example_bassoon_peter', 'プロコフィエフの交響的物語。ファゴットが「おじいさん」を表現。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ピーターと狼' AND composer = 'プロコフィエフ');
END $$;

-- ハープの曲を6つに
DO $$
DECLARE
  harp_id UUID := '550e8400-e29b-41d4-a716-446655440014';
BEGIN
  -- 1. ハープ協奏曲（ハンデル）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'ハンデル', 'バロック', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ハンデルの美しいハープ協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'ハンデル');
  
  -- 2. ハープ協奏曲（ボエルデュー）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'ボエルデュー', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ボエルデューの技巧的なハープ協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'ボエルデュー');
  
  -- 3. ハープ協奏曲（ディッタースドルフ）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'ディッタースドルフ', '古典派', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ディッタースドルフの優雅なハープ協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'ディッタースドルフ');
  
  -- 4. ハープソナタ
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープソナタ', 'ドビュッシー', '印象派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'ドビュッシーの印象的なハープソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープソナタ' AND composer = 'ドビュッシー');
  
  -- 5. ハープ協奏曲（ジンマーマン）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'ジンマーマン', '現代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ジンマーマンの現代的なハープ協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'ジンマーマン');
  
  -- 6. 白鳥の湖より「情景」
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, '白鳥の湖より「情景」', 'チャイコフスキー', 'ロマン派', 'バレエ', 3, 'https://www.youtube.com/watch?v=example_harp_swan', 'チャイコフスキーのバレエ。ハープが美しい音色を奏でる。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = '白鳥の湖より「情景」' AND composer = 'チャイコフスキー');
END $$;

-- 確認クエリ（バイオリン以外の各楽器が6曲になっているか確認）
SELECT 
  i.name as instrument_name,
  COUNT(rs.id) as song_count
FROM instruments i
LEFT JOIN representative_songs rs ON i.id = rs.instrument_id
WHERE i.id IN (
  '550e8400-e29b-41d4-a716-446655440001', -- ピアノ
  '550e8400-e29b-41d4-a716-446655440002', -- ギター
  '550e8400-e29b-41d4-a716-446655440004', -- フルート
  '550e8400-e29b-41d4-a716-446655440005', -- トランペット
  '550e8400-e29b-41d4-a716-446655440006', -- 打楽器
  '550e8400-e29b-41d4-a716-446655440007', -- サックス
  '550e8400-e29b-41d4-a716-446655440008', -- ホルン
  '550e8400-e29b-41d4-a716-446655440009', -- クラリネット
  '550e8400-e29b-41d4-a716-446655440010', -- トロンボーン
  '550e8400-e29b-41d4-a716-446655440011', -- チェロ
  '550e8400-e29b-41d4-a716-446655440012', -- ファゴット
  '550e8400-e29b-41d4-a716-446655440013', -- オーボエ
  '550e8400-e29b-41d4-a716-446655440014', -- ハープ
  '550e8400-e29b-41d4-a716-446655440015', -- コントラバス
  '550e8400-e29b-41d4-a716-446655440018'  -- ヴィオラ
)
GROUP BY i.id, i.name
ORDER BY i.name;
