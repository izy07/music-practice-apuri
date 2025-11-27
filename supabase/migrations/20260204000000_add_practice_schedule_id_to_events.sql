-- eventsテーブルにpractice_schedule_idカラムを追加
-- 練習日程（practice_schedules）とイベント（events）の連携を管理するため

-- practice_schedule_idカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'practice_schedule_id'
  ) THEN
    ALTER TABLE events 
    ADD COLUMN practice_schedule_id UUID REFERENCES practice_schedules(id) ON DELETE CASCADE;
    
    -- インデックスを作成
    CREATE INDEX IF NOT EXISTS idx_events_practice_schedule_id ON events(practice_schedule_id);
    
    -- コメントを追加
    COMMENT ON COLUMN events.practice_schedule_id IS '関連する練習日程のID（practice_type=eventの場合）';
  END IF;
END $$;

