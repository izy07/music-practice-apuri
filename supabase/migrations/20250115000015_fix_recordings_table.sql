-- recordingsテーブルの修正
-- 1. file_pathカラムのNOT NULL制約を削除
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recordings') THEN
    ALTER TABLE recordings ALTER COLUMN file_path DROP NOT NULL;
    -- 2. duration_secondsカラムのNOT NULL制約を削除
    ALTER TABLE recordings ALTER COLUMN duration_seconds DROP NOT NULL;
    -- 3. 既存のrecordingsテーブルに不足しているカラムを追加
    ALTER TABLE recordings ADD COLUMN IF NOT EXISTS song_id uuid REFERENCES my_songs(id) ON DELETE SET NULL;
    ALTER TABLE recordings ADD COLUMN IF NOT EXISTS media_source text CHECK (media_source IN ('uploaded','url')) DEFAULT 'uploaded';
    ALTER TABLE recordings ADD COLUMN IF NOT EXISTS video_url text;
    ALTER TABLE recordings ADD COLUMN IF NOT EXISTS thumbnail_url text;
    ALTER TABLE recordings ADD COLUMN IF NOT EXISTS played_at timestamptz;
  END IF;
END$$;

-- 4. インデックスの作成（存在しない場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recordings') THEN
    CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
    CREATE INDEX IF NOT EXISTS idx_recordings_song_id ON recordings(song_id);
    CREATE INDEX IF NOT EXISTS idx_recordings_recorded_at ON recordings(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_recordings_played_at ON recordings(played_at);
  END IF;
END$$;

-- 5. RLSポリシーの確認と作成
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recordings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can view own recordings'
    ) THEN
      CREATE POLICY "Users can view own recordings" ON recordings
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can insert own recordings'
    ) THEN
      CREATE POLICY "Users can insert own recordings" ON recordings
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can update own recordings'
    ) THEN
      CREATE POLICY "Users can update own recordings" ON recordings
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordings' AND policyname = 'Users can delete own recordings'
    ) THEN
      CREATE POLICY "Users can delete own recordings" ON recordings
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END IF;
END$$;
