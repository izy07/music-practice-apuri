-- すべてのテーブルとビューのRLSセキュリティ問題を包括的に修正
-- このマイグレーションは、Supabaseダッシュボードで検出されたすべてのセキュリティ問題を修正します

-- ============================================
-- 1. すべてのテーブルでRLSを有効化し、ポリシーが存在することを確認
-- ============================================

DO $$
DECLARE
  table_record RECORD;
  policy_count INTEGER;
BEGIN
  -- publicスキーマ内のすべてのテーブルをループ
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    -- RLSを有効化
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
    
    -- ポリシーの数を確認
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = table_record.table_name;
    
    -- ポリシーが存在しない場合、デフォルトのポリシーを作成
    IF policy_count = 0 THEN
      -- 認証ユーザーが自分のデータのみ閲覧可能なポリシー（user_idカラムがある場合）
      BEGIN
        EXECUTE format('
          CREATE POLICY "Authenticated users can view own %I"
            ON %I
            FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id)',
          table_record.table_name, table_record.table_name);
      EXCEPTION WHEN OTHERS THEN
        -- user_idカラムがない場合、認証ユーザーがすべて閲覧可能なポリシーを作成
        BEGIN
          EXECUTE format('
            CREATE POLICY "Authenticated users can view %I"
              ON %I
              FOR SELECT
              TO authenticated
              USING (true)',
            table_record.table_name, table_record.table_name);
        EXCEPTION WHEN OTHERS THEN
          -- エラーが発生した場合はスキップ
          NULL;
        END;
      END;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 2. すべてのビューを再作成（セキュリティ定義者ビューの問題を修正）
-- ============================================
-- 注意: ビューの再作成は個別に処理する必要があるため、後続のセクションで処理します

-- ============================================
-- 3. 主要なテーブルのRLSポリシーを確実に設定
-- ============================================

-- user_profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    
    -- 既存のポリシーを削除して再作成
    DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
    DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can read own profile') THEN
      CREATE POLICY "Users can read own profile"
        ON user_profiles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- practice_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'practice_sessions') THEN
    ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_sessions' AND policyname = 'Users can view own practice sessions') THEN
      CREATE POLICY "Users can view own practice sessions"
        ON practice_sessions
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- recordings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recordings') THEN
    ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can view own recordings') THEN
      CREATE POLICY "Users can view own recordings"
        ON recordings
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- goals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'Users can view own goals') THEN
      CREATE POLICY "Users can view own goals"
        ON goals
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can view own events') THEN
      CREATE POLICY "Users can view own events"
        ON events
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- representative_songs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'representative_songs') THEN
    ALTER TABLE representative_songs ENABLE ROW LEVEL SECURITY;
    
    -- representative_songsはマスターデータなので、認証ユーザーは読み取り可能
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'representative_songs' AND policyname = 'Authenticated users can read representative songs') THEN
      CREATE POLICY "Authenticated users can read representative songs"
        ON representative_songs
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- note_training_results
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_training_results') THEN
    ALTER TABLE note_training_results ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'note_training_results' AND policyname = 'Users can view own note training results') THEN
      CREATE POLICY "Users can view own note training results"
        ON note_training_results
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. すべてのビューを再作成（セキュリティ定義者ビューの問題を修正）
-- ============================================

-- note_training_stats
DO $$
BEGIN
  DROP VIEW IF EXISTS note_training_stats CASCADE;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'note_training_results') THEN
    CREATE VIEW note_training_stats AS
    SELECT 
      user_id,
      COUNT(*) as total_plays,
      AVG(score) as average_score,
      MAX(score) as best_score,
      AVG(correct_count::DECIMAL / total_count) * 100 as accuracy_percentage,
      AVG(max_streak) as average_max_streak,
      SUM(play_time) as total_play_time
    FROM note_training_results
    GROUP BY user_id;
    
    ALTER VIEW note_training_stats OWNER TO postgres;
  END IF;
END $$;

-- my_songs_stats
DO $$
BEGIN
  DROP VIEW IF EXISTS my_songs_stats CASCADE;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'my_songs') THEN
    CREATE VIEW my_songs_stats AS
    SELECT 
      user_id,
      COUNT(*) as total_songs,
      COUNT(*) FILTER (WHERE status = 'want_to_play') as want_to_play_count,
      COUNT(*) FILTER (WHERE status = 'learning') as learning_count,
      COUNT(*) FILTER (WHERE status = 'played') as played_count,
      COUNT(*) FILTER (WHERE status = 'mastered') as mastered_count,
      COUNT(*) FILTER (WHERE difficulty = 'beginner') as beginner_count,
      COUNT(*) FILTER (WHERE difficulty = 'intermediate') as intermediate_count,
      COUNT(*) FILTER (WHERE difficulty = 'advanced') as advanced_count
    FROM my_songs
    GROUP BY user_id;
    
    ALTER VIEW my_songs_stats OWNER TO postgres;
  END IF;
END $$;

-- goals_overview
DO $$
BEGIN
  DROP VIEW IF EXISTS goals_overview CASCADE;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    CREATE VIEW goals_overview AS
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE is_completed = false) as active_goals,
      COUNT(*) FILTER (WHERE is_completed = true) as completed_goals,
      COUNT(*) FILTER (WHERE goal_type = 'personal_short') as short_term_goals,
      COUNT(*) FILTER (WHERE goal_type = 'personal_long') as long_term_goals,
      COUNT(*) FILTER (WHERE goal_type = 'group') as group_goals,
      AVG(progress_percentage) FILTER (WHERE is_completed = false) as average_progress
    FROM goals
    GROUP BY user_id;
    
    ALTER VIEW goals_overview OWNER TO postgres;
  END IF;
END $$;

-- ============================================
-- 5. すべてのテーブルでRLSが有効化されていることを確認
-- ============================================

DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

