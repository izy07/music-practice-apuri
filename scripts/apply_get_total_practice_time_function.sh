#!/bin/bash

# 総練習時間取得RPC関数を適用するスクリプト
# ⚠️ 注意: このスクリプトは非推奨です
# get_total_practice_time関数は統合マイグレーションファイル（20251219000000_initial_schema.sql）に含まれています
# 使用方法: supabase db reset を実行してください

echo "=========================================="
echo "総練習時間取得RPC関数の適用"
echo "=========================================="
echo ""
echo "⚠️  このスクリプトは非推奨です"
echo "📋 get_total_practice_time関数は統合マイグレーションファイルに含まれています"
echo "📝 使用方法: supabase db reset を実行してください"
echo ""

# 統合マイグレーションファイルが存在することを確認
if [ -f "supabase/migrations/20251219000000_initial_schema.sql" ]; then
  echo "✅ 統合マイグレーションファイルが見つかりました"
  echo "📝 supabase db reset を実行すると、get_total_practice_time関数も作成されます"
  
  # 関数が含まれているか確認
  if grep -q "get_total_practice_time" "supabase/migrations/20251219000000_initial_schema.sql" 2>/dev/null; then
    echo "✅ get_total_practice_time関数が統合マイグレーションファイルに含まれています"
  else
    echo "⚠️  get_total_practice_time関数が統合マイグレーションファイルに見つかりません"
    echo "📝 統合マイグレーションファイルに追加する必要があります"
  fi
else
  echo "❌ 統合マイグレーションファイルが見つかりません"
  exit 1
fi






