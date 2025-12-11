-- 基礎練メニューテーブルの作成
-- アプリ更新なしに内容を変更可能にするため、DBに移行

-- ============================================
-- practice_menusテーブルの作成
-- ============================================
DO $$
BEGIN
  -- practice_menusテーブルが存在しない場合は作成
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
    
    RAISE NOTICE '✅ practice_menusテーブルを作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ practice_menusテーブルは既に存在します';
  END IF;
END $$;

-- ============================================
-- practice_menusテーブルのRLSポリシー
-- ============================================
DO $$
BEGIN
  -- 全ユーザーが読み取り可能
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'practice_menus' 
    AND policyname = 'practice_menus_select_policy'
  ) THEN
    CREATE POLICY "practice_menus_select_policy" ON practice_menus
      FOR SELECT USING (true);
    RAISE NOTICE '✅ practice_menus_select_policyを作成しました';
  ELSE
    RAISE NOTICE 'ℹ️ practice_menus_select_policyは既に存在します';
  END IF;
  
  -- 管理者のみ書き込み可能（必要に応じて追加）
  -- IF NOT EXISTS (
  --   SELECT 1 FROM pg_policies 
  --   WHERE schemaname = 'public' 
  --   AND tablename = 'practice_menus' 
  --   AND policyname = 'practice_menus_insert_policy'
  -- ) THEN
  --   CREATE POLICY "practice_menus_insert_policy" ON practice_menus
  --     FOR INSERT WITH CHECK (auth.role() = 'admin');
  -- END IF;
END $$;

-- PostgRESTのスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';


