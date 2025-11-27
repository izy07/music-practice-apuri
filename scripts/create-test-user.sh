#!/bin/bash
# テストユーザー作成スクリプト（開発環境専用）

set -e

echo "🧪 テストユーザーを作成します..."

# Supabaseが起動しているか確認
if ! npx supabase status > /dev/null 2>&1; then
  echo "❌ Supabaseが起動していません。先に 'npx supabase start' を実行してください。"
  exit 1
fi

# テストユーザーを作成
echo "📝 テストユーザーを作成中..."
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/create_test_user.sql

echo ""
echo "✅ テストユーザー作成完了！"
echo ""
echo "📧 メールアドレス: test@example.com"
echo "🔑 パスワード: testpassword123"
echo ""
echo "💡 ログインして動作を確認してください。"

