-- 機能利用ログ（機能削減検討・サービス改善用）
CREATE TABLE IF NOT EXISTS public.feature_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('screen_view', 'action')),
  feature_id text NOT NULL,
  event_name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web', 'ios', 'android', 'unknown')),
  instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_events_user_created
  ON public.feature_usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_usage_events_feature_created
  ON public.feature_usage_events (feature_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_usage_events_event_name_created
  ON public.feature_usage_events (event_name, created_at DESC);

ALTER TABLE public.feature_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feature usage events" ON public.feature_usage_events;
CREATE POLICY "Users insert own feature usage events"
  ON public.feature_usage_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own feature usage events" ON public.feature_usage_events;
CREATE POLICY "Users read own feature usage events"
  ON public.feature_usage_events
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.feature_usage_events IS 'アプリ機能の利用状況ログ（画面表示・主要操作）';
