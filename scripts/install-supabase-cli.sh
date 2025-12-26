#!/bin/bash
# Supabase CLIインストールスクリプト（GitHub Actions対応）
# シンプルで確実なインストール方法を使用

set -e

echo "📦 Supabase CLIをインストールします..."

# 既存のSupabase CLIを削除
sudo rm -f /usr/local/bin/supabase 2>/dev/null || true

# 一時ディレクトリを作成
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

cd "$TEMP_DIR"

# 最新版を直接ダウンロード（最も確実な方法）
echo "📥 Supabase CLIをダウンロード中..."
if ! curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz; then
  echo "❌ ダウンロードに失敗しました"
  exit 1
fi

# 解凍
echo "📦 解凍中..."
if ! tar -xzf supabase.tar.gz; then
  echo "❌ 解凍に失敗しました"
  exit 1
fi

# インストール
echo "🔧 インストール中..."
sudo mv supabase /usr/local/bin/
sudo chmod +x /usr/local/bin/supabase

# インストール確認
if supabase --version >/dev/null 2>&1; then
  INSTALLED_VERSION=$(supabase --version | head -1)
  echo "✅ Supabase CLIのインストールが完了しました"
  echo "📌 バージョン: $INSTALLED_VERSION"
  exit 0
else
  echo "❌ Supabase CLIのインストール確認に失敗しました"
  exit 1
fi
