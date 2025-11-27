-- goalsテーブルにis_completedカラムを確実に追加するマイグレーション（最終版）
-- 2025-10-29

-- goalsテーブルにis_completed列を追加（存在しない場合のみ）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'is_completed') THEN
      ALTER TABLE goals ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
      COMMENT ON COLUMN goals.is_completed IS '目標の完了状態';
      
      -- 既存のレコードをfalseに設定
      UPDATE goals SET is_completed = FALSE WHERE is_completed IS NULL;
    END IF;
  END IF;
END $$;

-- goalsテーブルにcompleted_at列を追加（存在しない場合のみ）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'completed_at') THEN
      ALTER TABLE goals ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
      COMMENT ON COLUMN goals.completed_at IS '目標完了日時';
    END IF;
  END IF;
END $$;

-- インデックスを作成（存在しない場合のみ）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goals_is_completed') THEN
      CREATE INDEX idx_goals_is_completed ON goals(is_completed);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goals_completed_at') THEN
      CREATE INDEX idx_goals_completed_at ON goals(completed_at);
    END IF;
  END IF;
END $$;

