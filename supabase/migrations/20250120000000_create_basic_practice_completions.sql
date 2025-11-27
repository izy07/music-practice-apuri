-- 基礎練完了状態を保存するテーブル
CREATE TABLE IF NOT EXISTS basic_practice_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument_id uuid REFERENCES instruments(id),
  practice_date date NOT NULL,
  menu_id text, -- 基礎練メニューのID（オプション）
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, practice_date, instrument_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_basic_practice_completions_user_id ON basic_practice_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_basic_practice_completions_practice_date ON basic_practice_completions(practice_date);
CREATE INDEX IF NOT EXISTS idx_basic_practice_completions_user_date ON basic_practice_completions(user_id, practice_date DESC);

-- RLSを有効化
ALTER TABLE basic_practice_completions ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
DO $$
BEGIN
  -- ユーザーは自分のデータのみ閲覧可能
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'basic_practice_completions' 
    AND policyname = 'Users can view their own basic practice completions'
  ) THEN
    CREATE POLICY "Users can view their own basic practice completions"
      ON basic_practice_completions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分のデータのみ挿入可能
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'basic_practice_completions' 
    AND policyname = 'Users can insert their own basic practice completions'
  ) THEN
    CREATE POLICY "Users can insert their own basic practice completions"
      ON basic_practice_completions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分のデータのみ更新可能
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'basic_practice_completions' 
    AND policyname = 'Users can update their own basic practice completions'
  ) THEN
    CREATE POLICY "Users can update their own basic practice completions"
      ON basic_practice_completions
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- ユーザーは自分のデータのみ削除可能
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'basic_practice_completions' 
    AND policyname = 'Users can delete their own basic practice completions'
  ) THEN
    CREATE POLICY "Users can delete their own basic practice completions"
      ON basic_practice_completions
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

