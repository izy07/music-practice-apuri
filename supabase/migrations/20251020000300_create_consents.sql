-- 同意・オプトアウト記録テーブル
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text CHECK (type IN ('privacy_policy','terms','sale_opt_out','sharing_opt_out','targeted_ads_opt_out','analytics_opt_out','notifications_opt_in')) NOT NULL,
  version text NOT NULL,
  granted boolean NOT NULL,
  granted_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  source text, -- 'app','web','gpc' など
  ip_address text,
  user_agent text
);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consents' AND policyname = 'Users select own consents'
  ) THEN
    CREATE POLICY "Users select own consents" ON consents FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consents' AND policyname = 'Users insert own consents'
  ) THEN
    CREATE POLICY "Users insert own consents" ON consents FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consents' AND policyname = 'Users update own consents'
  ) THEN
    CREATE POLICY "Users update own consents" ON consents FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_consents_user_id ON consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_type ON consents(type);
CREATE INDEX IF NOT EXISTS idx_consents_granted ON consents(granted);

