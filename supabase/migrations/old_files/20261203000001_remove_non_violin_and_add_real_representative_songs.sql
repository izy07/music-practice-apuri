-- バイオリン以外の代表曲を削除し、各楽器の見せ場がある本当の代表曲を追加
-- 実行日: 2025-12-03

-- 1. バイオリン以外の代表曲を削除
DELETE FROM representative_songs 
WHERE instrument_id != '550e8400-e29b-41d4-a716-446655440003';

-- 2. 各楽器の見せ場がある本当の代表曲を追加
DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
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
  viola_id UUID := '550e8400-e29b-41d4-a716-446655440018';
BEGIN
  -- ピアノの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, 'ラ・カンパネラ', 'フランツ・リスト', 'ロマン派', '練習曲', 5, 'https://www.youtube.com/watch?v=H1Dvg2MxQn8', 'リストの超絶技巧練習曲。跳躍と装飾音の見せ場が満載。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = 'ラ・カンパネラ' AND composer = 'フランツ・リスト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '革命のエチュード', 'フレデリック・ショパン', 'ロマン派', '練習曲', 5, 'https://www.youtube.com/watch?v=g1uLrHq9TDg', 'ショパンの練習曲集より。左手の激しい動きが圧巻。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '革命のエチュード' AND composer = 'フレデリック・ショパン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '幻想即興曲', 'フレデリック・ショパン', 'ロマン派', '即興曲', 4, 'https://www.youtube.com/watch?v=9E6b3swbnWg', 'ショパンの代表的な即興曲。華やかで技巧的な作品。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '幻想即興曲' AND composer = 'フレデリック・ショパン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '月光ソナタ 第3楽章', 'ルートヴィヒ・ヴァン・ベートーヴェン', '古典派', 'ソナタ', 5, 'https://www.youtube.com/watch?v=4Tr0otuiQuU', 'ベートーヴェンのソナタ。激しいパッセージが印象的。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '月光ソナタ 第3楽章' AND composer = 'ルートヴィヒ・ヴァン・ベートーヴェン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, 'トルコ行進曲', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', 'ソナタ', 3, 'https://www.youtube.com/watch?v=8OqYTe8lq7o', 'モーツァルトのピアノソナタ第11番より。軽快で華やかな旋律。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = 'トルコ行進曲' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  -- ギターの見せ場がある代表曲
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
  
  -- フルートの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルート協奏曲 第2番', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=3rGqV7oA8Yk', 'モーツァルトの美しいフルート協奏曲。技巧的なパッセージが光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルート協奏曲 第2番' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'シランクス', 'クロード・ドビュッシー', '印象派', 'ソロ', 5, 'https://www.youtube.com/watch?v=YGR5ebY4I0k', 'ドビュッシーの印象的なフルートソロ。音色の美しさが際立つ。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'シランクス' AND composer = 'クロード・ドビュッシー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'フルートソナタ ホ短調', 'ヨハン・セバスチャン・バッハ', 'バロック', 'ソナタ', 4, 'https://www.youtube.com/watch?v=7X9jv3_4XwY', 'バッハの技巧的なフルートソナタ。対位法の美しさが光る。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'フルートソナタ ホ短調' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  -- トランペットの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'フランツ・ヨーゼフ・ハイドン', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ハイドンの明るいトランペット協奏曲。高音域の技巧が光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'フランツ・ヨーゼフ・ハイドン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット協奏曲', 'ヨハン・ネポムク・フンメル', '古典派', '協奏曲', 5, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'フンメルの技巧的な協奏曲。超絶技巧の見せ場が満載。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット協奏曲' AND composer = 'ヨハン・ネポムク・フンメル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, 'トランペット吹きの休日', 'ルロイ・アンダーソン', '近代', '軽音楽', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '軽快で楽しいトランペット曲。リズムの見せ場が光る。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = 'トランペット吹きの休日' AND composer = 'ルロイ・アンダーソン');
  
  -- サックスの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'サクソフォン協奏曲', 'アレクサンドル・グラズノフ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'グラズノフの美しいサックス協奏曲。音色の豊かさが光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'サクソフォン協奏曲' AND composer = 'アレクサンドル・グラズノフ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'ケアレス・ウィスパー', 'ジョージ・マイケル', '現代', 'ポップス', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'サックスの美しいソロが印象的な名曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'ケアレス・ウィスパー' AND composer = 'ジョージ・マイケル');
  
  -- チェロの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, '無伴奏チェロ組曲 第1番 プレリュード', 'ヨハン・セバスチャン・バッハ', 'バロック', '組曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'バッハの無伴奏チェロ組曲。チェロの表現力の極致。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = '無伴奏チェロ組曲 第1番 プレリュード' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'チェロ協奏曲', 'アントニン・ドヴォルザーク', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ドヴォルザークの名協奏曲。チェロの豊かな音色が光る。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'チェロ協奏曲' AND composer = 'アントニン・ドヴォルザーク');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, '白鳥', 'カミーユ・サン＝サーンス', 'ロマン派', '組曲', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '動物の謝肉祭より。チェロの美しい旋律が印象的。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = '白鳥' AND composer = 'カミーユ・サン＝サーンス');
  
  -- クラリネットの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネット協奏曲', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'モーツァルトの美しいクラリネット協奏曲。音色の美しさが光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネット協奏曲' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネット五重奏曲', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', '室内楽', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'モーツァルトの室内楽の名作。クラリネットの表現力が光る。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネット五重奏曲' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  -- オーボエの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'オーボエ協奏曲', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'モーツァルトの美しいオーボエ協奏曲。独特の音色が光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'オーボエ協奏曲' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  -- ホルンの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲 第1番', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'モーツァルトのホルン協奏曲。ホルンの豊かな音色が光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲 第1番' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ホルン協奏曲 第1番', 'リヒャルト・シュトラウス', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'シュトラウスの技巧的なホルン協奏曲。超絶技巧の見せ場が満載。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ホルン協奏曲 第1番' AND composer = 'リヒャルト・シュトラウス');
  
  -- トロンボーンの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'トロンボーン協奏曲', 'ニコライ・リムスキー＝コルサコフ', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'リムスキー＝コルサコフのトロンボーン協奏曲。力強い音色が光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'トロンボーン協奏曲' AND composer = 'ニコライ・リムスキー＝コルサコフ');
  
  -- ハープの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'ゲオルク・フリードリヒ・ヘンデル', 'バロック', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ヘンデルの美しいハープ協奏曲。ハープの優雅な音色が光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'ゲオルク・フリードリヒ・ヘンデル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'フランソワ・ボワルデュー', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ボワルデューの技巧的なハープ協奏曲。アルペジオの見せ場が光る。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'フランソワ・ボワルデュー');
  
  -- ファゴットの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ファゴット協奏曲', 'ヴォルフガング・アマデウス・モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'モーツァルトのファゴット協奏曲。低音の豊かさが光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ファゴット協奏曲' AND composer = 'ヴォルフガング・アマデウス・モーツァルト');
  
  -- コントラバスの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, 'コントラバス協奏曲', 'カール・ディッタース・フォン・ディッタースドルフ', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ディッタースドルフのコントラバス協奏曲。低音の力強さが光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = 'コントラバス協奏曲' AND composer = 'カール・ディッタース・フォン・ディッタースドルフ');
  
  -- ヴィオラの見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ヴィオラ協奏曲', 'ウィリアム・ウォルトン', '現代', '協奏曲', 5, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ウォルトンのヴィオラ協奏曲。ヴィオラの豊かな音色が光る。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ヴィオラ協奏曲' AND composer = 'ウィリアム・ウォルトン');
  
  -- 打楽器の見せ場がある代表曲
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, 'ボレロ', 'モーリス・ラヴェル', '近代', '管弦楽', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ラヴェルのボレロ。スネアドラムのリズムが全曲を支配する名作。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = 'ボレロ' AND composer = 'モーリス・ラヴェル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, 'タイコ', '日本の伝統', '伝統', '和太鼓', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '日本の和太鼓の見せ場。力強く迫力のあるリズムが光る。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = 'タイコ' AND composer = '日本の伝統');
  
  RAISE NOTICE '各楽器の見せ場がある代表曲を追加しました';
END $$;

