#!/bin/bash

# Supabaseマイグレーション実行スクリプト
# このスクリプトは、Supabaseダッシュボードで実行するためのSQLを準備します

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_FILE="$SCRIPT_DIR/fix_events_and_user_profiles.sql"

echo "=========================================="
echo "🚀 Supabaseマイグレーション実行準備"
echo "=========================================="
echo ""

# SQLファイルの存在確認
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ エラー: SQLファイルが見つかりません: $SQL_FILE"
  exit 1
fi

echo "✅ SQLファイルを確認: $SQL_FILE"
echo ""

# macOSの場合、クリップボードにコピー
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "📋 SQLをクリップボードにコピー中..."
  cat "$SQL_FILE" | pbcopy
  echo "✅ SQLをクリップボードにコピーしました！"
  echo ""
  echo "📝 次の手順:"
  echo "   1. ブラウザで https://supabase.com/dashboard/project/uteeqkpsezbabdmritkn/sql/new を開く"
  echo "   2. SQL Editorにペースト（Cmd+V）"
  echo "   3. 「Run」ボタンをクリック"
  echo ""
  
  # ブラウザを開く（オプション）
  read -p "🌐 Supabaseダッシュボードを開きますか？ (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://supabase.com/dashboard/project/uteeqkpsezbabdmritkn/sql/new"
    echo "✅ ブラウザを開きました"
  fi
else
  echo "📋 SQLファイルの内容:"
  echo "────────────────────────────────────────────────────────"
  cat "$SQL_FILE"
  echo "────────────────────────────────────────────────────────"
  echo ""
  echo "📝 次の手順:"
  echo "   1. ブラウザで https://supabase.com/dashboard/project/uteeqkpsezbabdmritkn/sql/new を開く"
  echo "   2. 上記のSQLをコピー＆ペースト"
  echo "   3. 「Run」ボタンをクリック"
  echo ""
fi

echo "=========================================="
echo "✅ 準備完了！"
echo "=========================================="




