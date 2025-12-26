#!/bin/bash
# マイグレーションファイルの整合性を強制するスクリプト
# 統合マイグレーションファイル以外をすべて削除し、確実に1つのファイルのみを残す

set -e

# スクリプトのディレクトリを取得（music-practiceディレクトリに移動）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

MIGRATIONS_DIR="supabase/migrations"
INITIAL_SCHEMA="20251219000000_initial_schema.sql"

echo "🔍 マイグレーションファイルの整合性を強制します..."
echo "📁 作業ディレクトリ: $(pwd)"

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

# 3. 削除前の状態を表示
echo "📄 削除前のマイグレーションファイル:"
find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort || echo "ファイルが見つかりません"

# 4. 統合マイグレーションファイル以外のすべてのファイルを削除（根本的な対策）
echo "🧹 統合マイグレーションファイル以外を削除中..."

# 方法1: findコマンドで直接削除（最も確実）
find "$MIGRATIONS_DIR" -name "*.sql" -type f ! -name "$INITIAL_SCHEMA" -exec rm -f {} \; 2>/dev/null || true

# 方法2: すべてのSQLファイルをリストアップして削除（二重チェック）
ALL_SQL_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f 2>/dev/null || true)
if [ -n "$ALL_SQL_FILES" ]; then
  for file in $ALL_SQL_FILES; do
    filename=$(basename "$file")
    if [ "$filename" != "$INITIAL_SCHEMA" ]; then
      echo "  🗑️  削除: $filename"
      rm -f "$file" 2>/dev/null || true
    fi
  done
fi

# .skipファイル、隠しファイル、バックアップファイルも削除
find "$MIGRATIONS_DIR" -name "*.skip" -exec rm -f {} \; 2>/dev/null || true
find "$MIGRATIONS_DIR" -name ".*" -type f -exec rm -f {} \; 2>/dev/null || true
find "$MIGRATIONS_DIR" -name "*.bak" -o -name "*.backup" -o -name "*.old" -exec rm -f {} \; 2>/dev/null || true

# 特定の古いマイグレーションファイルを明示的に削除（根本的な対策）
echo "🧹 特定の古いマイグレーションファイルを明示的に削除中..."
rm -f "$MIGRATIONS_DIR/20250120000000_add_instrument_specific_data.sql" 2>/dev/null || true
rm -f "$MIGRATIONS_DIR/20250101000000_ensure_representative_songs_table_final.sql" 2>/dev/null || true
rm -f "$MIGRATIONS_DIR/20250122000001_ensure_representative_songs_table.sql" 2>/dev/null || true

# 5. 削除後の状態を表示
echo "📄 削除後のマイグレーションファイル:"
REMAINING_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f)
echo "$REMAINING_FILES" | sort || echo "ファイルが見つかりません"

# 6. ファイル数を確認
FILE_COUNT=$(echo "$REMAINING_FILES" | wc -l | tr -d ' ')

if [ "$FILE_COUNT" -ne 1 ]; then
  echo "❌ エラー: マイグレーションファイル数が正しくありません (期待: 1, 実際: $FILE_COUNT)"
  echo "📄 残っているファイル:"
  echo "$REMAINING_FILES"
  
  # 強制的に削除を再試行
  echo "🔧 強制的に削除を再試行します..."
  for file in $REMAINING_FILES; do
    filename=$(basename "$file")
    if [ "$filename" != "$INITIAL_SCHEMA" ]; then
      echo "  🗑️  強制削除: $filename"
      rm -f "$file" 2>/dev/null || true
    fi
  done
  
  # 再確認
  REMAINING_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f)
  FILE_COUNT=$(echo "$REMAINING_FILES" | wc -l | tr -d ' ')
  
  if [ "$FILE_COUNT" -ne 1 ]; then
    echo "❌ エラー: ファイルの削除に失敗しました (期待: 1, 実際: $FILE_COUNT)"
    echo "📄 残っているファイル:"
    echo "$REMAINING_FILES"
    exit 1
  fi
fi

# 7. 最終確認
echo "✅ マイグレーションファイルの整合性が確保されました"
echo "📊 ファイル数: $FILE_COUNT"
echo "📄 ファイル名: $(basename "$REMAINING_FILES")"
