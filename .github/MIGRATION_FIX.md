# マイグレーションファイルの修正について

## 問題
`20250101000000_ensure_representative_songs_table_final.sql`というマイグレーションファイルが既に削除されているにも関わらず、`supabase db reset`の実行時にエラーが発生しています。

## 原因
このマイグレーションファイルは既に削除されており、現在は`20251219000000_initial_schema.sql`に統合されています。しかし、SupabaseがGit履歴から古いマイグレーションファイルを読み込もうとしている可能性があります。

## 解決策
1. **現在のマイグレーションディレクトリには`20251219000000_initial_schema.sql`のみが存在します**
2. **すべてのテーブル定義（`representative_songs`を含む）が統合マイグレーションファイルに含まれています**
3. **Git履歴から古いマイグレーションファイルを完全に削除する必要があります**

## 根本的な修正方法

### 方法1: Git履歴からの完全削除（推奨）
```bash
# Git履歴から古いマイグレーションファイルを完全に削除
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch supabase/migrations/20250101000000_ensure_representative_songs_table_final.sql" \
  --prune-empty --tag-name-filter cat -- --all

# または、BFG Repo-Cleanerを使用（より高速）
# bfg --delete-files 20250101000000_ensure_representative_songs_table_final.sql
```

### 方法2: Supabaseのマイグレーション履歴をクリア
```bash
# Supabaseのローカルデータベースを完全にリセット
supabase stop
supabase db reset --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable"

# または、Dockerコンテナとボリュームを完全に削除
supabase stop
docker volume rm supabase_db_music-practice 2>/dev/null || true
supabase start
```

## 確認方法
```bash
# 現在のマイグレーションファイルを確認
ls -la supabase/migrations/

# 期待される結果: 20251219000000_initial_schema.sql のみ

# Git履歴から古いファイルが削除されているか確認
git log --all --full-history -- "supabase/migrations/20250101000000_ensure_representative_songs_table_final.sql"

# 結果が空であれば、Git履歴から削除されています
```

## 注意事項
- `supabase db reset`は現在のファイルシステムからマイグレーションファイルを読み込みます
- しかし、SupabaseがGit履歴を参照する場合、古いファイルが読み込まれる可能性があります
- GitHub ActionsなどのCI/CD環境では、常にクリーンな状態でマイグレーションを実行してください
- マイグレーションファイルは統合マイグレーションファイル（`20251219000000_initial_schema.sql`）に統合されています

