-- 楽器ごとの代表曲テーブル
CREATE TABLE IF NOT EXISTS representative_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  era TEXT, -- 時代（例：バロック、古典派、ロマン派、現代）
  genre TEXT, -- ジャンル（例：協奏曲、ソナタ、練習曲）
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5), -- 難易度（1-5）
  youtube_url TEXT, -- YouTube URL
  spotify_url TEXT, -- Spotify URL
  description_ja TEXT, -- 日本語説明
  description_en TEXT, -- 英語説明
  is_popular BOOLEAN DEFAULT false, -- 人気曲フラグ
  display_order INTEGER DEFAULT 0, -- 表示順序
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE representative_songs ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "representative_songs_select_policy" ON representative_songs
  FOR SELECT USING (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_representative_songs_instrument_id ON representative_songs(instrument_id);
CREATE INDEX IF NOT EXISTS idx_representative_songs_display_order ON representative_songs(display_order);
CREATE INDEX IF NOT EXISTS idx_representative_songs_popular ON representative_songs(is_popular);

-- 楽器ごとの代表曲データを挿入
INSERT INTO representative_songs (instrument_id, title, composer, era, genre, difficulty_level, youtube_url, description_ja, is_popular, display_order) VALUES
-- ピアノ
((SELECT id FROM instruments WHERE name_en = 'Piano'), 'エリーゼのために', 'ベートーヴェン', '古典派', 'バガテル', 2, 'https://www.youtube.com/watch?v=_mVW8tgGY_w', 'ベートーヴェンの最も有名な作品の一つ。美しいメロディーで親しまれています。', true, 1),
((SELECT id FROM instruments WHERE name_en = 'Piano'), '幻想即興曲', 'ショパン', 'ロマン派', '即興曲', 4, 'https://www.youtube.com/watch?v=9E6b3swbnWg', 'ショパンの代表的な即興曲。華やかで技巧的な作品です。', true, 2),
((SELECT id FROM instruments WHERE name_en = 'Piano'), '月光ソナタ', 'ベートーヴェン', '古典派', 'ソナタ', 3, 'https://www.youtube.com/watch?v=4Tr0otuiQuU', '第1楽章の美しいアルペジオで知られる名曲。', true, 3),
((SELECT id FROM instruments WHERE name_en = 'Piano'), '愛の夢', 'リスト', 'ロマン派', '夜想曲', 3, 'https://www.youtube.com/watch?v=KpOtuoHL45Y', 'リストの最も美しい作品の一つ。ロマンチックな旋律が印象的。', true, 4),
((SELECT id FROM instruments WHERE name_en = 'Piano'), '子犬のワルツ', 'ショパン', 'ロマン派', 'ワルツ', 2, 'https://www.youtube.com/watch?v=oGXf6t7a5gE', '軽やかで可愛らしいワルツ。初心者にも人気。', true, 5),

-- バイオリン部分は削除（20250120000002_create_representative_songs.sqlに統合済み）

-- フルート
((SELECT id FROM instruments WHERE name_en = 'Flute'), 'フルート協奏曲第2番', 'モーツァルト', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=3rGqV7oA8Yk', 'モーツァルトの美しいフルート協奏曲。', true, 1),
((SELECT id FROM instruments WHERE name_en = 'Flute'), 'シチリアーノ', 'バッハ', 'バロック', '舞曲', 3, 'https://www.youtube.com/watch?v=6JQm5aSjX6g', 'バッハの優雅なシチリアーノ舞曲。', true, 2),
((SELECT id FROM instruments WHERE name_en = 'Flute'), 'フルートソナタ', 'バッハ', 'バロック', 'ソナタ', 4, 'https://www.youtube.com/watch?v=7X9jv3_4XwY', 'バッハの技巧的なフルートソナタ。', true, 3),
((SELECT id FROM instruments WHERE name_en = 'Flute'), 'シランクス', 'ドビュッシー', '印象派', 'ソロ', 4, 'https://www.youtube.com/watch?v=YGR5ebY4I0k', 'ドビュッシーの印象的なフルートソロ。', true, 4),
((SELECT id FROM instruments WHERE name_en = 'Flute'), 'フルート協奏曲', 'ヴィヴァルディ', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=6JQm5aSjX6g', 'ヴィヴァルディの明るいフルート協奏曲。', true, 5),

-- ギター
((SELECT id FROM instruments WHERE name_en = 'Guitar'), 'アルハンブラの思い出', 'タルレガ', 'ロマン派', 'ソロ', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'タルレガの代表的なトレモロ作品。', true, 1),
((SELECT id FROM instruments WHERE name_en = 'Guitar'), 'アストゥリアス', 'アルベニス', '近代', 'ソロ', 4, 'https://www.youtube.com/watch?v=RxPx4b00f0s', 'スペインの情熱的な名曲。', true, 2),
((SELECT id FROM instruments WHERE name_en = 'Guitar'), 'ラグリマ', 'タルレガ', 'ロマン派', 'ソロ', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '美しい旋律の小品。', true, 3),
((SELECT id FROM instruments WHERE name_en = 'Guitar'), 'カヴァティーナ', 'マイヤーズ', '現代', '映画音楽', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '映画「ディア・ハンター」のテーマ。', true, 4),
((SELECT id FROM instruments WHERE name_en = 'Guitar'), 'ロマンス', 'アノニマス', '古典', 'フォルクローレ', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'スペインの伝統的なロマンス。', true, 5),

-- トランペット
((SELECT id FROM instruments WHERE name_en = 'Trumpet'), 'トランペット協奏曲', 'ハイドン', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'ハイドンの明るいトランペット協奏曲。', true, 1),
((SELECT id FROM instruments WHERE name_en = 'Trumpet'), 'トランペット吹きの休日', 'アンダーソン', '近代', '軽音楽', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '軽快で楽しいトランペット曲。', true, 2),
((SELECT id FROM instruments WHERE name_en = 'Trumpet'), 'トランペット協奏曲', 'フンメル', '古典派', '協奏曲', 4, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'フンメルの技巧的な協奏曲。', true, 3),
((SELECT id FROM instruments WHERE name_en = 'Trumpet'), 'トランペット吹きの子守歌', 'アンダーソン', '近代', '軽音楽', 2, 'https://www.youtube.com/watch?v=YyknBTm_YyM', '優しい子守歌のトランペット版。', true, 4),
((SELECT id FROM instruments WHERE name_en = 'Trumpet'), 'トランペット協奏曲', 'テレマン', 'バロック', '協奏曲', 3, 'https://www.youtube.com/watch?v=YyknBTm_YyM', 'テレマンのバロック協奏曲。', true, 5);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_representative_songs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER representative_songs_updated_at
  BEFORE UPDATE ON representative_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_representative_songs_updated_at();
