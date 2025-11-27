-- 組織テーブルに招待コードとセキュリティ強化カラムを追加

-- 招待コード関連のカラムを追加
ALTER TABLE organizations
ADD COLUMN invite_code VARCHAR(6),
ADD COLUMN invite_code_hash TEXT,
ADD COLUMN invite_code_expires_at TIMESTAMPTZ;

-- 招待コードにインデックスを追加（検索性能向上）
CREATE INDEX idx_organizations_invite_code ON organizations(invite_code);

-- 招待コードの有効期限にインデックスを追加
CREATE INDEX idx_organizations_invite_expires ON organizations(invite_code_expires_at);

-- 既存のパスワードをハッシュ化（既存データの移行）
-- 注意: 本番環境では既存のパスワードを適切にハッシュ化する必要があります
UPDATE organizations 
SET password_hash = encode(digest(password || 'legacy_salt', 'sha256'), 'hex')
WHERE password_hash IS NULL AND password IS NOT NULL;

-- 既存の組織に招待コードを生成
UPDATE organizations 
SET 
  invite_code = upper(substring(md5(random()::text) from 1 for 6)),
  invite_code_hash = encode(digest(upper(substring(md5(random()::text) from 1 for 6)) || 'invite_salt', 'sha256'), 'hex'),
  invite_code_expires_at = NOW() + INTERVAL '30 days'
WHERE invite_code IS NULL;

-- 招待コードの制約を追加
ALTER TABLE organizations
ADD CONSTRAINT chk_invite_code_format CHECK (invite_code ~ '^[A-Z0-9]{6}$');

-- 招待コードの有効期限制約
ALTER TABLE organizations
ADD CONSTRAINT chk_invite_code_expires CHECK (invite_code_expires_at > created_at);

-- RLSポリシーを更新（招待コード検索を許可）
CREATE POLICY "招待コードで組織検索可能" ON organizations
  FOR SELECT USING (
    invite_code IS NOT NULL AND 
    invite_code_expires_at > NOW()
  );

-- 組織作成時のRLSポリシーを更新
DROP POLICY IF EXISTS "管理者のみ組織を作成可能" ON organizations;
DROP POLICY IF EXISTS "認証されたユーザーは組織を作成可能" ON organizations;
CREATE POLICY "認証されたユーザーは組織を作成可能" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);
