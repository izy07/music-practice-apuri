-- 録音種類フィールドを追加
-- recording_type: 'performance' (演奏録音) または 'lesson' (レッスン録音)

DO $$
BEGIN
  -- recordingsテーブルにrecording_typeカラムを追加（存在しない場合のみ）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recordings') THEN
    -- カラムが存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'recordings' AND column_name = 'recording_type'
    ) THEN
      ALTER TABLE recordings
        ADD COLUMN recording_type text CHECK (recording_type IN ('performance', 'lesson')) DEFAULT 'performance';
      
      -- インデックスを追加
      CREATE INDEX IF NOT EXISTS idx_recordings_recording_type ON recordings(recording_type);
      
      -- 既存のレコードにはデフォルト値（'performance'）が設定される
    END IF;
  END IF;
END$$;

