-- goalsテーブルにshow_on_calendarカラムを確実に追加するマイグレーション
-- 日付: 2025-11-27

-- goalsテーブルにshow_on_calendar列を追加（存在しない場合のみ）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar') THEN
      ALTER TABLE goals ADD COLUMN show_on_calendar BOOLEAN DEFAULT false;
      COMMENT ON COLUMN goals.show_on_calendar IS 'カレンダーに表示するかどうか（true: 表示, false: 非表示）';
      
      -- 既存のレコードをfalseに設定
      UPDATE goals SET show_on_calendar = false WHERE show_on_calendar IS NULL;
    END IF;
  END IF;
END $$;

-- インデックスを作成（存在しない場合のみ）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goals_show_on_calendar') THEN
      CREATE INDEX idx_goals_show_on_calendar ON goals(show_on_calendar) WHERE show_on_calendar = true;
    END IF;
  END IF;
END $$;

