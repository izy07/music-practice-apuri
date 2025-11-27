-- フィードバック保存テーブルの作成

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('general','bug','feature','improvement')) DEFAULT 'general',
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  contact_email text,
  diagnostics text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- RLS を有効化
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 認証ユーザーは自分の行を参照可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'Users can read own feedback'
  ) THEN
    CREATE POLICY "Users can read own feedback"
      ON feedback FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedback' AND policyname = 'Users can insert feedback'
  ) THEN
    CREATE POLICY "Users can insert feedback"
      ON feedback FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END$$;


