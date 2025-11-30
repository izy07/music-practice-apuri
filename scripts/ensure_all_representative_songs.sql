-- すべての楽器の代表曲データを確実に追加するスクリプト
-- 楽器IDを直接使用してデータを挿入（name_enでの検索に依存しない）

-- 1. RLSポリシーを確認・修正（全ユーザーが読み取り可能にする）
DO $$
BEGIN
  -- 既存のポリシーを削除
  DROP POLICY IF EXISTS "Anyone can view representative songs" ON representative_songs;
  DROP POLICY IF EXISTS "representative_songs_select_policy" ON representative_songs;
  DROP POLICY IF EXISTS "Authenticated users can read representative songs" ON representative_songs;
  
  -- 新しいポリシーを作成（全ユーザーが読み取り可能）
  CREATE POLICY "Anyone can view representative songs" ON representative_songs
    FOR SELECT USING (true);
END $$;

-- 2. ピアノの代表曲データを追加
DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, 'エリーゼのために', 'ベートーヴェン', '古典派', 'バガテル', 2, 'https://www.youtube.com/watch?v=_mVW8tgGY_w', 'ベートーヴェンの最も有名な作品の一つ。美しいメロディーで親しまれています。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = 'エリーゼのために' AND composer = 'ベートーヴェン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '幻想即興曲', 'ショパン', 'ロマン派', '即興曲', 4, 'https://www.youtube.com/watch?v=9E6b3swbnWg', 'ショパンの代表的な即興曲。華やかで技巧的な作品です。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '幻想即興曲' AND composer = 'ショパン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '月光ソナタ', 'ベートーヴェン', '古典派', 'ソナタ', 3, 'https://www.youtube.com/watch?v=4Tr0otuiQuU', '第1楽章の美しいアルペジオで知られる名曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '月光ソナタ' AND composer = 'ベートーヴェン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '愛の夢', 'リスト', 'ロマン派', '夜想曲', 3, 'https://www.youtube.com/watch?v=KpOtuoHL45Y', 'リストの最も美しい作品の一つ。ロマンチックな旋律が印象的。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '愛の夢' AND composer = 'リスト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '子犬のワルツ', 'ショパン', 'ロマン派', 'ワルツ', 2, 'https://www.youtube.com/watch?v=oGXf6t7a5gE', '軽やかで可愛らしいワルツ。初心者にも人気。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '子犬のワルツ' AND composer = 'ショパン');
END $$;

-- 3. ギターの代表曲データを追加
DO $$
DECLARE
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'アルハンブラの思い出', 'タルレガ', 'ロマン派', 'ソロ', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'タルレガの代表的なトレモロ作品。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'アルハンブラの思い出' AND composer = 'タルレガ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'アストゥリアス', 'アルベニス', '近代', 'ソロ', 4, 'https://www.youtube.com/watch?v=RxPx4b00f0s', 'スペインの情熱的な名曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'アストゥリアス' AND composer = 'アルベニス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'ラグリマ', 'タルレガ', 'ロマン派', 'ソロ', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '美しい旋律の小品。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'ラグリマ' AND composer = 'タルレガ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'カヴァティーナ', 'マイヤーズ', '現代', '映画音楽', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '映画「ディア・ハンター」のテーマ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'カヴァティーナ' AND composer = 'マイヤーズ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'ロマンス', 'アノニマス', '古典', 'フォルクローレ', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'スペインの伝統的なロマンス。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'ロマンス' AND composer = 'アノニマス');
END $$;

-- 4. フルートの代表曲データを追加
DO $$
DECLARE
  flute_id UUID := '550e8400-e29b-41d4-a716-446655440004';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲第2番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=3rGqV7oA8Yk', 'モーツァルトの美しいフルート協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲第2番' AND composer = 'モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'シチリアーノ', 'バッハ', 'バロック', '舞曲', 3, 'https://www.youtube.com/watch?v=6JQm5aSjX6g', 'バッハの優雅なシチリアーノ舞曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'シチリアーノ' AND composer = 'バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルートソナタ', 'バッハ', 'バロック', 'ソナタ', 4, 'https://www.youtube.com/watch?v=7X9jv3_4XwY', 'バッハの技巧的なフルートソナタ。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルートソナタ' AND composer = 'バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'シランクス', 'ドビュッシー', '印象派', 'ソロ', 4, 'https://www.youtube.com/watch?v=YGR5ebY4I0k', 'ドビュッシーの印象的なフルートソロ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'シランクス' AND composer = 'ドビュッシー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲', 'ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=6JQm5aSjX6g', 'ヴィヴァルディの明るいフルート協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲' AND composer = 'ヴィヴァルディ');
END $$;

