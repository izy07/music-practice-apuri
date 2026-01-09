#!/bin/bash
# GitHub Actions用データベースセットアップスクリプト
# Supabase CLIのインストールとマイグレーションの実行

set -e

# スクリプトのディレクトリを取得（music-practiceディレクトリに移動）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 GitHub Actions用データベースセットアップを開始します..."
echo "📁 作業ディレクトリ: $(pwd)"

# 1. Supabase CLIのインストール確認
if ! command -v supabase &> /dev/null; then
  echo "📦 Supabase CLIをインストール中..."
  if [ -f "scripts/install-supabase-cli.sh" ]; then
    chmod +x scripts/install-supabase-cli.sh
    bash scripts/install-supabase-cli.sh
  else
    echo "❌ install-supabase-cli.shが見つかりません"
    exit 1
  fi
else
  echo "✅ Supabase CLIは既にインストールされています"
  supabase --version
fi

# 2. マイグレーションファイルの整合性を強制（Supabase起動前に必須）
echo "🔍 マイグレーションファイルの整合性を強制中..."
if [ -f "scripts/enforce-migration-consistency.sh" ]; then
  chmod +x scripts/enforce-migration-consistency.sh
  bash scripts/enforce-migration-consistency.sh || {
    echo "❌ マイグレーションファイルの整合性確保に失敗しました"
    exit 1
  }
else
  echo "❌ enforce-migration-consistency.shが見つかりません"
      exit 1
fi

# 3. Supabase環境の完全クリーンアップとリセット
echo "🧹 Supabase環境を完全にクリーンアップ中..."
if [ -f "scripts/supabase-clean-reset.sh" ]; then
  chmod +x scripts/supabase-clean-reset.sh
  bash scripts/supabase-clean-reset.sh
else
  echo "❌ supabase-clean-reset.shが見つかりません"
  exit 1
fi

# 4. データベースの確認
echo "🎹 データベースの確認中..."
if supabase db execute "SELECT COUNT(*) as count FROM instruments;" >/dev/null 2>&1; then
  echo "✅ データベースが正常にセットアップされました"
else
  echo "⚠️  データベースの確認に失敗しましたが、続行します"
fi

echo "✅ データベースセットアップが完了しました！"
