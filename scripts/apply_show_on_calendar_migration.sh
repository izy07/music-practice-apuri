#!/bin/bash
# show_on_calendarカラム追加マイグレーション実行スクリプト

set -e

PROJECT_REF="uteeqkpsezbabdmritkn"
MIGRATION_FILE="supabase/migrations/20251208000000_force_add_show_on_calendar_column.sql"

echo "🚀 show_on_calendarカラム追加マイグレーションを実行します..."
echo "プロジェクト: ${PROJECT_REF}"
echo ""

# Supabase CLIの確認
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLIがインストールされていません"
  echo ""
  echo "📝 手動でマイグレーションを実行する方法:"
  echo "1. Supabaseダッシュボードにアクセス:"
  echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
  echo ""
  echo "2. 以下のファイルの内容をコピー&ペーストして実行:"
  echo "   ${MIGRATION_FILE}"
  echo ""
  exit 1
fi

# マイグレーションファイルの存在確認
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ マイグレーションファイルが見つかりません: $MIGRATION_FILE"
  exit 1
fi

# ログイン確認
echo "📋 Supabase CLIのログイン状態を確認中..."
if ! supabase projects list &> /dev/null; then
  echo "⚠️  Supabase CLIにログインしていません"
  echo ""
  echo "以下のコマンドでログインしてください:"
  echo "  supabase login"
  echo ""
  echo "または、Supabaseダッシュボードで直接SQLを実行してください:"
  echo "  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
  echo ""
  echo "実行するSQLファイル: ${MIGRATION_FILE}"
  exit 1
fi

# プロジェクトのリンク確認
echo "🔗 プロジェクト ${PROJECT_REF} に接続中..."
if ! supabase link --project-ref "${PROJECT_REF}" 2>/dev/null; then
  echo "⚠️  プロジェクトのリンクに失敗しました（既にリンク済みの可能性があります）"
fi

# マイグレーションの実行
echo "🔄 マイグレーションを実行中..."
if supabase db push; then
  echo "✅ マイグレーションが完了しました！"
  echo ""
  echo "📝 次回アプリを起動すると、show_on_calendarカラムが使用されるはずです。"
else
  echo "❌ マイグレーションの実行に失敗しました"
  echo ""
  echo "📝 手動でマイグレーションを実行する方法:"
  echo "1. Supabaseダッシュボードにアクセス:"
  echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
  echo ""
  echo "2. 以下のファイルの内容をコピー&ペーストして実行:"
  echo "   ${MIGRATION_FILE}"
  exit 1
fi



