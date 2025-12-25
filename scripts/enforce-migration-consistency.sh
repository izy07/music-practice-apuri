#!/bin/bash
# マイグレーションファイルの整合性を強制するスクリプト
# このスクリプトは、supabase db reset実行前に、不要なマイグレーションファイルを削除します

set -e

MIGRATIONS_DIR="supabase/migrations"
INITIAL_SCHEMA="20251219000000_initial_schema.sql"

echo "🔍 マイグレーションファイルの整合性を強制します..."

# 1. マイグレーションディレクトリの存在確認
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ エラー: $MIGRATIONS_DIR ディレクトリが存在しません"
  exit 1
fi

# 2. 統合マイグレーションファイルの存在確認
if [ ! -f "$MIGRATIONS_DIR/$INITIAL_SCHEMA" ]; then
  echo "❌ エラー: 統合マイグレーションファイル $INITIAL_SCHEMA が見つかりません"
  exit 1
fi

# 3. 統合マイグレーションファイル以外のすべてのマイグレーションファイルを削除
echo "🧹 統合マイグレーションファイル以外のファイルを削除中..."
find "$MIGRATIONS_DIR" -name "*.sql" -type f ! -name "$INITIAL_SCHEMA" -delete 2>/dev/null || true

# 4. .skipファイルも削除
echo "🧹 .skipファイルを削除中..."
find "$MIGRATIONS_DIR" -name "*.skip" -o -name "*skip*" -delete 2>/dev/null || true

# 5. 残っているファイルを確認
REMAINING_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | wc -l | tr -d ' ')

if [ "$REMAINING_FILES" -ne 1 ]; then
  echo "⚠️  警告: 予期しないファイルが見つかりました:"
  find "$MIGRATIONS_DIR" -name "*.sql" -type f || true
  exit 1
fi

# 6. 最終確認
echo "✅ マイグレーションファイルの整合性が確保されました"
echo "📊 残っているファイル: $REMAINING_FILES"
echo "📄 ファイル名: $(find "$MIGRATIONS_DIR" -name "*.sql" -type f | head -1)"

