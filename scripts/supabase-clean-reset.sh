#!/bin/bash
# Supabaseを完全にクリーンな状態でリセットするスクリプト
# このスクリプトは、Supabaseのマイグレーション問題を根本的に解決します

set -e

echo "🔧 Supabaseを完全にクリーンな状態でリセットします..."

# 1. Supabaseを停止
echo "🛑 Supabaseを停止中..."
supabase stop || true

# 2. Dockerコンテナを完全に削除
echo "🧹 Dockerコンテナを削除中..."
docker ps -a | grep supabase | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# 3. Dockerボリュームを完全に削除（マイグレーション履歴を含む）
echo "🧹 Dockerボリュームを削除中..."
docker volume ls | grep supabase | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true

# 4. Supabaseのローカル設定をクリーンアップ
echo "🧹 Supabaseのローカル設定をクリーンアップ中..."
rm -rf .supabase 2>/dev/null || true

# 5. マイグレーションファイルの整合性を強制
echo "🔍 マイグレーションファイルの整合性を強制中..."
if [ -f "scripts/enforce-migration-consistency.sh" ]; then
  bash scripts/enforce-migration-consistency.sh || {
    echo "❌ マイグレーションファイルの整合性確保に失敗しました"
    exit 1
  }
fi

# 6. マイグレーションディレクトリの最終確認
echo "📊 マイグレーションディレクトリの状態:"
ls -la supabase/migrations/ || echo "ディレクトリが見つかりません"

# 7. Supabaseを起動（クリーンな状態から）
echo "🚀 Supabaseを起動中..."
supabase start

# 8. マイグレーションを実行
echo "🔄 マイグレーションを実行中..."
supabase db reset

echo "✅ Supabaseのクリーンリセットが完了しました"

