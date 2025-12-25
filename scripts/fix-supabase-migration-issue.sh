#!/bin/bash
# Supabaseマイグレーション問題の根本的な解決スクリプト
# このスクリプトは、Git履歴から古いマイグレーションファイルが読み込まれる問題を解決します

set -e

MIGRATIONS_DIR="supabase/migrations"
INITIAL_SCHEMA="20251219000000_initial_schema.sql"

echo "🔧 Supabaseマイグレーション問題の根本的な解決を開始します..."

# 1. 現在のマイグレーションディレクトリの状態を確認
echo "📊 現在のマイグレーションファイル:"
ls -la "$MIGRATIONS_DIR" || echo "ディレクトリが見つかりません"

# 2. 統合マイグレーションファイル以外のファイルを強制的に削除
echo ""
echo "🧹 統合マイグレーションファイル以外のすべてのファイルを削除します..."
find "$MIGRATIONS_DIR" -type f ! -name "$INITIAL_SCHEMA" -delete 2>/dev/null || true

# 3. 隠しファイルや.skipeファイルも削除
echo "🧹 隠しファイルと.skipファイルを削除します..."
find "$MIGRATIONS_DIR" -name ".*" -type f -delete 2>/dev/null || true
find "$MIGRATIONS_DIR" -name "*.skip" -delete 2>/dev/null || true

# 4. 最終状態の確認
echo ""
echo "✅ マイグレーションディレクトリの最終状態:"
ls -la "$MIGRATIONS_DIR"

# 5. 統合マイグレーションファイルの存在確認
if [ ! -f "$MIGRATIONS_DIR/$INITIAL_SCHEMA" ]; then
  echo "❌ エラー: 統合マイグレーションファイルが見つかりません"
  exit 1
fi

# 6. ファイル数の確認
FILE_COUNT=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | wc -l | tr -d ' ')

if [ "$FILE_COUNT" -ne 1 ]; then
  echo "⚠️  警告: 予期しないファイル数です (期待: 1, 実際: $FILE_COUNT)"
  echo "📄 見つかったファイル:"
  find "$MIGRATIONS_DIR" -name "*.sql" -type f
  exit 1
fi

echo ""
echo "✅ マイグレーションファイルの整合性が確保されました"
echo "📊 ファイル数: $FILE_COUNT"
echo "📄 ファイル名: $INITIAL_SCHEMA"

