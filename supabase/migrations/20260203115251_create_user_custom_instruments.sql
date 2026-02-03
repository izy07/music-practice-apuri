-- ユーザーカスタム楽器テーブルの作成
-- その他で新たに楽器を登録した場合、その他とは別に新たな欄を作成して管理

-- user_custom_instrumentsテーブルの作成
CREATE TABLE IF NOT EXISTS public.user_custom_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument_name text NOT NULL,
  instrument_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, instrument_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_user_custom_instruments_user_id ON public.user_custom_instruments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_instruments_instrument_id ON public.user_custom_instruments(instrument_id);

-- RLSの有効化
ALTER TABLE public.user_custom_instruments ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Users can view own custom instruments" ON public.user_custom_instruments;
CREATE POLICY "Users can view own custom instruments" ON public.user_custom_instruments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own custom instruments" ON public.user_custom_instruments;
CREATE POLICY "Users can insert own custom instruments" ON public.user_custom_instruments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own custom instruments" ON public.user_custom_instruments;
CREATE POLICY "Users can update own custom instruments" ON public.user_custom_instruments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own custom instruments" ON public.user_custom_instruments;
CREATE POLICY "Users can delete own custom instruments" ON public.user_custom_instruments
  FOR DELETE USING (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE public.user_custom_instruments IS 'ユーザーが「その他」で登録したカスタム楽器を管理するテーブル';
COMMENT ON COLUMN public.user_custom_instruments.instrument_name IS 'カスタム楽器名（例: ウクレレ、マンドリンなど）';
COMMENT ON COLUMN public.user_custom_instruments.instrument_id IS 'カスタム楽器の一意ID（instrumentsテーブルとは別）';
