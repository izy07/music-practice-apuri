-- 録音/動画ライブラリ拡張: recordings テーブルに楽譜連携と動画URL対応の列を追加
-- 既存の recordings テーブルが無い場合は前のマイグレーションで作成されます

-- 列追加（存在しない場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recordings') THEN
    ALTER TABLE recordings
      ADD COLUMN IF NOT EXISTS song_id uuid REFERENCES my_songs(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS media_source text CHECK (media_source IN ('uploaded','url')) DEFAULT 'uploaded',
      ADD COLUMN IF NOT EXISTS video_url text,
      ADD COLUMN IF NOT EXISTS thumbnail_url text,
      ADD COLUMN IF NOT EXISTS played_at timestamptz;
  END IF;
END$$;

-- 既存列の補足: title, memo, file_path, duration_seconds, is_favorite, recorded_at は既に存在

-- インデックス（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recordings') THEN
    CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
    CREATE INDEX IF NOT EXISTS idx_recordings_song_id ON recordings(song_id);
    CREATE INDEX IF NOT EXISTS idx_recordings_recorded_at ON recordings(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_recordings_played_at ON recordings(played_at);
  END IF;
END$$;

-- RLS は作成済みの前提（ユーザー自身のみアクセス）。必要に応じて追加
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


