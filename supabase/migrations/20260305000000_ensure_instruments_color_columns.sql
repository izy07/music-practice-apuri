-- instruments に color_background, color_surface を追加（他楽器と同じスキーマにする）
-- 既に initial_schema で持っている環境ではスキップされる
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'instruments'
      AND column_name = 'color_background'
  ) THEN
    ALTER TABLE public.instruments
    ADD COLUMN color_background text NOT NULL DEFAULT '#FFFFFF';
    COMMENT ON COLUMN public.instruments.color_background IS '背景色';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'instruments'
      AND column_name = 'color_surface'
  ) THEN
    ALTER TABLE public.instruments
    ADD COLUMN color_surface text NOT NULL DEFAULT '#FFFFFF';
    COMMENT ON COLUMN public.instruments.color_surface IS '表面色';
  END IF;
END $$;
