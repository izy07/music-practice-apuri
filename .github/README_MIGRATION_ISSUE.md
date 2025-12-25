# マイグレーションファイル問題の解決方法

## 問題
エラーログで`20250101000000_ensure_representative_songs_table_final.sql`が実行されようとしていますが、このファイルは既に削除されています。

## 根本原因
このファイルは既に`20251219000000_initial_schema.sql`に統合されていますが、Supabaseが古いマイグレーション履歴を参照している可能性があります。

## 解決策

### 0. マイグレーションファイルの整合性チェック（推奨）
```bash
# マイグレーションファイルの整合性をチェック
bash scripts/validate-migrations.sh
```

このスクリプトは以下をチェックします：
- 統合マイグレーションファイルの存在確認
- 不要なマイグレーションファイルの検出
- .skipファイルの検出
- 古いマイグレーションファイル名への参照の検出
- 統合マイグレーションファイルの必須要素の確認

### 1. 現在の状態の確認
```bash
# 現在のマイグレーションファイルを確認
ls -la supabase/migrations/

# 期待される結果: 20251219000000_initial_schema.sql のみ
```

### 2. Supabaseのローカル環境を完全にリセット
```bash
# Supabaseを停止
supabase stop

# Dockerボリュームを削除（古いデータを完全に削除）
docker volume rm supabase_db_music-practice 2>/dev/null || true
docker volume rm supabase_kong_music-practice 2>/dev/null || true
docker volume rm supabase_auth_music-practice 2>/dev/null || true
docker volume rm supabase_storage_music-practice 2>/dev/null || true

# Supabaseを再起動
supabase start
```

### 3. GitHub Actionsでの対応
GitHub ActionsでSupabaseを使用する場合は、以下の手順を実行してください：

```yaml
- name: Supabase環境の完全クリーンアップ
  run: |
    # 既存のコンテナを停止
    supabase stop || true
    
    # Dockerボリュームを削除
    docker volume ls | grep supabase | awk '{print $2}' | xargs -r docker volume rm || true
    
    # Supabaseを起動
    supabase start
    
    # マイグレーションを実行
    supabase db reset
```

## 注意事項
- マイグレーションファイルは統合マイグレーションファイル（`20251219000000_initial_schema.sql`）にすべて含まれています
- 古いマイグレーションファイルは削除されています
- `supabase db reset`は現在のファイルシステムからファイルを読み込みます
- Git履歴に古いファイルが存在しても、現在のファイルシステムに存在しない限り実行されません

