-- 基礎練メニューテーブルの作成
-- アプリ更新なしに内容を変更可能にするため、DBに移行

CREATE TABLE IF NOT EXISTS practice_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID REFERENCES instruments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  points JSONB, -- ポイントの配列
  how_to_practice JSONB, -- 練習方法の配列
  recommended_tempo TEXT,
  duration TEXT,
  tips JSONB, -- ヒントの配列
  video_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE practice_menus ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "practice_menus_select_policy" ON practice_menus
  FOR SELECT USING (true);

-- 管理者のみ書き込み可能（必要に応じて追加）
-- CREATE POLICY "practice_menus_insert_policy" ON practice_menus
--   FOR INSERT WITH CHECK (auth.role() = 'admin');

-- インデックス
CREATE INDEX IF NOT EXISTS idx_practice_menus_instrument_id ON practice_menus(instrument_id);
CREATE INDEX IF NOT EXISTS idx_practice_menus_difficulty ON practice_menus(difficulty);
CREATE INDEX IF NOT EXISTS idx_practice_menus_display_order ON practice_menus(display_order);

-- コメント
COMMENT ON TABLE practice_menus IS '基礎練メニューのマスターデータ。アプリ更新なしに内容を変更可能。';
COMMENT ON COLUMN practice_menus.instrument_id IS '楽器ID（NULLの場合は共通メニュー）';
COMMENT ON COLUMN practice_menus.difficulty IS '難易度（beginner, intermediate, advanced）';
COMMENT ON COLUMN practice_menus.points IS 'ポイントの配列（JSONB）';
COMMENT ON COLUMN practice_menus.how_to_practice IS '練習方法の配列（JSONB）';
COMMENT ON COLUMN practice_menus.tips IS 'ヒントの配列（JSONB）';