-- 5. トランペットの代表曲データを追加
DO $$
DECLARE
  trumpet_id UUID := '550e8400-e29b-41d4-a716-446655440005';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'ハイドン', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ハイドンの明るいトランペット協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'ハイドン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット吹きの休日', 'アンダーソン', '近代', '軽音楽', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '軽快で楽しいトランペット曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット吹きの休日' AND composer = 'アンダーソン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'フンメル', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'フンメルの技巧的な協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'フンメル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット吹きの子守歌', 'アンダーソン', '近代', '軽音楽', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '優しい子守歌のトランペット版。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット吹きの子守歌' AND composer = 'アンダーソン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'テレマン', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'テレマンのバロック協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'テレマン');
END $$;

-- 6. クラリネットの代表曲データを追加
DO $$
DECLARE
  clarinet_id UUID := '550e8400-e29b-41d4-a716-446655440009';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネット協奏曲', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの美しいクラリネット協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネット協奏曲' AND composer = 'モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネット五重奏曲', 'モーツァルト', '古典派', '室内楽', 3, 'https://www.youtube.com/watch?v=example', 'モーツァルトの名作室内楽曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネット五重奏曲' AND composer = 'モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネット協奏曲', 'ウェーバー', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ウェーバーの技巧的な協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネット協奏曲' AND composer = 'ウェーバー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネットソナタ', 'ブラームス', 'ロマン派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'ブラームスの重厚なソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネットソナタ' AND composer = 'ブラームス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'ラプソディ・イン・ブルー', 'ガーシュウィン', '近代', 'ジャズ', 3, 'https://www.youtube.com/watch?v=example', 'ガーシュウィンのジャズクラシック名曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'ラプソディ・イン・ブルー' AND composer = 'ガーシュウィン');
END $$;

-- 7. サックスの代表曲データを追加
DO $$
DECLARE
  saxophone_id UUID := '550e8400-e29b-41d4-a716-446655440007';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'グラズノフ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'グラズノフの美しいサックス協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'グラズノフ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン四重奏曲', 'デボダ', '近代', '室内楽', 3, 'https://www.youtube.com/watch?v=example', 'デボダの技巧的な四重奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン四重奏曲' AND composer = 'デボダ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'ラプソディ・イン・ブルー', 'ガーシュウィン', '近代', 'ジャズ', 4, 'https://www.youtube.com/watch?v=example', 'ガーシュウィンのジャズクラシック名曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'ラプソディ・イン・ブルー' AND composer = 'ガーシュウィン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'イベール', '近代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'イベールの技巧的な協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'イベール');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サマータイム', 'ガーシュウィン', '近代', 'ジャズ', 3, 'https://www.youtube.com/watch?v=example', 'ガーシュウィンのジャズクラシック名曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サマータイム' AND composer = 'ガーシュウィン');
END $$;

-- 8. ホルンの代表曲データを追加
DO $$
DECLARE
  horn_id UUID := '550e8400-e29b-41d4-a716-446655440008';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲第1番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの美しいホルン協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲第1番' AND composer = 'モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲第2番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの技巧的なホルン協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲第2番' AND composer = 'モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲第3番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの名作ホルン協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲第3番' AND composer = 'モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲第4番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの最後のホルン協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲第4番' AND composer = 'モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲', 'シュトラウス', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'シュトラウスの技巧的な協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲' AND composer = 'シュトラウス');
END $$;

-- 9. トロンボーンの代表曲データを追加
DO $$
DECLARE
  trombone_id UUID := '550e8400-e29b-41d4-a716-446655440010';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'リムスキー・コルサコフ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'リムスキー・コルサコフの技巧的な協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'リムスキー・コルサコフ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'デビッド', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'デビッドの美しい協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'デビッド');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'ラッセル', '近代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ラッセルの技巧的な協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'ラッセル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'グリエール', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'グリエールの重厚な協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'グリエール');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'ボルドウィン', '近代', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ボルドウィンの親しみやすい協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'ボルドウィン');
END $$;

-- 10. チェロの代表曲データを追加
DO $$
DECLARE
  cello_id UUID := '550e8400-e29b-41d4-a716-446655440011';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'ドヴォルザーク', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ドヴォルザークの名作チェロ協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'ドヴォルザーク');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'エルガー', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'エルガーの重厚なチェロ協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'エルガー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, '無伴奏チェロ組曲第1番', 'バッハ', 'バロック', '無伴奏', 4, 'https://www.youtube.com/watch?v=example', 'バッハの無伴奏チェロ組曲の第1番。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = '無伴奏チェロ組曲第1番' AND composer = 'バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロソナタ', 'ベートーヴェン', '古典派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'ベートーヴェンの技巧的なソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロソナタ' AND composer = 'ベートーヴェン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'ハイドン', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ハイドンの明るいチェロ協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'ハイドン');
END $$;

-- 11. ファゴットの代表曲データを追加
DO $$
DECLARE
  bassoon_id UUID := '550e8400-e29b-41d4-a716-446655440012';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴット協奏曲', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの美しいファゴット協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴット協奏曲' AND composer = 'モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴット協奏曲', 'ウェーバー', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ウェーバーの技巧的な協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴット協奏曲' AND composer = 'ウェーバー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴット協奏曲', 'ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ヴィヴァルディの明るいファゴット協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴット協奏曲' AND composer = 'ヴィヴァルディ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴットソナタ', 'サン＝サーンス', 'ロマン派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'サン＝サーンスの技巧的なソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴットソナタ' AND composer = 'サン＝サーンス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴット協奏曲', 'フンメル', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'フンメルの明るい協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴット協奏曲' AND composer = 'フンメル');
