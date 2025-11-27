# GitHub Actions データベース設定ガイド

## 📋 概要

このプロジェクトでは、GitHub ActionsでSupabaseデータベースを使用したテストとマイグレーション検証を実行できます。

## 🗂️ ワークフロー一覧

### 1. `test-with-db.yml` - データベース付きテスト

**用途**: データベースを使用する統合テストの実行

**トリガー**:
- `main` または `develop` ブランチへのpush
- Pull Request
- 手動実行（workflow_dispatch）

**実行内容**:
1. PostgreSQL 17コンテナの起動
2. Supabase CLIのインストール
3. Supabaseローカル環境の起動
4. データベースマイグレーションの実行
5. テストの実行
6. 結果のアップロード

### 2. `database-migration.yml` - マイグレーション検証

**用途**: マイグレーションファイルの検証とテスト

**トリガー**:
- `supabase/migrations/**` への変更
- 手動実行

**実行内容**:
1. マイグレーションファイルの検証
2. マイグレーションの実行
3. データベーススキーマの確認
4. 外部キー制約の確認

### 3. `ci.yml` (更新) - CIパイプライン

**変更点**:
- 単体テスト（データベースなし）と統合テスト（データベースあり）を分離
- データベース統合テストジョブを追加

## 🔧 ローカルでの実行

### 前提条件

```bash
# Docker Desktopが起動していること
# Supabase CLIがインストールされていること
npm install -g supabase
```

### セットアップスクリプトの実行

```bash
bash scripts/setup-github-db.sh
```

このスクリプトは以下を実行します：
1. Supabase CLIのインストール確認
2. Supabaseローカル環境の起動
3. データベースマイグレーションの実行
4. instrumentsテーブルの確認

### 手動セットアップ

```bash
# Supabaseローカル環境の起動
supabase start

# データベースマイグレーションの実行
supabase db reset

# 状態確認
supabase status
```

## 🌐 環境変数

GitHub Actionsで使用される環境変数：

```yaml
EXPO_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
NODE_ENV: test
```

**注意**: これらの値はSupabaseローカル環境用のデフォルト値です。本番環境では使用しません。

## 📊 データベース構成

### 使用技術

- **PostgreSQL**: 17
- **Supabase**: ローカル開発環境
- **Docker**: GitHub Actionsでのコンテナ実行

### 主要テーブル

- `instruments` - 楽器マスターデータ
- `user_profiles` - ユーザープロフィール
- `practice_records` - 練習記録
- `events` - イベント
- `organizations` - 組織

## 🔍 トラブルシューティング

### GitHub Actionsでデータベースが起動しない

1. **Dockerサービスの確認**
   ```yaml
   services:
     postgres:
       image: postgres:17
       # ヘルスチェックが正しく設定されているか確認
   ```

2. **Supabase CLIのバージョン確認**
   ```bash
   supabase --version
   ```

### マイグレーションが失敗する

1. **マイグレーションファイルの順序確認**
   - ファイル名が時系列順になっているか
   - 依存関係が正しいか

2. **SQL構文エラーの確認**
   ```bash
   supabase db diff
   ```

### テストがタイムアウトする

1. **タイムアウト時間の延長**
   ```yaml
   timeout-minutes: 30
   ```

2. **並列実行数の調整**
   ```yaml
   maxWorkers: 2
   ```

## 📝 ベストプラクティス

1. **マイグレーションファイルの命名**
   - 形式: `YYYYMMDDHHMMSS_description.sql`
   - 例: `20251127000002_ensure_instruments_table_complete.sql`

2. **テストデータの管理**
   - 開発環境専用のシードデータは `seed_users_dev.sql` に分離
   - 本番環境には含めない

3. **環境変数の管理**
   - 機密情報はGitHub Secretsに保存
   - ローカル開発用の値は `.env.local` に保存

## 🔐 セキュリティ

- ✅ テスト用の認証情報はローカル環境のみで使用
- ✅ 本番環境の認証情報はGitHub Secretsで管理
- ✅ マイグレーションファイルにテストデータを含めない

## 📚 参考リンク

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)

