-- representative_songsテーブルの作成とバイオリンの代表曲データの追加

-- 1. representative_songsテーブルの作成
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_representative_songs_instrument_id ON representative_songs(instrument_id);
CREATE INDEX IF NOT EXISTS idx_representative_songs_display_order ON representative_songs(display_order);
CREATE INDEX IF NOT EXISTS idx_representative_songs_is_popular ON representative_songs(is_popular);

-- 3. RLS（Row Level Security）の有効化
ALTER TABLE representative_songs ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシーの作成（全ユーザーが読み取り可能）
CREATE POLICY "Anyone can view representative songs" ON representative_songs
  FOR SELECT USING (true);

-- 5. 更新日時を自動更新するトリガー
CREATE TRIGGER update_representative_songs_updated_at
  BEFORE UPDATE ON representative_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. バイオリンの代表曲データを追加
-- まずバイオリンのinstrument_idを取得してから挿入
DO $$
DECLARE
  violin_id UUID;
BEGIN
  -- バイオリンのIDを取得（複数のパターンで検索）
  SELECT id INTO violin_id FROM instruments 
  WHERE name = 'バイオリン' 
     OR name_en = 'violin' 
     OR name_en = 'Violin'
     OR id = '550e8400-e29b-41d4-a716-446655440003'
  LIMIT 1;
  
  -- バイオリンが見つからない場合は、まずバイオリンを挿入
  IF violin_id IS NULL THEN
    INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) 
    VALUES ('550e8400-e29b-41d4-a716-446655440003', 'バイオリン', 'Violin', '#A0522D', '#CD853F', '#8B4513', 'G3', ARRAY['G3', 'D4', 'A4', 'E5'])
    ON CONFLICT (id) DO NOTHING;
    
    violin_id := '550e8400-e29b-41d4-a716-446655440003';
  END IF;
  
  -- バイオリンの代表曲を挿入（重複チェック付き）
  INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) VALUES
  (violin_id, 'コウモリ序曲', 'ヨハン・シュトラウス2世', 'ロマン派', 'オペレッタ', 4, 'https://youtu.be/BugDZWgVQnY?si=k-wwJiiY_lfx2wWI', 'オペレッタ「こうもり」の序曲。ウィーンを代表する軽快で華やかな旋律。', true, 1),
  (violin_id, '情熱大陸', '葉加瀬太郎', '現代', 'テレビ音楽', 3, 'https://www.youtube.com/watch?v=example_passion', 'TBS系「情熱大陸」のテーマ曲。現代的なバイオリンの音色で知られる。', true, 2),
  (violin_id, 'G線のアリア', 'ヨハン・セバスチャン・バッハ', 'バロック', 'クラシック', 3, 'https://www.youtube.com/watch?v=example_g_string', 'バッハの管弦楽組曲第3番から編曲された名曲。G線のみで演奏される美しい旋律。', true, 3),
  (violin_id, 'チャルダッシュ', 'ヴィットーリオ・モンティ', 'ロマン派', 'クラシック', 3, 'https://youtu.be/rXd1S2oiaTg?si=W-l35GBLXG1J11wW', 'ハンガリーの民族舞踊をモチーフにした華麗な作品。バイオリンの技巧を存分に発揮できる。', true, 4),
  (violin_id, 'ツィゴイネルワイゼン', 'パブロ・デ・サラサーテ', 'ロマン派', 'クラシック', 5, 'https://www.youtube.com/watch?v=example_zigeuner', 'ジプシーの音楽を題材にした超絶技巧の名曲。バイオリニストの登竜門として知られる。', true, 5),
  (violin_id, 'カプリース第24番', 'ニコロ・パガニーニ', 'ロマン派', 'クラシック', 5, 'https://www.youtube.com/watch?v=example_caprice24', 'パガニーニの24のカプリースの中でも最も有名な作品。超絶技巧の集大成。', true, 6),
  (violin_id, '四季「春」', 'アントニオ・ヴィヴァルディ', 'バロック', 'クラシック', 2, 'https://www.youtube.com/watch?v=example_spring', 'バロック時代の名作。春の訪れを美しく表現した協奏曲。', true, 7),
  (violin_id, '愛の挨拶', 'エドワード・エルガー', 'ロマン派', 'クラシック', 2, 'https://www.youtube.com/watch?v=example_salut', '結婚式でよく演奏される美しい旋律。ロマンチックで親しみやすい作品。', true, 8),
  (violin_id, 'ハバネラ', 'ジョルジュ・ビゼー', 'ロマン派', 'オペラ', 3, 'https://www.youtube.com/watch?v=example_habanera', 'カルメンの有名なアリアをバイオリン用に編曲。情熱的で印象的な旋律。', true, 9),
  (violin_id, 'ユーモレスク', 'アントニン・ドヴォルザーク', 'ロマン派', 'クラシック', 2, 'https://www.youtube.com/watch?v=example_humoresque', 'チェコの作曲家による親しみやすい小品。美しい旋律が印象的。', true, 10),
  (violin_id, 'メンデルスゾーンのバイオリン協奏曲 第1楽章', 'フェリックス・メンデルスゾーン', 'ロマン派', '協奏曲', 4, 'https://www.youtube.com/watch?v=example_mendelssohn', 'ロマン派の名協奏曲。美しい旋律と技巧的なパッセージが魅力。', true, 11),
  (violin_id, 'ブラームスのバイオリン協奏曲 第1楽章', 'ヨハネス・ブラームス', 'ロマン派', '協奏曲', 5, 'https://www.youtube.com/watch?v=example_brahms', 'ドイツ・ロマン派の巨匠による重厚で技巧的な協奏曲。', true, 12),
  (violin_id, '二つのバイオリンのための協奏曲', 'ヨハン・セバスチャン・バッハ', 'バロック', '協奏曲', 4, 'https://youtu.be/P_4rbNHsPaQ?si=2f2uIoBmkNSbPY87', 'バッハの二重協奏曲。二つのバイオリンが美しく絡み合う名作。', true, 13)
  ON CONFLICT DO NOTHING;
END $$;
