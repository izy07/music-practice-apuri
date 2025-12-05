# パスワードセキュリティ - ハッシュ化の仕組み

## ✅ はい、パスワードはハッシュ化されています

このプロジェクトでは、**Supabaseの認証システム**を使用しており、パスワードは**自動的にbcryptでハッシュ化**されて保存されます。

---

## 🔐 パスワードハッシュ化の流れ

### 1. 新規登録時（signUp）

```typescript
// hooks/useAuthAdvanced.ts
const { data, error } = await supabase.auth.signUp({
  email: formData.email.trim().toLowerCase(),
  password: formData.password,  // ← 平文で送信
  options: {
    data: {
      name: formData.name || formData.email.split('@')[0],
    }
  }
});
```

**処理の流れ:**
1. クライアント（ブラウザ）から平文のパスワードを送信
2. Supabaseサーバーがパスワードを受信
3. **Supabaseサーバー側でbcryptを使用してハッシュ化**
4. ハッシュ化されたパスワードのみがデータベースに保存される
5. 平文のパスワードは**決してデータベースに保存されない**

### 2. ログイン時（signIn）

```typescript
// hooks/useAuthAdvanced.ts
const { data, error } = await supabase.auth.signInWithPassword({
  email: formData.email.trim().toLowerCase(),
  password: formData.password,  // ← 平文で送信
});
```

**処理の流れ:**
1. クライアントから平文のパスワードを送信
2. Supabaseサーバーがデータベースからハッシュ化されたパスワードを取得
3. 入力されたパスワードをハッシュ化して比較
4. 一致すればログイン成功

---

## 🛡️ Supabaseのハッシュ化方式

### bcrypt（Blowfish）

Supabaseは内部的に**bcrypt**を使用してパスワードをハッシュ化しています。

**bcryptの特徴:**
- **適応的ハッシュ**: 計算コストを調整可能（時間がかかるほど安全）
- **ソルト自動生成**: 同じパスワードでも異なるハッシュが生成される
- **レインボーテーブル攻撃に強い**: 事前計算されたハッシュテーブルが役に立たない

**例（seed_users.sql）:**
```sql
-- bcryptでハッシュ化（'bf' = blowfish = bcrypt）
crypt('testpassword123', gen_salt('bf'))
```

### データベースでの保存形式

```sql
-- auth.usersテーブル
encrypted_password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
-- ↑ bcryptハッシュ（$2a$ = bcryptバージョン2a）
```

