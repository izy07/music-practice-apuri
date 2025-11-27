#!/bin/bash
# テストユーザーをリセットするスクリプト（削除→再作成）

set -e

echo "🔄 テストユーザーをリセットします..."

# Supabaseが起動しているか確認
if ! npx supabase status > /dev/null 2>&1; then
  echo "❌ Supabaseが起動していません。先に 'npx supabase start' を実行してください。"
  exit 1
fi

# 既存のテストユーザーを削除
echo "🗑️  既存のテストユーザーを削除中..."
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/delete_test_user.sql > /dev/null 2>&1 || true

# 少し待つ
sleep 0.5

# 新しいテストユーザーを作成
echo "📝 新しいテストユーザーを作成中..."
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/create_test_user.sql

echo ""
echo "✅ テストユーザーのリセットが完了しました！"
echo ""
echo "📧 メールアドレス: test@example.com"
echo "🔑 パスワード: testpassword123"
echo ""
echo "💡 ログイン画面からログインしてください（新規登録ではなく）。"

