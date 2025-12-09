#!/bin/bash

# 総練習時間取得RPC関数を適用するスクリプト
# このスクリプトは、Supabaseダッシュボードで実行するSQLを表示します

echo "=========================================="
echo "総練習時間取得RPC関数の適用"
echo "=========================================="
echo ""
echo "このスクリプトは、Supabaseダッシュボードで実行するSQLを表示します。"
echo ""

# マイグレーションファイルのパス
MIGRATION_FILE="supabase/migrations/20260227000000_create_get_total_practice_time_function.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ エラー: マイグレーションファイルが見つかりません: $MIGRATION_FILE"
    exit 1
fi

echo "📋 以下のSQLをSupabaseダッシュボードで実行してください:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$MIGRATION_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 実行手順:"
echo "1. Supabaseダッシュボードにログイン: https://supabase.com/dashboard"
echo "2. プロジェクトを選択: uteeqkpsezbabdmritkn"
echo "3. 左メニューから「SQL Editor」をクリック"
echo "4. 上記のSQLをコピー＆ペースト"
echo "5. 「Run」ボタンをクリック"
echo ""
echo "✅ 実行後、アプリケーションを再読み込みしてください。"
echo ""

# クリップボードにコピー（macOSの場合）
if command -v pbcopy &> /dev/null; then
    cat "$MIGRATION_FILE" | pbcopy
    echo "📋 SQLをクリップボードにコピーしました（macOS）"
fi


