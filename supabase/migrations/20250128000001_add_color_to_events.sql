-- ============================================
-- eventsテーブルにcolorカラムを追加
-- ============================================
-- 日付: 2025-01-28
-- 目的: イベントの色を設定できるようにする（演奏会、メンテナンスなど）

-- colorカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'color'
  ) THEN
    ALTER TABLE public.events 
    ADD COLUMN color text;
    
    COMMENT ON COLUMN public.events.color IS 'イベントの色（red: 演奏会, green: メンテナンス, blue: レッスン, orange: リハーサル, purple: その他, yellow: イベント）';
    
    -- 既存のイベントにはデフォルト値（yellow）を設定
    UPDATE public.events 
    SET color = 'yellow'
    WHERE color IS NULL;
  END IF;
END $$;

-- インデックスは不要（色での検索は頻繁ではないため）

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ eventsテーブルにcolorカラムを追加しました';
END $$;

