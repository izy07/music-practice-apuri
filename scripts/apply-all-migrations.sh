#!/bin/bash
# すべてのマイグレーションを適用するスクリプト
# Supabaseの本番環境で実行することを想定

set -e

echo "=========================================="
echo "すべてのマイグレーションを適用します"
echo "=========================================="
echo ""

# マイグレーションファイルのリスト
MIGRATIONS=(
  "20251226000000_add_instrument_id_to_my_songs.sql"
  "20251226000001_add_instrument_id_to_events.sql"
  "20251226000002_add_instrument_id_to_tasks.sql"
  "20251226000003_add_instrument_id_to_goals.sql"
  "20251226000004_add_instrument_id_to_recordings.sql"
  "20251226000005_add_instrument_id_to_practice_sessions.sql"
  "20251226000006_ensure_all_columns.sql"
  "20251227000001_ensure_tutorial_completed_columns.sql"
)

echo "以下のマイグレーションファイルを適用します："
for migration in "${MIGRATIONS[@]}"; do
  echo "  - $migration"
done
echo ""

echo "⚠️  注意: このスクリプトはSupabaseダッシュボードのSQL Editorから実行してください"
echo ""
echo "手順："
echo "1. Supabaseダッシュボードにアクセス: https://supabase.com/dashboard"
echo "2. プロジェクトを選択"
echo "3. 左メニューから「SQL Editor」を開く"
echo "4. 以下の各マイグレーションファイルの内容をコピーして実行："
echo ""

for migration in "${MIGRATIONS[@]}"; do
  if [ -f "supabase/migrations/$migration" ]; then
    echo "--- $migration ---"
    echo ""
    cat "supabase/migrations/$migration"
    echo ""
    echo "=========================================="
    echo ""
  else
    echo "⚠️  警告: $migration が見つかりません"
  fi
done

echo ""
echo "または、すべてのマイグレーションを一度に実行する場合は、"
echo "supabase/migrations/20251226000006_ensure_all_columns.sql を実行してください。"
echo "（このファイルには、すべての必要なカラムが含まれています）"

