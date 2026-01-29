#!/bin/bash
# EAS Buildをテスト実行するスクリプト

echo "🔨 EAS Buildをテスト実行します..."
echo ""

# 設定を確認
echo "📋 設定確認:"
echo "  - Expo SDK: $(npx expo config --type public 2>&1 | grep 'sdkVersion' | head -1)"
echo "  - Slug: $(npx expo config --type public 2>&1 | grep 'slug' | head -1)"
echo ""

# ビルドを実行
echo "🚀 ビルドを開始します..."
eas build --platform android --profile preview --non-interactive 2>&1 | tee build_test.log

echo ""
echo "✅ ビルドが完了しました"
echo ""
echo "📋 エラーを検索中..."
grep -i "error\|fail\|exception" build_test.log | head -20

echo ""
echo "📁 完全なログは build_test.log を確認してください"
