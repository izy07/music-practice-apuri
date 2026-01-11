-- バイオリン以外の各楽器の代表曲を6つにするスクリプト
-- 各楽器に6曲目を追加
-- Supabase StudioのSQL Editorで実行してください

-- ピアノの6曲目を追加
DO $$
DECLARE
  piano_id UUID := '550e8400-e29b-41d4-a716-446655440001';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT piano_id, '運命交響曲 第1楽章', 'ベートーヴェン', '古典派', '交響曲', 4, 'https://www.youtube.com/watch?v=example_piano_fate', 'ベートーヴェンの交響曲第5番。ピアノ編曲版でも有名。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = piano_id AND title = '運命交響曲 第1楽章' AND composer = 'ベートーヴェン');
END $$;

-- ギターの6曲目を追加
DO $$
DECLARE
  guitar_id UUID := '550e8400-e29b-41d4-a716-446655440002';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT guitar_id, 'セビリアの理髪師より序曲', 'ロッシーニ', 'ロマン派', 'オペラ', 3, 'https://www.youtube.com/watch?v=example_guitar_rossini', 'ロッシーニのオペラ序曲。ギター編曲版が人気。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = guitar_id AND title = 'セビリアの理髪師より序曲' AND composer = 'ロッシーニ');
END $$;

-- フルートの6曲目を追加
DO $$
DECLARE
  flute_id UUID := '550e8400-e29b-41d4-a716-446655440004';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT flute_id, 'カルメン組曲より「ハバネラ」', 'ビゼー', 'ロマン派', 'オペラ', 3, 'https://www.youtube.com/watch?v=example_flute_carmen', 'ビゼーのオペラ「カルメン」より。フルートでよく演奏される。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = flute_id AND title = 'カルメン組曲より「ハバネラ」' AND composer = 'ビゼー');
END $$;

-- トランペットの6曲目を追加
DO $$
DECLARE
  trumpet_id UUID := '550e8400-e29b-41d4-a716-446655440005';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trumpet_id, '威風堂々', 'エルガー', 'ロマン派', '行進曲', 3, 'https://www.youtube.com/watch?v=example_trumpet_pomp', 'エルガーの有名な行進曲。トランペットのファンファーレが印象的。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trumpet_id AND title = '威風堂々' AND composer = 'エルガー');
END $$;

-- クラリネットの6曲目を追加
DO $$
DECLARE
  clarinet_id UUID := '550e8400-e29b-41d4-a716-446655440009';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT clarinet_id, 'クラリネットポルカ', 'ヨハン・シュトラウス2世', 'ロマン派', '舞曲', 3, 'https://www.youtube.com/watch?v=example_clarinet_polka', 'シュトラウスの軽快なポルカ。クラリネットが主役。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = clarinet_id AND title = 'クラリネットポルカ' AND composer = 'ヨハン・シュトラウス2世');
END $$;

-- サックスの6曲目を追加
DO $$
DECLARE
  saxophone_id UUID := '550e8400-e29b-41d4-a716-446655440007';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT saxophone_id, 'カーミーナ・ブラーナより「おお、運命の女神よ」', 'オルフ', '近代', 'カンタータ', 4, 'https://www.youtube.com/watch?v=example_sax_carmina', 'オルフのカンタータ。サックスが活躍する編曲版がある。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = saxophone_id AND title = 'カーミーナ・ブラーナより「おお、運命の女神よ」' AND composer = 'オルフ');
END $$;

-- ホルンの6曲目を追加
DO $$
DECLARE
  horn_id UUID := '550e8400-e29b-41d4-a716-446655440008';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT horn_id, 'ジークフリートの牧歌', 'ワーグナー', 'ロマン派', 'オペラ', 4, 'https://www.youtube.com/watch?v=example_horn_siegfried', 'ワーグナーのオペラ「ジークフリート」より。ホルンが重要な役割。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = horn_id AND title = 'ジークフリートの牧歌' AND composer = 'ワーグナー');
END $$;

