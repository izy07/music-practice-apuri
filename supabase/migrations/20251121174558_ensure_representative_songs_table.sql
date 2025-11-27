-- representative_songsテーブルが存在しない場合に作成する
-- instrumentsテーブルが存在しない場合も作成する包括的なマイグレーション

-- 1. instrumentsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color_primary TEXT NOT NULL DEFAULT '#8B4513',
  color_secondary TEXT NOT NULL DEFAULT '#F8F9FA',
  color_accent TEXT NOT NULL DEFAULT '#8B4513',
  starting_note TEXT,
  tuning_notes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- instrumentsテーブルのRLSを有効化
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;

-- instrumentsテーブルのRLSポリシーを作成（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'instruments' 
    AND policyname = 'Anyone can view instruments'
  ) THEN
    CREATE POLICY "Anyone can view instruments" ON instruments
      FOR SELECT USING (true);
  END IF;
END $$;

-- 2. バイオリンが存在しない場合は追加
INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) 
VALUES ('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#A0522D', '#CD853F', '#8B4513', 'G3', ARRAY['G3', 'D4', 'A4', 'E5'])
ON CONFLICT (id) DO NOTHING;

-- 3. representative_songsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS representative_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instrument_id UUID REFERENCES instruments(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  era TEXT,
  genre TEXT,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  youtube_url TEXT,
  spotify_url TEXT,
  description_ja TEXT,
  description_en TEXT,
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  famous_performer TEXT,
  famous_video_url TEXT,
  famous_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_representative_songs_instrument_id ON representative_songs(instrument_id);
CREATE INDEX IF NOT EXISTS idx_representative_songs_display_order ON representative_songs(display_order);
CREATE INDEX IF NOT EXISTS idx_representative_songs_is_popular ON representative_songs(is_popular);

-- 5. RLS（Row Level Security）の有効化
ALTER TABLE representative_songs ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシーの作成（存在しない場合のみ）
DO $$
BEGIN
  -- 既存のポリシーを削除してから再作成（重複を避ける）
  DROP POLICY IF EXISTS "Anyone can view representative songs" ON representative_songs;
  DROP POLICY IF EXISTS "representative_songs_select_policy" ON representative_songs;
  
  -- 新しいポリシーを作成
  CREATE POLICY "Anyone can view representative songs" ON representative_songs
    FOR SELECT USING (true);
END $$;

-- 7. 更新日時を自動更新するトリガー関数を作成（存在しない場合のみ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 更新日時を自動更新するトリガー（存在しない場合のみ）
DROP TRIGGER IF EXISTS update_representative_songs_updated_at ON representative_songs;
CREATE TRIGGER update_representative_songs_updated_at
  BEFORE UPDATE ON representative_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. バイオリンの代表曲データを追加（重複チェック付き）
DO $$
DECLARE
  violin_id UUID := '550e8400-e29b-41d4-a716-446655440003';
BEGIN
  -- バイオリンの存在確認
  IF NOT EXISTS (SELECT 1 FROM instruments WHERE id = violin_id) THEN
    INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) 
    VALUES (violin_id, 'バイオリン', 'Violin', '#A0522D', '#CD853F', '#8B4513', 'G3', ARRAY['G3', 'D4', 'A4', 'E5'])
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  -- バイオリンの代表曲を挿入（重複チェック付き）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'コウモリ序曲', 'ヨハン・シュトラウス2世', 'ロマン派', 'オペレッタ', 4, 'https://youtu.be/BugDZWgVQnY?si=k-wwJiiY_lfx2wWI', 'オペレッタ「こうもり」の序曲。ウィーンを代表する軽快で華やかな旋律。', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'コウモリ序曲' AND composer = 'ヨハン・シュトラウス2世');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, '情熱大陸', '葉加瀬太郎', '現代', 'テレビ音楽', 3, 'https://www.youtube.com/watch?v=example_passion', 'TBS系「情熱大陸」のテーマ曲。現代的なバイオリンの音色で知られる。', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = '情熱大陸' AND composer = '葉加瀬太郎');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'G線のアリア', 'ヨハン・セバスチャン・バッハ', 'バロック', 'クラシック', 3, 'https://www.youtube.com/watch?v=example_g_string', 'バッハの管弦楽組曲第3番から編曲された名曲。G線のみで演奏される美しい旋律。', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'G線のアリア' AND composer = 'ヨハン・セバスチャン・バッハ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'チャルダッシュ', 'ヴィットーリオ・モンティ', 'ロマン派', 'クラシック', 3, 'https://youtu.be/rXd1S2oiaTg?si=W-l35GBLXG1J11wW', 'ハンガリーの民族舞踊をモチーフにした華麗な作品。バイオリンの技巧を存分に発揮できる。', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'チャルダッシュ' AND composer = 'ヴィットーリオ・モンティ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'ツィゴイネルワイゼン', 'パブロ・デ・サラサーテ', 'ロマン派', 'クラシック', 5, 'https://www.youtube.com/watch?v=example_zigeuner', 'ジプシーの音楽を題材にした超絶技巧の名曲。バイオリニストの登竜門として知られる。', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'ツィゴイネルワイゼン' AND composer = 'パブロ・デ・サラサーテ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'カプリース第24番', 'ニコロ・パガニーニ', 'ロマン派', 'クラシック', 5, 'https://www.youtube.com/watch?v=example_caprice24', 'パガニーニの24のカプリースの中でも最も有名な作品。超絶技巧の集大成。', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'カプリース第24番' AND composer = 'ニコロ・パガニーニ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, '四季「春」', 'アントニオ・ヴィヴァルディ', 'バロック', 'クラシック', 2, 'https://www.youtube.com/watch?v=example_spring', 'バロック時代の名作。春の訪れを美しく表現した協奏曲。', true, 7
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = '四季「春」' AND composer = 'アントニオ・ヴィヴァルディ');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, '愛の挨拶', 'エドワード・エルガー', 'ロマン派', 'クラシック', 2, 'https://www.youtube.com/watch?v=example_salut', '結婚式でよく演奏される美しい旋律。ロマンチックで親しみやすい作品。', true, 8
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = '愛の挨拶' AND composer = 'エドワード・エルガー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'ハバネラ', 'ジョルジュ・ビゼー', 'ロマン派', 'オペラ', 3, 'https://www.youtube.com/watch?v=example_habanera', 'カルメンの有名なアリアをバイオリン用に編曲。情熱的で印象的な旋律。', true, 9
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'ハバネラ' AND composer = 'ジョルジュ・ビゼー');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'ユーモレスク', 'アントニン・ドヴォルザーク', 'ロマン派', 'クラシック', 2, 'https://www.youtube.com/watch?v=example_humoresque', 'チェコの作曲家による親しみやすい小品。美しい旋律が印象的。', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'ユーモレスク' AND composer = 'アントニン・ドヴォルザーク');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'メンデルスゾーンのバイオリン協奏曲 第1楽章', 'フェリックス・メンデルスゾーン', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example_mendelssohn', 'ロマン派の名協奏曲。美しい旋律と技巧的なパッセージが魅力。', true, 11
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'メンデルスゾーンのバイオリン協奏曲 第1楽章' AND composer = 'フェリックス・メンデルスゾーン');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, 'ブラームスのバイオリン協奏曲 第1楽章', 'ヨハネス・ブラームス', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example_brahms', 'ドイツ・ロマン派の巨匠による重厚で技巧的な協奏曲。', true, 12
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = 'ブラームスのバイオリン協奏曲 第1楽章' AND composer = 'ヨハネス・ブラームス');
  
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) 
  SELECT violin_id, '二つのバイオリンのための協奏曲', 'ヨハン・セバスチャン・バッハ', 'バロック', '協奏曲', 4, 'https://youtu.be/P_4rbNHsPaQ?si=2f2uIoBmkNSbPY87', 'バッハの二重協奏曲。二つのバイオリンが美しく絡み合う名作。', true, 13
  WHERE NOT EXISTS (SELECT 1 FROM representative_songs WHERE instrument_id = violin_id AND title = '二つのバイオリンのための協奏曲' AND composer = 'ヨハン・セバスチャン・バッハ');
END $$;

