#!/bin/bash

# Metro bundlerのキャッシュをクリアするスクリプト

echo "🧹 Metro bundlerのキャッシュをクリア中..."

# Metro bundlerを停止（実行中の場合は手動でCtrl+Cを押してください）
echo "⚠️  Metro bundlerが実行中の場合は、Ctrl+Cで停止してください"

# キャッシュディレクトリを削除
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

echo "✅ キャッシュをクリアしました"
echo ""
echo "次のコマンドでMetro bundlerを再起動してください:"
echo "  npx expo start --clear"