-- トロンボーンの6曲目を追加
DO $$
DECLARE
  trombone_id UUID := '550e8400-e29b-41d4-a716-446655440010';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT trombone_id, 'ボレロ', 'ラヴェル', '近代', 'バレエ音楽', 4, 'https://www.youtube.com/watch?v=example_trombone_bolero', 'ラヴェルの名曲。トロンボーンが重要な旋律を担当。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = trombone_id AND title = 'ボレロ' AND composer = 'ラヴェル');
END $$;

-- チェロの6曲目を追加
DO $$
DECLARE
  cello_id UUID := '550e8400-e29b-41d4-a716-446655440011';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT cello_id, 'アダージョ', 'アルビノーニ', 'バロック', 'アダージョ', 3, 'https://www.youtube.com/watch?v=example_cello_albinoni', 'アルビノーニのアダージョ。チェロで美しく演奏される。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = cello_id AND title = 'アダージョ' AND composer = 'アルビノーニ');
END $$;

-- ファゴットの6曲目を追加
DO $$
DECLARE
  bassoon_id UUID := '550e8400-e29b-41d4-a716-446655440012';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT bassoon_id, 'ピーターと狼', 'プロコフィエフ', '近代', '交響的物語', 3, 'https://www.youtube.com/watch?v=example_bassoon_peter', 'プロコフィエフの交響的物語。ファゴットが「おじいさん」を表現。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = bassoon_id AND title = 'ピーターと狼' AND composer = 'プロコフィエフ');
END $$;

-- オーボエの6曲目を追加
DO $$
DECLARE
  oboe_id UUID := '550e8400-e29b-41d4-a716-446655440013';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT oboe_id, 'シェヘラザードより「若き王子と王女」', 'リムスキー・コルサコフ', 'ロマン派', '交響組曲', 4, 'https://www.youtube.com/watch?v=example_oboe_scheherazade', 'リムスキー・コルサコフの交響組曲。オーボエが美しい旋律を奏でる。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = oboe_id AND title = 'シェヘラザードより「若き王子と王女」' AND composer = 'リムスキー・コルサコフ');
END $$;

-- コントラバスの6曲目を追加
DO $$
DECLARE
  contrabass_id UUID := '550e8400-e29b-41d4-a716-446655440015';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT contrabass_id, '動物の謝肉祭より「象」', 'サン＝サーンス', 'ロマン派', '組曲', 2, 'https://www.youtube.com/watch?v=example_contrabass_elephant', 'サン＝サーンスの組曲。コントラバスが象を表現。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = contrabass_id AND title = '動物の謝肉祭より「象」' AND composer = 'サン＝サーンス');
END $$;

-- ヴィオラの6曲目を追加
DO $$
DECLARE
  viola_id UUID := '550e8400-e29b-41d4-a716-446655440018';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT viola_id, 'ドン・キホーテよりヴィオラソロ', 'リヒャルト・シュトラウス', 'ロマン派', '交響詩', 5, 'https://www.youtube.com/watch?v=example_viola_don', 'リヒャルト・シュトラウスの交響詩。ヴィオラが重要な役割。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = viola_id AND title = 'ドン・キホーテよりヴィオラソロ' AND composer = 'リヒャルト・シュトラウス');
END $$;

-- ハープの6曲目を追加
DO $$
DECLARE
  harp_id UUID := '550e8400-e29b-41d4-a716-446655440014';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, '白鳥の湖より「情景」', 'チャイコフスキー', 'ロマン派', 'バレエ', 3, 'https://www.youtube.com/watch?v=example_harp_swan', 'チャイコフスキーのバレエ。ハープが美しい音色を奏でる。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = '白鳥の湖より「情景」' AND composer = 'チャイコフスキー');
END $$;

-- ドラム（打楽器）の6曲目を追加
DO $$
DECLARE
  drums_id UUID := '550e8400-e29b-41d4-a716-446655440006';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT drums_id, '1812年序曲', 'チャイコフスキー', 'ロマン派', '序曲', 4, 'https://www.youtube.com/watch?v=example_drums_1812', 'チャイコフスキーの序曲。打楽器が大活躍する。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = drums_id AND title = '1812年序曲' AND composer = 'チャイコフスキー');
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
