#!/bin/bash
# Supabaseを完全にクリーンな状態でリセットするスクリプト
# 根本的な原因：supabase startが内部的にマイグレーションを実行するため、
# 起動前に確実にマイグレーションファイルの整合性を確保する必要がある

set -e

# スクリプトのディレクトリを取得（music-practiceディレクトリに移動）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔧 Supabaseを完全にクリーンな状態でリセットします..."
echo "📁 作業ディレクトリ: $(pwd)"

# 0. マイグレーションファイルの整合性を最初に強制（最重要：Supabase起動前に必須）
echo "🔍 [STEP 0] マイグレーションファイルの整合性を強制中（Supabase起動前の最重要ステップ）..."
if [ -f "scripts/enforce-migration-consistency.sh" ]; then
  chmod +x scripts/enforce-migration-consistency.sh
  bash scripts/enforce-migration-consistency.sh || {
    echo "❌ マイグレーションファイルの整合性確保に失敗しました"
    exit 1
  }
else
  echo "⚠️  enforce-migration-consistency.shが見つかりません。手動で削除します..."
  # 手動で統合マイグレーションファイル以外を削除
  find supabase/migrations -name "*.sql" -type f ! -name "20251219000000_initial_schema.sql" -exec rm -f {} \; 2>/dev/null || true
  find supabase/migrations -name "*.skip" -exec rm -f {} \; 2>/dev/null || true
  find supabase/migrations -name ".*" -type f -exec rm -f {} \; 2>/dev/null || true
fi

# 0.5. 最終確認：ファイル数が1であることを確認（Supabase起動前の最後の確認）
MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$MIGRATION_COUNT" -ne 1 ]; then
  echo "❌ エラー: マイグレーションファイル数が正しくありません (期待: 1, 実際: $MIGRATION_COUNT)"
  echo "📄 見つかったファイル:"
  find supabase/migrations -name "*.sql" -type f || true
  exit 1
fi

echo "✅ マイグレーションファイルの整合性が確保されました（ファイル数: $MIGRATION_COUNT）"
echo "📄 統合マイグレーションファイル: $(find supabase/migrations -name "*.sql" -type f)"

# 1. Supabaseを停止
echo "🛑 [STEP 1] Supabaseを停止中..."
supabase stop 2>/dev/null || true

# 2. Dockerコンテナを完全に削除
echo "🧹 [STEP 2] Dockerコンテナを削除中..."
docker ps -a | grep supabase | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# 3. Dockerボリュームを完全に削除（マイグレーション履歴を含む）
echo "🧹 [STEP 3] Dockerボリュームを削除中..."
docker volume ls | grep supabase | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true

# 4. Supabaseのローカル設定とキャッシュをクリーンアップ
echo "🧹 [STEP 4] Supabaseのローカル設定とキャッシュをクリーンアップ中..."
rm -rf .supabase 2>/dev/null || true
rm -rf supabase/.temp 2>/dev/null || true
rm -rf supabase/.branches 2>/dev/null || true

# 5. 再度マイグレーションファイルの整合性を確認（クリーンアップ後の再確認）
echo "🔍 [STEP 5] マイグレーションファイルの整合性を再確認中..."
MIGRATION_COUNT_AFTER_CLEANUP=$(find supabase/migrations -name "*.sql" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$MIGRATION_COUNT_AFTER_CLEANUP" -ne 1 ]; then
  echo "❌ エラー: クリーンアップ後のマイグレーションファイル数が正しくありません (期待: 1, 実際: $MIGRATION_COUNT_AFTER_CLEANUP)"
  echo "📄 見つかったファイル:"
  find supabase/migrations -name "*.sql" -type f || true
  # 再度整合性を強制
if [ -f "scripts/enforce-migration-consistency.sh" ]; then
    bash scripts/enforce-migration-consistency.sh
  else
    find supabase/migrations -name "*.sql" -type f ! -name "20251219000000_initial_schema.sql" -exec rm -f {} \; 2>/dev/null || true
  fi
  # 最終確認
  MIGRATION_COUNT_FINAL=$(find supabase/migrations -name "*.sql" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$MIGRATION_COUNT_FINAL" -ne 1 ]; then
    echo "❌ エラー: 最終確認でもマイグレーションファイル数が正しくありません"
    exit 1
  fi
fi

echo "✅ マイグレーションファイルの整合性が最終確認されました（ファイル数: $MIGRATION_COUNT_AFTER_CLEANUP）"

# 6. Supabaseを起動（クリーンな状態から、整合性が確保されたマイグレーションファイルで）
echo "🚀 [STEP 6] Supabaseを起動中（整合性が確保されたマイグレーションファイルで）..."
if ! supabase start; then
  echo "❌ Supabaseの起動に失敗しました"
  exit 1
fi

# 7. マイグレーションを実行（supabase startが内部的にマイグレーションを実行する可能性があるが、明示的に実行）
echo "🔄 [STEP 7] マイグレーションを実行中..."
if ! supabase db reset; then
  echo "❌ マイグレーションの実行に失敗しました"
  exit 1
fi

echo "✅ Supabaseのクリーンリセットが完了しました"
