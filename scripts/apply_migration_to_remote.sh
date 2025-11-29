#!/bin/bash
# リモートSupabaseプロジェクトにマイグレーションを適用するスクリプト

set -e

echo "🚀 リモートSupabaseプロジェクトにマイグレーションを適用します..."

# Supabase CLIの確認
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLIがインストールされていません"
  echo "インストール方法: https://supabase.com/docs/guides/cli"
  exit 1
fi

# ログイン確認
echo "📋 Supabase CLIのログイン状態を確認中..."
if ! supabase projects list &> /dev/null; then
  echo "⚠️  Supabase CLIにログインしていません"
  echo "以下のコマンドでログインしてください:"
  echo "  supabase login"
  exit 1
fi

# プロジェクトのリンク確認
PROJECT_REF="uteeqkpsezbabdmritkn"
echo "🔗 プロジェクト ${PROJECT_REF} に接続中..."

# マイグレーションファイルの実行
MIGRATION_FILE="supabase/migrations/20251128000002_ensure_user_profiles_complete.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ マイグレーションファイルが見つかりません: $MIGRATION_FILE"
  exit 1
fi

echo "📄 マイグレーションファイル: $MIGRATION_FILE"
echo "🔄 マイグレーションを実行中..."

# Supabase CLIでリモートに接続してマイグレーションを実行
# 注意: このコマンドはプロジェクトがリンクされている必要があります
supabase db push --db-url "postgresql://postgres.${PROJECT_REF}:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres" || {
  echo ""
  echo "⚠️  自動実行に失敗しました"
  echo ""
  echo "📝 手動でマイグレーションを実行する方法:"
  echo "1. Supabaseダッシュボードにアクセス: https://supabase.com/dashboard/project/${PROJECT_REF}"
  echo "2. SQL Editorを開く"
  echo "3. 以下のファイルの内容をコピー&ペーストして実行:"
  echo "   scripts/apply_user_profiles_migration.sql"
  echo ""
  exit 1
}

echo "✅ マイグレーションが完了しました！"

