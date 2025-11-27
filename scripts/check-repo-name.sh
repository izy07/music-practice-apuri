#!/bin/bash
# リポジトリ名を確認してベースパスを設定するスクリプト

# GitリポジトリのリモートURLからリポジトリ名を取得
REPO_NAME=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+)\/([^/]+)(\.git)?$/\2/' | sed 's/\.git$//')

if [ -z "$REPO_NAME" ]; then
  echo "⚠️  リポジトリ名を取得できませんでした。デフォルト値を使用します。"
  REPO_NAME="music-practice-apuri"
fi

echo "📦 リポジトリ名: $REPO_NAME"
echo "🔧 ベースパス: /$REPO_NAME"
echo ""
echo "以下の環境変数を設定してください:"
echo "  export EXPO_PUBLIC_WEB_BASE=/$REPO_NAME"
echo "  export GITHUB_PAGES_BASE=/$REPO_NAME"
echo ""
echo "または、package.jsonのbuild:web:githubスクリプトを更新してください:"
echo "  \"build:web:github\": \"EXPO_PUBLIC_WEB_BASE=/$REPO_NAME GITHUB_PAGES_BASE=/$REPO_NAME npx expo export --platform web && node scripts/fix-github-pages-paths.js\""

