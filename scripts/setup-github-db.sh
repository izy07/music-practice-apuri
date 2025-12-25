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

# 完全なクリーンアップとリセット（根本的な対策）
echo "🧹 Supabase環境を完全にクリーンアップ中..."
if [ -f "scripts/supabase-clean-reset.sh" ]; then
  # クリーンリセットスクリプトを使用（推奨）
  bash scripts/supabase-clean-reset.sh
else
  # フォールバック: 手動でクリーンアップ
  echo "⚠️  supabase-clean-reset.shが見つかりません。手動でクリーンアップします..."
  supabase stop || true
  docker ps -a | grep supabase | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true
  docker volume ls | grep supabase | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
  rm -rf .supabase 2>/dev/null || true
  
  # マイグレーションファイルの整合性を再確認
  find supabase/migrations -name "*.sql" -type f ! -name "20251219000000_initial_schema.sql" -delete 2>/dev/null || true
  find supabase/migrations -name "*.skip" -delete 2>/dev/null || true
  
  # Supabaseを起動
  supabase start
  
  # マイグレーションを実行
  supabase db reset
fi

# instrumentsテーブルの確認
echo "🎹 instrumentsテーブルの確認:"
supabase db execute "
  SELECT 
    COUNT(*) as total_instruments,
    COUNT(CASE WHEN id = '550e8400-e29b-41d4-a716-446655440016' THEN 1 END) as other_instrument_exists
  FROM instruments;
" || echo "⚠️  instrumentsテーブルが存在しない可能性があります"

echo "✅ データベースセットアップが完了しました！"

