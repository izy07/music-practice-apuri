# 根本原因分析：Supabaseマイグレーションエラー

## 問題の現象

エラーログでは、`supabase db reset`実行時に、既に削除されている`20250101000000_ensure_representative_songs_table_final.sql`が実行されようとしています。

```
ERROR: relation "instruments" does not exist (SQLSTATE 42P01)
At statement: 1
-- 2. representative_songsテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS representative_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instrument_id UUID REFERENCES instruments(id) ON DELETE CASCADE NOT NULL,
  ...
)
```

## 根本原因の特定

### 1. ファイルシステムの状態
- ✅ 現在の`supabase/migrations/`ディレクトリには`20251219000000_initial_schema.sql`のみが存在
- ✅ `20250101000000_ensure_representative_songs_table_final.sql`は存在しない
- ✅ 統合マイグレーションファイルには`representative_songs`テーブルの定義が含まれている

### 2. Git履歴の状態
- ❌ Git履歴には`20250101000000_ensure_representative_songs_table_final.sql`が存在する
- ❌ 複数のコミットでこのファイルが作成・削除・再作成されている

### 3. Supabase CLIの動作
- `supabase db reset`は通常、ファイルシステムの`supabase/migrations/`ディレクトリから`.sql`ファイルを読み込む
- しかし、エラーログでは存在しないファイルが実行されようとしている

## 推測される根本原因

### 仮説1: Supabase CLIがGit履歴を参照している（可能性：低）
- Supabase CLIはファイルシステムからファイルを読み込むため、Git履歴を直接参照する可能性は低い

### 仮説2: GitHub Actionsのチェックアウト時に古いファイルが復元されている（可能性：中）
- `actions/checkout@v3`がデフォルトで`fetch-depth: 1`（shallow clone）を使用している場合、古いファイルが含まれる可能性がある
- しかし、現在のHEADには存在しないはず

### 仮説3: Supabase CLIのキャッシュまたは内部状態（可能性：高）
- Supabase CLIが何らかのキャッシュや内部状態を保持している可能性がある
- `.supabase`ディレクトリやDockerボリュームに古いマイグレーション履歴が残っている可能性

### 仮説4: マイグレーションファイル名のタイムスタンプ順序（可能性：高）
- `supabase db reset`はマイグレーションファイルをタイムスタンプ順に実行する
- Git履歴から何らかの方法で古いファイルが読み込まれている可能性

## 根本的な解決策

### 対策1: マイグレーションファイルの整合性を強制（実装済み）
- `scripts/enforce-migration-consistency.sh`を実行して、統合マイグレーションファイル以外を削除

### 対策2: Supabase環境の完全クリーンアップ（実装済み）
- `scripts/supabase-clean-reset.sh`を実行して、すべてのキャッシュと状態をクリア

### 対策3: CI/CDでの実行前チェック（実装済み）
- GitHub Actionsで`supabase db reset`実行前に、マイグレーションディレクトリの整合性を強制

### 対策4: Git履歴からの完全削除（推奨：将来実施）
- `git filter-branch`またはBFG Repo-Cleanerを使用して、Git履歴から古いマイグレーションファイルを完全に削除

## 実装済みの対策

1. ✅ `scripts/enforce-migration-consistency.sh` - 統合マイグレーションファイル以外を強制削除
2. ✅ `scripts/supabase-clean-reset.sh` - Supabase環境の完全クリーンアップ
3. ✅ `scripts/validate-migrations.sh` - マイグレーションファイルの整合性チェック
4. ✅ CI/CDワークフローでの実行前チェック

## 次のステップ

1. 次回のGitHub Actionsビルドで、これらの対策が機能するか確認
2. エラーが継続する場合は、Git履歴からの完全削除を検討
3. Supabase CLIのバージョンや動作を確認

