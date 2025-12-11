-- ミニ音楽辞典テーブルの作成
-- アプリ更新なしに内容を変更可能にするため、DBに移行

CREATE TABLE IF NOT EXISTS music_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_ja TEXT NOT NULL,
  term_en TEXT,
  category TEXT, -- カテゴリ（例：楽器、記号、理論、用語など）
  description_ja TEXT,
  description_en TEXT,
  example_usage TEXT, -- 使用例
  related_terms JSONB, -- 関連用語の配列
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE music_terms ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "music_terms_select_policy" ON music_terms
  FOR SELECT USING (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_music_terms_category ON music_terms(category);
CREATE INDEX IF NOT EXISTS idx_music_terms_term_ja ON music_terms(term_ja);
CREATE INDEX IF NOT EXISTS idx_music_terms_display_order ON music_terms(display_order);

-- コメント
COMMENT ON TABLE music_terms IS 'ミニ音楽辞典のマスターデータ。アプリ更新なしに内容を変更可能。';
COMMENT ON COLUMN music_terms.category IS 'カテゴリ（例：楽器、記号、理論、用語など）';
COMMENT ON COLUMN music_terms.related_terms IS '関連用語の配列（JSONB）';


