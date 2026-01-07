#!/bin/bash
# goalsテーブルにinstrument_idカラムを追加するスクリプト

set -e

PROJECT_REF="uteeqkpsezbabdmritkn"
SQL_FILE="supabase/migrations/20251226000003_add_instrument_id_to_goals.sql"

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🎹 goalsテーブルにinstrument_idカラムを追加します..."
echo "プロジェクト: ${PROJECT_REF}"
echo ""

# SQLファイルの確認
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQLファイルが見つかりません: $SQL_FILE"
  exit 1
fi

echo "📄 SQLファイル: $SQL_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 実行手順:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Supabaseダッシュボードを開く:"
echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo ""
echo "2. SQL Editorで以下のSQLを実行してください:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$SQL_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "3. 実行後、アプリケーションを再読み込みしてください"
echo ""

# macOSの場合、SQLをクリップボードにコピー
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "📋 SQLをクリップボードにコピーしますか？ (y/n)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    cat "$SQL_FILE" | pbcopy
    echo "✅ SQLをクリップボードにコピーしました"
    echo ""
    echo "ブラウザでSupabaseダッシュボードを開きますか？ (y/n)"
    read -r open_response
    if [[ "$open_response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
      open "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
    fi
  fi
fi

echo ""
echo "✅ 準備完了！上記のSQLをSupabaseダッシュボードで実行してください。"
echo "🎯 これで各楽器ごとに目標データを分けて管理できるようになります。"

