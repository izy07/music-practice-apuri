#!/bin/bash
# GitHub Pagesへのデプロイスクリプト

set -e  # エラーが発生したら停止

echo "🚀 GitHub Pagesへのデプロイを開始します..."

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# 現在のブランチを保存
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 現在のブランチ: $CURRENT_BRANCH"

# 未コミットの変更をstash（存在する場合）
if ! git diff-index --quiet HEAD --; then
  echo "💾 未コミットの変更を一時保存中..."
  git stash push -m "Deploy stash $(date +%Y-%m-%d_%H:%M:%S)"
  STASHED=true
else
  STASHED=false
fi

# mainブランチに切り替えてビルド（gh-pagesにはビルドに必要なファイルがないため）
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "🔄 mainブランチに切り替えてビルドします..."
  git checkout main || {
    echo "❌ mainブランチに切り替えられませんでした"
    if [ "$STASHED" = true ]; then
      git stash pop
    fi
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

# dist/ の内容をコピー（node_modulesと不要なファイルを除外）
echo "📋 dist/の内容をコピー中..."
# まずindex.html、favicon.ico、metadata.jsonをコピー
cp dist/index.html . 2>/dev/null || true
cp dist/favicon.ico . 2>/dev/null || true
cp dist/metadata.json . 2>/dev/null || true
# 404.htmlをコピー（SPAルーティング用）- 必ず存在することを確認
if [ -f dist/404.html ]; then
  cp dist/404.html . || {
    echo "⚠️  404.htmlのコピーに失敗しました。index.htmlから作成します..."
    cp dist/index.html 404.html
  }
else
  echo "⚠️  dist/404.htmlが見つかりません。index.htmlから作成します..."
  cp dist/index.html 404.html
fi
# _expoとassetsディレクトリをコピー
cp -r dist/_expo . 2>/dev/null || true
cp -r dist/assets . 2>/dev/null || true
# .nojekyllファイルを作成（Jekyllを無効化してGitHub Pagesで静的ファイルを正しく配信）
echo "" > .nojekyll
# 404.htmlが存在することを確認
if [ ! -f 404.html ]; then
  echo "❌ 404.htmlが作成されていません。エラーです。"
  exit 1
fi
echo "✅ 404.htmlが存在することを確認しました"

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

# stashした変更を戻す（存在する場合）
if [ "$STASHED" = true ]; then
  echo "🔄 一時保存した変更を戻します..."
  git stash pop || echo "⚠️  stashの復元に失敗しました（手動で確認してください）"
fi

echo "✅ デプロイが完了しました！"
echo "🌐 数分待ってから https://izy07.github.io/music-practice-apuri/ にアクセスしてください"

