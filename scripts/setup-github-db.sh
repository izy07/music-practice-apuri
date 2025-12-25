#!/bin/bash
# GitHub Actions用データベースセットアップスクリプト

set -e

echo "🚀 GitHub Actions用データベースセットアップを開始します..."

# Supabase CLIのインストール確認
if ! command -v supabase &> /dev/null; then
  echo "📦 Supabase CLIをインストール中..."
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
  sudo mv supabase /usr/local/bin/
  supabase --version || {
    echo "❌ Supabase CLIのインストールに失敗しました"
    exit 1
  }
  echo "✅ Supabase CLIのインストールが完了しました"
fi

# マイグレーションファイルの整合性を強制（根本的な対策）
echo "🔍 マイグレーションファイルの整合性を強制中..."
if [ -f "scripts/enforce-migration-consistency.sh" ]; then
  bash scripts/enforce-migration-consistency.sh || {
    echo "❌ マイグレーションファイルの整合性確保に失敗しました"
    exit 1
  }
else
  echo "⚠️  警告: enforce-migration-consistency.sh が見つかりません"
  echo "🔍 基本的な整合性チェックを実行中..."
  if [ -f "scripts/validate-migrations.sh" ]; then
    bash scripts/validate-migrations.sh || {
      echo "❌ マイグレーションファイルの整合性チェックに失敗しました"
      exit 1
    }
  fi
fi

# 既存のSupabase環境のクリーンアップ
echo "🧹 既存のSupabase環境をクリーンアップ中..."
supabase stop || true

# Dockerボリュームのクリーンアップ（古いデータを完全に削除）
echo "🧹 Dockerボリュームをクリーンアップ中..."
docker volume ls | grep supabase | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true

# Supabaseローカル環境の起動
echo "🔧 Supabaseローカル環境を起動中..."
supabase start

# データベース状態の確認
echo "📊 データベース状態:"
supabase status

# マイグレーションの実行
echo "🔄 データベースマイグレーションを実行中..."
supabase db reset

# instrumentsテーブルの確認
echo "🎹 instrumentsテーブルの確認:"
supabase db execute "
  SELECT 
    COUNT(*) as total_instruments,
    COUNT(CASE WHEN id = '550e8400-e29b-41d4-a716-446655440016' THEN 1 END) as other_instrument_exists
  FROM instruments;
" || echo "⚠️  instrumentsテーブルが存在しない可能性があります"

echo "✅ データベースセットアップが完了しました！"

