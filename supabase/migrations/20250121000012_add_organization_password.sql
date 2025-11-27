-- 組織テーブルにパスワードフィールドを追加
-- 組織参加時の認証用

-- 組織テーブルにパスワードフィールドを追加
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS password VARCHAR(8);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 既存の組織にランダムパスワードを生成
UPDATE organizations 
SET password = LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0')
WHERE password IS NULL;

-- パスワードのハッシュ化（既存のパスワードをハッシュ化）
-- 注意: 本番環境では適切なハッシュ化ライブラリを使用してください
UPDATE organizations 
SET password_hash = ENCODE(DIGEST(password, 'sha256'), 'hex')
WHERE password_hash IS NULL;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_organizations_password ON organizations(password);
