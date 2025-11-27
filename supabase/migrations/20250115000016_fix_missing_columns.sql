-- 不足している列を追加するマイグレーション
-- 2025-01-15

-- goalsテーブルにis_completed列を追加
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'is_completed') THEN
      ALTER TABLE goals ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
    END IF;
  END IF;
END $$;

-- user_profilesテーブルにorganization列を追加
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'organization') THEN
      ALTER TABLE user_profiles ADD COLUMN organization TEXT;
    END IF;
  END IF;
END $$;

-- goalsテーブルにcompleted_at列を追加（もし存在しない場合）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'completed_at') THEN
      ALTER TABLE goals ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;
END $$;

-- インデックスを作成（もし存在しない場合）
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