**ハッシュの構造:**
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
│  │  │  │                                    │
│  │  │  │                                    └─ ハッシュ（31文字）
│  │  │  └─ ソルト（22文字）
│  │  └─ コストファクター（10 = 2^10 = 1024回の反復）
│  └─ バージョン（2a = bcrypt）
└─ アルゴリズム識別子
```

---

## 🔒 セキュリティの保証

### ✅ 実装されているセキュリティ対策

1. **ハッシュ化**: パスワードはbcryptでハッシュ化
2. **ソルト**: 各パスワードにランダムなソルトが付与される
3. **HTTPS**: 通信は暗号化されている（平文パスワードも安全に送信）
4. **RLS**: Row Level Securityでデータベースアクセスを制限
5. **レート制限**: ログイン試行回数を制限（ブルートフォース攻撃対策）

### ⚠️ 注意点

1. **クライアント側では平文**: 
   - ブラウザからサーバーに送信される時点では平文
   - ただしHTTPSで暗号化されているため安全

2. **サーバー側でハッシュ化**:
   - Supabaseサーバーが自動的にハッシュ化
   - 開発者が手動でハッシュ化する必要はない

3. **データベースにはハッシュのみ**:
   - 平文のパスワードは**決して**データベースに保存されない
   - データベースが漏洩しても、パスワードは復元できない

---

## 📊 プロジェクト内のパスワード関連コード

### 1. Supabase認証（ユーザーパスワード）

**使用箇所:**
- `hooks/useAuthAdvanced.ts`: `signUp()`, `signIn()`
- `lib/authService.ts`: `signUp()`, `signIn()`
- `lib/signUpNew.ts`: 新規登録処理

**ハッシュ化:** Supabaseが自動的にbcryptでハッシュ化

### 2. 独自のハッシュ化モジュール

**ファイル:** `lib/security/passwordHasher.ts`

```typescript
// PBKDF2を使用したハッシュ化
// 注意: 現在はSupabase認証では使用されていない
export async function hashPassword(password: string): Promise<string> {
  // PBKDF2でハッシュ化（100,000回の反復）
  // SHA-256アルゴリズム
}
```

**用途:** 
- 現在はSupabase認証では使用されていない
- 将来的に組織パスワードなどで使用する可能性

### 3. 組織パスワード（非推奨）

**ファイル:** `supabase/migrations/20250121000012_add_organization_password.sql`

```sql
-- ⚠️ 注意: SHA-256はパスワードハッシュ化には不適切
UPDATE organizations 
SET password_hash = ENCODE(DIGEST(password, 'sha256'), 'hex')
WHERE password_hash IS NULL;
```

**問題点:**
- SHA-256は高速すぎる（ブルートフォース攻撃に弱い）
- ソルトがない（レインボーテーブル攻撃に弱い）
- **推奨**: bcryptまたはArgon2に変更すべき

---

## 🎯 ベストプラクティス

### ✅ 推奨される実装

1. **Supabase認証を使用**（現在の実装）
   - bcryptで自動ハッシュ化
   - セキュリティが保証されている

2. **独自実装が必要な場合**
   - bcryptまたはArgon2を使用
   - ソルトを必ず使用
   - 適切なコストファクターを設定

### ❌ 避けるべき実装

1. **平文での保存**: 絶対にNG
2. **MD5/SHA-1/SHA-256**: 高速すぎて危険
3. **固定ソルト**: レインボーテーブル攻撃に弱い
4. **クライアント側でのハッシュ化**: サーバー側で必ずハッシュ化

---

## 🔍 確認方法

### データベースで確認

```sql
-- パスワードがハッシュ化されていることを確認
SELECT 
  id,
  email,
  encrypted_password,  -- ← bcryptハッシュ（平文ではない）
  created_at
FROM auth.users
LIMIT 5;

-- ハッシュの形式を確認
-- $2a$ で始まればbcrypt
SELECT 
  email,
  LEFT(encrypted_password, 7) as hash_type
FROM auth.users
WHERE encrypted_password IS NOT NULL;
```

### コードで確認

```typescript
// ✅ 正しい実装: Supabaseが自動的にハッシュ化
await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'plaintext-password'  // ← サーバー側でハッシュ化される
});

// ❌ 間違った実装: クライアント側でハッシュ化してはいけない
const hashed = await hashPassword('plaintext-password');
await supabase.auth.signUp({
  email: 'user@example.com',
  password: hashed  // ← これは二重ハッシュ化になってしまう
});
```

---

## 📚 参考資料

1. **Supabase認証ドキュメント**: 
   - https://supabase.com/docs/guides/auth

2. **bcryptについて**:
   - https://en.wikipedia.org/wiki/Bcrypt

3. **OWASP パスワードストレージ**:
   - https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

---

## まとめ

✅ **パスワードは安全にハッシュ化されています**

- Supabaseが自動的にbcryptでハッシュ化
- データベースにはハッシュのみが保存される
- 平文のパスワードは決して保存されない
- HTTPSで通信が暗号化されている

**開発者がするべきこと:**
- Supabaseの認証APIを正しく使用する
- パスワードを手動でハッシュ化しない
- HTTPSを使用する（Supabaseが自動的に処理）

**開発者がしてはいけないこと:**
- パスワードをログに出力する
- パスワードをクライアント側でハッシュ化する
- パスワードを平文でデータベースに保存する

