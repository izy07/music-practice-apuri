#!/bin/bash
# マイグレーションファイルの整合性チェックスクリプト

set -e

echo "🔍 マイグレーションファイルの整合性をチェックします..."

MIGRATIONS_DIR="supabase/migrations"
INITIAL_SCHEMA="20251219000000_initial_schema.sql"

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

# 3. 不要なマイグレーションファイルのチェック（統合マイグレーション以外）
MIGRATION_COUNT=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | wc -l | tr -d ' ')

if [ "$MIGRATION_COUNT" -gt 1 ]; then
  echo "⚠️  警告: 統合マイグレーションファイル以外のマイグレーションファイルが見つかりました:"
  find "$MIGRATIONS_DIR" -name "*.sql" -type f | grep -v "$INITIAL_SCHEMA" || true
  echo ""
  echo "📝 注意: すべてのマイグレーションは統合マイグレーションファイルに含まれるべきです"
  echo "📝 不要なファイルは削除してください"
fi

# 4. .skipファイルのチェック
SKIP_FILES=$(find "$MIGRATIONS_DIR" -name "*.skip" -o -name "*skip*" 2>/dev/null | wc -l | tr -d ' ')

if [ "$SKIP_FILES" -gt 0 ]; then
  echo "⚠️  警告: .skipファイルが見つかりました:"
  find "$MIGRATIONS_DIR" -name "*.skip" -o -name "*skip*" 2>/dev/null || true
  echo ""
  echo "📝 注意: .skipファイルは不要です。削除してください"
fi

# 5. 古いマイグレーションファイル名への参照チェック
echo "🔍 古いマイグレーションファイル名への参照をチェック中..."

OLD_MIGRATION_PATTERNS=(
  "20250101000000_ensure_representative_songs_table_final"
  "20250122000001_ensure_representative_songs_table"
  "20260227000000_create_get_total_practice_time_function"
  "20251209000000_create_practice_schedules_and_tasks"
  "20251209000002_ensure_attendance_records_table_final"
  "20250123000001_add_custom_instrument_name"
)

FOUND_REFERENCE=false

for pattern in "${OLD_MIGRATION_PATTERNS[@]}"; do
  if grep -r "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.md" --include="*.sh" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "validate-migrations.sh" | grep -v "MIGRATION_FIX.md" | grep -v "README_MIGRATION_ISSUE.md" > /dev/null; then
    echo "⚠️  警告: 古いマイグレーションファイル名への参照が見つかりました: $pattern"
    grep -r "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.md" --include="*.sh" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "validate-migrations.sh" | grep -v "MIGRATION_FIX.md" | grep -v "README_MIGRATION_ISSUE.md" || true
    FOUND_REFERENCE=true
  fi
done

if [ "$FOUND_REFERENCE" = true ]; then
  echo ""
  echo "❌ エラー: 古いマイグレーションファイル名への参照が見つかりました"
  echo "📝 これらは統合マイグレーションファイル（$INITIAL_SCHEMA）への参照に更新してください"
  exit 1
fi

# 6. 統合マイグレーションファイルの必須要素チェック
echo "🔍 統合マイグレーションファイルの必須要素をチェック中..."

REQUIRED_ELEMENTS=(
  "CREATE TABLE.*instruments"
  "CREATE TABLE.*user_profiles"
  "CREATE TABLE.*representative_songs"
  "CREATE.*FUNCTION.*get_total_practice_time"
  "instrument_specific_data"
)

MISSING_ELEMENTS=()

for element in "${REQUIRED_ELEMENTS[@]}"; do
  if ! grep -q -i "$element" "$MIGRATIONS_DIR/$INITIAL_SCHEMA" 2>/dev/null; then
    MISSING_ELEMENTS+=("$element")
  fi
done

if [ ${#MISSING_ELEMENTS[@]} -gt 0 ]; then
  echo "❌ エラー: 統合マイグレーションファイルに必須要素が不足しています:"
  for element in "${MISSING_ELEMENTS[@]}"; do
    echo "  - $element"
  done
  exit 1
fi

echo "✅ マイグレーションファイルの整合性チェックが完了しました"
echo "📊 統合マイグレーションファイル: $INITIAL_SCHEMA"
echo "📊 マイグレーションファイル数: $MIGRATION_COUNT"

