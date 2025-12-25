# マイグレーションファイル検証ツール

## 概要

マイグレーションファイルの整合性をチェックし、将来のエラーを防ぐためのツールです。

## 使用方法

### 1. マイグレーションファイルの整合性チェック

```bash
bash scripts/validate-migrations.sh
```

このスクリプトは以下をチェックします：
- ✅ 統合マイグレーションファイル（`20251219000000_initial_schema.sql`）の存在確認
- ✅ 不要なマイグレーションファイルの検出（統合マイグレーション以外）
- ✅ `.skip`ファイルの検出
- ✅ 古いマイグレーションファイル名への参照の検出
- ✅ 統合マイグレーションファイルの必須要素の確認

### 2. コミット前のチェック（推奨）

Gitフックとして設定することで、コミット前に自動的にチェックできます：

```bash
# .git/hooks/pre-commitにシンボリックリンクを作成
ln -s ../../scripts/pre-commit-migration-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 3. GitHub Actionsでの自動チェック

プルリクエストまたはマイグレーションファイルが変更された際に、自動的にチェックが実行されます。

## チェック内容

### 必須要素チェック

統合マイグレーションファイルに以下の要素が含まれていることを確認します：
- `instruments`テーブル
- `user_profiles`テーブル
- `representative_songs`テーブル
- `get_total_practice_time`関数
- `instrument_specific_data`カラム

### 古いマイグレーションファイル名の検出

以下のような古いマイグレーションファイル名への参照を検出します：
- `20250101000000_ensure_representative_songs_table_final`
- `20250122000001_ensure_representative_songs_table`
- `20260227000000_create_get_total_practice_time_function`
- その他の統合済みマイグレーションファイル名

## トラブルシューティング

### エラー: 古いマイグレーションファイル名への参照が見つかりました

古いマイグレーションファイル名への参照をすべて、統合マイグレーションファイル（`20251219000000_initial_schema.sql`）への参照に更新してください。

例：
```typescript
// ❌ 悪い例
// custom_instrument_nameカラムはマイグレーション（20250123000001_add_custom_instrument_name.sql）で追加される必要があります

// ✅ 良い例
// 注意: custom_instrument_nameカラムは現在のスキーマに含まれていません
```

### エラー: 統合マイグレーションファイル以外のマイグレーションファイルが見つかりました

新しいマイグレーションファイルを作成するのではなく、統合マイグレーションファイル（`20251219000000_initial_schema.sql`）を更新してください。

## 関連ファイル

- `scripts/validate-migrations.sh` - メインの検証スクリプト
- `scripts/pre-commit-migration-check.sh` - コミット前チェックフック
- `scripts/setup-github-db.sh` - GitHub Actions用セットアップスクリプト（検証を含む）
- `.github/workflows/migration-validation.yml` - 自動検証ワークフロー
- `.github/workflows/ci.yml` - CI/CDワークフロー（検証ステップを含む）

