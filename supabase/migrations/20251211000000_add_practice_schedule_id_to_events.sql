-- eventsテーブルにpractice_schedule_idカラムを追加
-- 練習日程（practice_schedules）とイベント（events）の連携を管理するため
-- リハーサルやイベントタイプの練習日程をメインカレンダーに表示するために必要

-- practice_schedule_idカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  -- eventsテーブルが存在することを確認
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    -- practice_schedule_idカラムが存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'events' 
        AND column_name = 'practice_schedule_id'
    ) THEN
      -- カラムを追加
      ALTER TABLE events 
      ADD COLUMN practice_schedule_id UUID;
      
      -- practice_schedulesテーブルが存在する場合、外部キー制約を追加
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'practice_schedules'
      ) THEN
        -- 既存の制約を削除（存在する場合）
        ALTER TABLE events
        DROP CONSTRAINT IF EXISTS events_practice_schedule_id_fkey;
        
        -- 外部キー制約を追加
        ALTER TABLE events
        ADD CONSTRAINT events_practice_schedule_id_fkey 
        FOREIGN KEY (practice_schedule_id) 
        REFERENCES practice_schedules(id) 
        ON DELETE CASCADE;
      END IF;
      
      -- インデックスを作成
      CREATE INDEX IF NOT EXISTS idx_events_practice_schedule_id ON events(practice_schedule_id);
      
      -- コメントを追加
      COMMENT ON COLUMN events.practice_schedule_id IS '関連する練習日程のID（practice_type=eventまたはrehearsalの場合）';
      
      RAISE NOTICE '✅ eventsテーブルにpractice_schedule_idカラムを追加しました';
    ELSE
      RAISE NOTICE 'ℹ️ eventsテーブルのpractice_schedule_idカラムは既に存在します';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ eventsテーブルが存在しません。先にeventsテーブルを作成してください。';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ エラーが発生しました: %', SQLERRM;
END $$;

