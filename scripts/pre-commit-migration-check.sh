#!/bin/bash
# Gitコミット前のマイグレーションファイルチェックフック

# ステージングされているマイグレーションファイルをチェック
STAGED_MIGRATIONS=$(git diff --cached --name-only --diff-filter=ACMR | grep "^supabase/migrations/.*\.sql$" || true)

if [ -z "$STAGED_MIGRATIONS" ]; then
  # マイグレーションファイルが変更されていない場合はスキップ
  exit 0
fi

echo "🔍 ステージングされているマイグレーションファイルをチェック中..."

# 統合マイグレーションファイル以外のマイグレーションファイルが追加されていないかチェック
for file in $STAGED_MIGRATIONS; do
  if [[ "$file" != "supabase/migrations/20251219000000_initial_schema.sql" ]]; then
    echo "⚠️  警告: 統合マイグレーションファイル以外のマイグレーションファイルが追加されました: $file"
    echo "📝 注意: 新しいマイグレーションファイルを作成するのではなく、統合マイグレーションファイル（20251219000000_initial_schema.sql）を更新してください"
    echo ""
    echo "続行しますか？ (y/n)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
      echo "❌ コミットがキャンセルされました"
      exit 1
    fi
  fi
done

# 統合マイグレーションファイルが削除されていないかチェック
if echo "$STAGED_MIGRATIONS" | grep -q "^supabase/migrations/20251219000000_initial_schema.sql$"; then
  DELETED=$(git diff --cached --name-only --diff-filter=D | grep "^supabase/migrations/20251219000000_initial_schema.sql$" || true)
  if [ -n "$DELETED" ]; then
    echo "❌ エラー: 統合マイグレーションファイルを削除することはできません"
    exit 1
  fi
fi

echo "✅ マイグレーションファイルのチェックが完了しました"

