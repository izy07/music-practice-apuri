-- feature_usage_events: RLS 有効なのにポリシーが無く INSERT が 403 になっていた問題を修正
ALTER TABLE public.feature_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feature usage events" ON public.feature_usage_events;
CREATE POLICY "Users insert own feature usage events"
  ON public.feature_usage_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own feature usage events" ON public.feature_usage_events;
CREATE POLICY "Users read own feature usage events"
  ON public.feature_usage_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.feature_usage_events FROM anon;
GRANT SELECT, INSERT ON TABLE public.feature_usage_events TO authenticated;
GRANT ALL ON TABLE public.feature_usage_events TO service_role;
