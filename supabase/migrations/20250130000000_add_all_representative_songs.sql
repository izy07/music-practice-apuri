-- ============================================
-- すべての楽器の代表曲データを追加するマイグレーション
-- ============================================
-- 実行日: 2025-01-30
-- ============================================
-- このマイグレーションは、すべての楽器の代表曲データを追加します
-- 既存のデータと重複しないように、WHERE NOT EXISTSを使用しています
-- ============================================

-- バイオリンの代表曲データを追加
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'チャルダッシュ', 'モンティ', '近代', '舞曲', 3, 'https://www.youtube.com/watch?v=3yK_7I8Z_8s', '情熱的で技巧的なジプシー音楽の名曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'チャルダッシュ' AND composer = 'モンティ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'ツィゴイネルワイゼン', 'サラサーテ', 'ロマン派', '舞曲', 5, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ジプシー音楽を題材にした超絶技巧曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'ツィゴイネルワイゼン' AND composer = 'サラサーテ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, '四季より「春」', 'ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=GRxofEmo3HA', 'バロック時代の代表的な協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = '四季より「春」' AND composer = 'ヴィヴァルディ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'カノン', 'パッヘルベル', 'バロック', 'カノン', 2, 'https://www.youtube.com/watch?v=NlprozGcs80', '美しい和声進行で知られる名曲。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'カノン' AND composer = 'パッヘルベル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'サマータイム', 'ガーシュウィン', '近代', 'ジャズ', 3, 'https://www.youtube.com/watch?v=O7-Qa92Rzb4', 'ジャズクラシックの名曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'サマータイム' AND composer = 'ガーシュウィン');
END $$;

-- ハープの代表曲データを追加
DO $$
DECLARE
  harp_id UUID := '550e8400-e29b-41d4-a716-446655440014';
BEGIN
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'ハンデル', 'バロック', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ハンデルの美しいハープ協奏曲。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'ハンデル');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'ボエルデュー', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example', 'ボエルデューの技巧的なハープ協奏曲。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'ボエルデュー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'ディッタースドルフ', '古典派', '協奏曲', 3, 'https://www.youtube.com/watch?v=example', 'ディッタースドルフの優雅なハープ協奏曲。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'ディッタースドルフ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープソナタ', 'ドビュッシー', '印象派', 'ソナタ', 4, 'https://www.youtube.com/watch?v=example', 'ドビュッシーの印象的なハープソナタ。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープソナタ' AND composer = 'ドビュッシー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT harp_id, 'ハープ協奏曲', 'ジンマーマン', '現代', '協奏曲', 5, 'https://www.youtube.com/watch?v=example', 'ジンマーマンの現代的なハープ協奏曲。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = harp_id AND title = 'ハープ協奏曲' AND composer = 'ジンマーマン');
END $$;


