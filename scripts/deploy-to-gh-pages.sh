#!/bin/bash
# GitHub Pagesへのデプロイスクリプト

set -e  # エラーが発生したら停止

echo "🚀 GitHub Pagesへのデプロイを開始します..."

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# 現在のブランチを保存
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 現在のブランチ: $CURRENT_BRANCH"

# mainブランチに切り替えてビルド（gh-pagesにはビルドに必要なファイルがないため）
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "🔄 mainブランチに切り替えてビルドします..."
  git checkout main || {
    echo "❌ mainブランチに切り替えられませんでした"
    exit 1
  }
fi

# ビルド
echo "📦 ビルド中..."
npm run build:web:github

# gh-pagesブランチに切り替え（存在しない場合は作成）
if git show-ref --verify --quiet refs/heads/gh-pages; then
    echo "📝 gh-pagesブランチに切り替え中..."
    git checkout gh-pages
    # 既存のファイルを削除（dist以外のファイルを残すため、.gitを除くすべて）
    find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name 'dist' -exec rm -rf {} + 2>/dev/null || true
else
    echo "📝 gh-pagesブランチを作成中..."
    git checkout --orphan gh-pages
    git rm -rf . 2>/dev/null || true
fi

# dist/ の内容をコピー
echo "📋 dist/の内容をコピー中..."
cp -r dist/* .
cp dist/.nojekyll . 2>/dev/null || echo "" > .nojekyll

# すべてをコミット
echo "💾 コミット中..."
git add .
git commit -m "Deploy to GitHub Pages $(date +%Y-%m-%d_%H:%M:%S)" || echo "変更なし、スキップ"

# プッシュ
echo "⬆️  GitHubにプッシュ中..."
git push origin gh-pages --force

# 元のブランチに戻る
echo "🔙 元のブランチ ($CURRENT_BRANCH) に戻ります..."
git checkout "$CURRENT_BRANCH" 2>/dev/null || echo "⚠️  ブランチ $CURRENT_BRANCH に戻れませんでした"

echo "✅ デプロイが完了しました！"
echo "🌐 数分待ってから https://izy07.github.io/music-practice-apuri/ にアクセスしてください"

