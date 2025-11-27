# データベースシードデータ管理

## ⚠️ 重要: 環境別データ管理

### 開発環境専用ファイル
- `seed_users_dev.sql` - **開発環境のみ**で使用
  - テストユーザー: test@example.com
  - パスワード: testpassword123
  - **本番環境では絶対に使用しないでください**

### 全環境共通ファイル
- `seed_instruments.sql` - 全環境で使用可能
  - 楽器マスターデータ
  - 本番環境でも安全

## 使用方法

### 開発環境のセットアップ
```bash
# Supabaseを起動
npx supabase start

# 楽器データを挿入
npx supabase db reset

# テストユーザーを追加（開発環境のみ）
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres < supabase/seed_users_dev.sql
```

### 本番環境のセットアップ
```bash
# 楽器データのみを挿入
# マイグレーションに含まれているため、自動的に実行されます

# ユーザーは各自サインアップで作成
# seed_users_dev.sql は使用しない
```

## セキュリティチェックリスト

- [ ] seed_users_dev.sql が本番環境のマイグレーションに含まれていないか確認
- [ ] .gitignore に seed_users_dev.sql が追加されているか確認
- [ ] 本番環境の環境変数が正しく設定されているか確認
- [ ] テスト用アカウントが本番DBに存在しないか確認

## トラブルシューティング

### 開発環境でテストユーザーでログインできない
```bash
# データベースをリセット
npx supabase db reset

# テストユーザーを再度追加
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres < supabase/seed_users_dev.sql
```

### 本番環境にテストデータが入ってしまった
```sql
-- テストユーザーを削除
DELETE FROM auth.users WHERE email = 'test@example.com';
```

