-- practice_menusテーブルの作成
-- 基礎練メニューテーブルの作成

-- practice_menusテーブルの作成
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'practice_menus'
  ) THEN
    CREATE TABLE practice_menus (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      instrument_id UUID REFERENCES instruments(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
      points JSONB,
      how_to_practice JSONB,
      recommended_tempo TEXT,
      duration TEXT,
      tips JSONB,
      video_url TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    ALTER TABLE practice_menus ENABLE ROW LEVEL SECURITY;
    
    CREATE INDEX IF NOT EXISTS idx_practice_menus_instrument_id ON practice_menus(instrument_id);
    CREATE INDEX IF NOT EXISTS idx_practice_menus_difficulty ON practice_menus(difficulty);
    CREATE INDEX IF NOT EXISTS idx_practice_menus_display_order ON practice_menus(display_order);
    
    COMMENT ON TABLE practice_menus IS '基礎練メニューのマスターデータ。アプリ更新なしに内容を変更可能。';
    COMMENT ON COLUMN practice_menus.instrument_id IS '楽器ID（NULLの場合は共通メニュー）';
    COMMENT ON COLUMN practice_menus.difficulty IS '難易度（beginner, intermediate, advanced）';
    
    RAISE NOTICE 'practice_menusテーブルを作成しました';
  ELSE
    RAISE NOTICE 'practice_menusテーブルは既に存在します';
  END IF;
END $$;

-- practice_menusテーブルのRLSポリシー
DO $$
BEGIN
  DROP POLICY IF EXISTS "practice_menus_select_policy" ON practice_menus;
  
  CREATE POLICY "practice_menus_select_policy" ON practice_menus
    FOR SELECT USING (true);
    
  RAISE NOTICE 'practice_menus_select_policyを作成しました';
END $$;

-- PostgRESTのスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';
