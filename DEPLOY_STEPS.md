# GitHub Pages デプロイ手順

## 🔍 現在の状況

ローカルの `dist/index.html` は修正済みですが、GitHub Pagesにはまだ古いファイルがデプロイされている可能性があります。

## ✅ デプロイ手順

### 方法1: dist/ ディレクトリを直接デプロイ

```bash
# 1. 修正済みのdist/をGitに追加
git add dist/

# 2. コミット
git commit -m "Fix GitHub Pages paths - update dist files"

# 3. GitHubにプッシュ
git push origin main
```

**注意**: リポジトリで `dist/` が `.gitignore` に含まれている場合、この方法は使えません。

### 方法2: GitHub Actionsで自動デプロイ（推奨）

`.github/workflows/deploy-pages.yml` を作成：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
    paths:
      - 'dist/**'
      - '.github/workflows/deploy-pages.yml'

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for GitHub Pages
        run: npm run build:web:github
        env:
          GITHUB_PAGES_BASE: /music-practice-apuri

      - name: Setup Pages
        uses: actions/configure-pages@v3

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

### 方法3: gh-pagesブランチに手動デプロイ

```bash
# 1. dist/を一時的にコピー
mkdir -p deploy-temp
cp -r dist/* deploy-temp/

# 2. gh-pagesブランチをチェックアウトまたは作成
git checkout --orphan gh-pages
git rm -rf .

# 3. dist/の内容をコミット
cp -r deploy-temp/* .
git add .
git commit -m "Deploy to GitHub Pages"

# 4. gh-pagesブランチにプッシュ
git push origin gh-pages --force

# 5. mainブランチに戻る
git checkout main
```

## 🔧 GitHub Pagesの設定確認

1. GitHubリポジトリの **Settings > Pages** にアクセス
2. **Source** を確認:
   - `dist/` ディレクトリをデプロイする場合: **Deploy from a branch** > **main** > **/dist**
   - `gh-pages` ブランチを使う場合: **Deploy from a branch** > **gh-pages** > **/ (root)**
3. 設定を保存

## ✅ デプロイ後の確認

1. 数分待つ（GitHub Pagesのデプロイには数分かかります）
2. ブラウザで `https://izy07.github.io/music-practice-apuri/` にアクセス
3. 開発者ツールのコンソールでエラーがないか確認
4. 以下のURLに直接アクセスしてファイルが存在するか確認:
   - `https://izy07.github.io/music-practice-apuri/_expo/static/js/web/entry-cf4c201e787c0292f4224f6b6aa1a412.js`
   - `https://izy07.github.io/music-practice-apuri/index.html` (ソース表示でパスを確認)

## ⚠️ トラブルシューティング

### まだ404エラーが出る場合

1. **ブラウザのキャッシュをクリア**: Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)
2. **シークレットモードでアクセス**: キャッシュの影響を除外
3. **GitHub Pagesのデプロイ状況を確認**: Settings > Pages > デプロイ履歴を確認
4. **ファイルが実際に存在するか確認**: 上記の直接URLアクセス

### dist/が.gitignoreに含まれている場合

`.gitignore` を編集して `dist/` を除外するか、またはGitHub Actionsを使った自動デプロイ方法（方法2）を推奨します。