END $$;

-- 12. オーボエの代表曲データを追加
DO $$
DECLARE
  oboe_id UUID := '550e8400-e29b-41d4-a716-446655440013';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエ協奏曲', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'モーツァルトの美しいオーボエ協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエ協奏曲' AND composer = 'モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエ協奏曲', 'マルチェッロ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'マルチェッロの優雅な協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエ協奏曲' AND composer = 'マルチェッロ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエ協奏曲', 'リヒャルト・シュトラウス', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'リヒャルト・シュトラウスの技巧的な協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエ協奏曲' AND composer = 'リヒャルト・シュトラウス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエソナタ', 'サン＝サーンス', 'ロマン派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'サン＝サーンスの技巧的なソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエソナタ' AND composer = 'サン＝サーンス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエ協奏曲', 'ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ヴィヴァルディの明るいオーボエ協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエ協奏曲' AND composer = 'ヴィヴァルディ');
END $$;

-- 13. コントラバスの代表曲データを追加
DO $$
DECLARE
  contrabass_id UUID := '550e8400-e29b-41d4-a716-446655440015';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'ドラゴネッティ', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ドラゴネッティの技巧的な協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'ドラゴネッティ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'クセナキス', '現代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'クセナキスの現代的な協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'クセナキス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'ボッテジーニ', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ボッテジーニの超絶技巧協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'ボッテジーニ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'カプッツィ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'カプッツィの美しい協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'カプッツィ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'ヴァン・ハル', '現代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ヴァン・ハルの現代的な協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'ヴァン・ハル');
END $$;

-- 14. ヴィオラの代表曲データを追加
DO $$
DECLARE
  viola_id UUID := '550e8400-e29b-41d4-a716-446655440018';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ヴィオラ協奏曲', 'バルトーク', '近代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'バルトークの技巧的なヴィオラ協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ヴィオラ協奏曲' AND composer = 'バルトーク');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ヴィオラ協奏曲', 'ヒンデミット', '近代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ヒンデミットの重厚な協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ヴィオラ協奏曲' AND composer = 'ヒンデミット');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ヴィオラソナタ', 'ブラームス', 'ロマン派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'ブラームスの重厚なソナタ。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ヴィオラソナタ' AND composer = 'ブラームス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ハロルド・イン・イタリア', 'ベルリオーズ', 'ロマン派', '交響曲', 4, 'https://www.youtube.com/watch?v=example', 'ベルリオーズのヴィオラが主役の交響曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ハロルド・イン・イタリア' AND composer = 'ベルリオーズ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ヴィオラ協奏曲', 'テレマン', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'テレマンの優雅な協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ヴィオラ協奏曲' AND composer = 'テレマン');
END $$;

-- 15. 打楽器の代表曲データを追加
DO $$
DECLARE
  drums_id UUID := '550e8400-e29b-41d4-a716-446655440006';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, 'ボレロ', 'ラヴェル', '近代', '管弦楽', 3, 'https://www.youtube.com/watch?v=example', 'ラヴェルの打楽器が主役の名曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = 'ボレロ' AND composer = 'ラヴェル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, 'シンフォニエッタ', 'ヤナーチェク', '近代', '管弦楽', 4, 'https://www.youtube.com/watch?v=example', 'ヤナーチェクの打楽器が活躍する作品。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = 'シンフォニエッタ' AND composer = 'ヤナーチェク');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, '打楽器協奏曲', 'バルトーク', '近代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'バルトークの技巧的な打楽器協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = '打楽器協奏曲' AND composer = 'バルトーク');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, 'マルタンバ協奏曲', 'ミヨー', '近代', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ミヨーの美しいマルタンバ協奏曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = 'マルタンバ協奏曲' AND composer = 'ミヨー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, '打楽器のための音楽', 'ケージ', '現代', '現代音楽', 4, 'https://www.youtube.com/watch?v=example', 'ケージの実験的な打楽器作品。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = '打楽器のための音楽' AND composer = 'ケージ');
END $$;

-- 確認クエリ
SELECT 
  i.name as instrument_name,
  COUNT(rs.id) as song_count
FROM instruments i
LEFT JOIN representative_songs rs ON i.id = rs.instrument_id
WHERE i.id IN (
  '550e8400-e29b-41d4-a716-446655440001', -- ピアノ
  '550e8400-e29b-41d4-a716-446655440002', -- ギター
  '550e8400-e29b-41d4-a716-446655440003', -- バイオリン
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
  '550e8400-e29b-41d4-a716-446655440015', -- コントラバス
  '550e8400-e29b-41d4-a716-446655440018'  -- ヴィオラ
)
GROUP BY i.id, i.name
ORDER BY i.name;

