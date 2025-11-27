-- 購読テーブルとRLS設定
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    CREATE TABLE public.user_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      plan text NOT NULL CHECK (plan IN ('free','premium_monthly','premium_yearly')) DEFAULT 'free',
      is_active boolean NOT NULL DEFAULT false,
      trial_started_at timestamptz,
      trial_ends_at timestamptz,
      current_period_end timestamptz,
      canceled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id)
    );
  END IF;
END$$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON public.user_subscriptions(is_active);

-- RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_subscriptions' AND policyname='Users can view own subscription'
  ) THEN
    CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_subscriptions' AND policyname='Users can upsert own subscription'
  ) THEN
    CREATE POLICY "Users can upsert own subscription" ON public.user_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_subscriptions' AND policyname='Users can update own subscription'
  ) THEN
    CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- トリガー: updated_at自動更新
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_user_subscriptions'
  ) THEN
    CREATE TRIGGER set_timestamp_user_subscriptions
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
  END IF;
END$$;


