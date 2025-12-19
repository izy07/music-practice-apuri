-- representative_songs に名演奏情報のカラムを追加（存在しない場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'representative_songs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'representative_songs' AND column_name = 'famous_performer'
    ) THEN
      ALTER TABLE representative_songs ADD COLUMN famous_performer TEXT;
      COMMENT ON COLUMN representative_songs.famous_performer IS '名演奏の演奏者名（例: HIMARI）';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'representative_songs' AND column_name = 'famous_video_url'
    ) THEN
      ALTER TABLE representative_songs ADD COLUMN famous_video_url TEXT;
      COMMENT ON COLUMN representative_songs.famous_video_url IS '名演奏の動画URL（YouTube等）';
    END IF;
  END IF;
END $$;

