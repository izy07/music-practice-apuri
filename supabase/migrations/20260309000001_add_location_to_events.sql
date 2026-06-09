-- eventsテーブルに location / color / instrument_id を追加（既存DB向け）
-- 初期スキーマ(20251219)以前のDBでは location が欠けている場合がある

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'location'
  ) THEN
    ALTER TABLE public.events ADD COLUMN location text;
    COMMENT ON COLUMN public.events.location IS 'イベントの場所（例：ホール名、会場名など）';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'color'
  ) THEN
    ALTER TABLE public.events ADD COLUMN color text;
    COMMENT ON COLUMN public.events.color IS 'イベントの色（red, green, blue, orange, purple）';
    UPDATE public.events SET color = 'blue' WHERE color IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.events
      ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.events.instrument_id IS '楽器ID（楽器ごとにイベントを分けて管理）';
    CREATE INDEX IF NOT EXISTS idx_events_instrument_id ON public.events(instrument_id);
  END IF;
END $$;
