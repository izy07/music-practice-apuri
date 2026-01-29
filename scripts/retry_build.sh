#!/bin/bash
# EAS Buildを再実行してログを確認するスクリプト

echo "🔨 EAS Buildを再実行します..."
echo ""

# ビルドを実行してログをファイルに保存
echo "📝 ビルドログを build_output.log に保存します..."
eas build --platform android --profile preview 2>&1 | tee build_output.log

echo ""
echo "✅ ビルドが完了しました（成功または失敗）"
echo ""
echo "📋 エラーを検索中..."
grep -i "error\|fail\|exception" build_output.log | head -20

echo ""
echo "📋 SHA-1を検索中..."
grep -i "SHA1\|SHA-1" build_output.log | head -5

echo ""
echo "📁 完全なログは build_output.log を確認してください"
