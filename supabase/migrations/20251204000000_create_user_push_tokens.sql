-- プッシュ通知トークンテーブルの作成
-- ネイティブアプリ（iOS/Android）のプッシュ通知トークンを保存

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 1ユーザー1プラットフォーム1トークン（同じデバイスで複数トークンを持たない）
  UNIQUE(user_id, platform, device_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_push_token ON user_push_tokens(push_token);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_platform ON user_push_tokens(platform);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION trg_set_updated_at_user_push_tokens()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_user_push_tokens ON user_push_tokens;
CREATE TRIGGER set_updated_at_user_push_tokens
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_updated_at_user_push_tokens();

-- RLSの有効化
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
-- ユーザーは自分のプッシュトークンのみ閲覧・更新・削除可能
CREATE POLICY "Users can view own push tokens" ON user_push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens" ON user_push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens" ON user_push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens" ON user_push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE user_push_tokens IS 'ユーザーのプッシュ通知トークンを保存するテーブル';
COMMENT ON COLUMN user_push_tokens.push_token IS 'Expo Push Token（ExponentPushToken[...]形式）';
COMMENT ON COLUMN user_push_tokens.platform IS 'プラットフォーム（ios または android）';
COMMENT ON COLUMN user_push_tokens.device_id IS 'デバイスID（オプション）';




