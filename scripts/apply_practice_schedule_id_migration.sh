#!/bin/bash

# eventsテーブルにpractice_schedule_idカラムを追加するマイグレーションを実行
# 使用方法:
#   bash scripts/apply_practice_schedule_id_migration.sh

set -e

MIGRATION_FILE="supabase/migrations/20251211000000_add_practice_schedule_id_to_events.sql"

echo "📋 マイグレーションファイル: $MIGRATION_FILE"
echo ""

# Supabase CLIがインストールされているか確認
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLIがインストールされていません"
  echo "   インストール: npm install -g supabase"
  exit 1
fi

# ローカルSupabaseが起動しているか確認
if supabase status | grep -q "API URL"; then
  echo "✅ ローカルSupabaseが起動しています"
  echo "📝 マイグレーションを実行します..."
  
  # マイグレーションを実行
  supabase db reset || {
    echo "❌ マイグレーションの実行に失敗しました"
    exit 1
  }
  
  echo "✅ マイグレーションが完了しました"
else
  echo "⚠️  ローカルSupabaseが起動していません"
  echo "   リモートSupabaseに直接SQLを実行する場合は、以下のコマンドを使用してください:"
  echo ""
  echo "   psql \$DATABASE_URL -f $MIGRATION_FILE"
  echo ""
  echo "   または、SupabaseダッシュボードのSQL Editorで以下を実行:"
  echo ""
  cat "$MIGRATION_FILE"
fi

