-- 録音種類フィールドを確実に追加（既存のマイグレーションが失敗した場合のフォールバック）
-- recording_type: 'performance' (演奏録音) または 'lesson' (レッスン録音)

-- テーブルが存在する場合のみ実行
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recordings') THEN
    -- カラムが存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'recordings' AND column_name = 'recording_type'
    ) THEN
      -- カラムを追加
      ALTER TABLE recordings
        ADD COLUMN recording_type text DEFAULT 'performance';
      
      -- CHECK制約を追加
      ALTER TABLE recordings
        ADD CONSTRAINT recordings_recording_type_check 
        CHECK (recording_type IN ('performance', 'lesson'));
      
      -- 既存のレコードにデフォルト値を設定
      UPDATE recordings
        SET recording_type = 'performance'
        WHERE recording_type IS NULL;
      
      -- NOT NULL制約を追加（デフォルト値があるので安全）
      ALTER TABLE recordings
        ALTER COLUMN recording_type SET NOT NULL;
      
      -- インデックスを追加
      CREATE INDEX IF NOT EXISTS idx_recordings_recording_type ON recordings(recording_type);
      
      RAISE NOTICE 'recording_typeカラムを追加しました';
    ELSE
      RAISE NOTICE 'recording_typeカラムは既に存在します';
    END IF;
  ELSE
    RAISE NOTICE 'recordingsテーブルが存在しません';
  END IF;
END$$;

