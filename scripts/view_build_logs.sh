#!/bin/bash
# EAS Buildログを確認するスクリプト

BUILD_ID="d6799a60-1b16-4bac-964a-6d1f86d69764"

echo "🔍 EAS Buildログを確認中..."
echo ""

# ビルド情報を取得
echo "📋 ビルド情報:"
eas build:view "$BUILD_ID" 2>&1 | head -20
echo ""

# WebコンソールのURL
echo "🌐 Webコンソールで確認:"
echo "https://expo.dev/accounts/izu77/projects/music-puracice2/builds/$BUILD_ID"
echo ""

# ログファイルのURLを取得
echo "📥 ログファイルのURLを取得中..."
LOG_URLS=$(eas build:view "$BUILD_ID" --json 2>/dev/null | grep -o '"https://job-logs[^"]*"' | head -1 | tr -d '"')

if [ -n "$LOG_URLS" ]; then
  echo "✅ ログファイルが見つかりました"
  echo ""
  echo "ログをダウンロードするには:"
  echo "curl -o build_log.txt \"$LOG_URLS\""
  echo ""
  echo "エラーを検索するには:"
  echo "curl -s \"$LOG_URLS\" | grep -i 'error\\|fail\\|exception'"
else
  echo "⚠️  ログファイルのURLを取得できませんでした"
  echo "Webコンソールから直接確認してください"
fi
