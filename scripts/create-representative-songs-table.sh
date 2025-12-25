#!/bin/bash
# representative_songsテーブルを作成するスクリプト
# ⚠️ 注意: このスクリプトは非推奨です
# representative_songsテーブルは統合マイグレーションファイル（20251219000000_initial_schema.sql）に含まれています
# 使用方法: supabase db reset を実行してください

set -e

echo "⚠️  このスクリプトは非推奨です"
echo "📋 representative_songsテーブルは統合マイグレーションファイルに含まれています"
echo "📝 使用方法: supabase db reset を実行してください"
echo ""

# 統合マイグレーションファイルが存在することを確認
if [ -f "supabase/migrations/20251219000000_initial_schema.sql" ]; then
  echo "✅ 統合マイグレーションファイルが見つかりました"
  echo "📝 supabase db reset を実行すると、representative_songsテーブルも作成されます"
else
  echo "❌ 統合マイグレーションファイルが見つかりません"
  exit 1
fi

