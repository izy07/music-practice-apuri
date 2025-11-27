#!/bin/bash
# GitHub Actions用データベースセットアップスクリプト

set -e

echo "🚀 GitHub Actions用データベースセットアップを開始します..."

# Supabase CLIのインストール確認
if ! command -v supabase &> /dev/null; then
  echo "📦 Supabase CLIをインストール中..."
  npm install -g supabase
fi

# Supabaseローカル環境の起動
echo "🔧 Supabaseローカル環境を起動中..."
supabase start

# データベース状態の確認
echo "📊 データベース状態:"
supabase status

# マイグレーションの実行
echo "🔄 データベースマイグレーションを実行中..."
supabase db reset

# instrumentsテーブルの確認
echo "🎹 instrumentsテーブルの確認:"
supabase db execute "
  SELECT 
    COUNT(*) as total_instruments,
    COUNT(CASE WHEN id = '550e8400-e29b-41d4-a716-446655440016' THEN 1 END) as other_instrument_exists
  FROM instruments;
" || echo "⚠️  instrumentsテーブルが存在しない可能性があります"

echo "✅ データベースセットアップが完了しました！"

