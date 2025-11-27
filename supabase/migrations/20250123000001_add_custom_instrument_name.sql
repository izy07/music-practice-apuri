-- カスタム楽器名カラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS custom_instrument_name TEXT;

-- コメントを追加
COMMENT ON COLUMN user_profiles.custom_instrument_name IS 'その他楽器選択時のカスタム楽器名';
