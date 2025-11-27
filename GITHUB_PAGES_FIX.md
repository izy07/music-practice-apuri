# GitHub Pages 404エラー修正手順

## 📋 現在の状況

エラー:
```
GET https://izy07.github.io/music-practice-apuri/_expo/static/js/web/entry-*.js 
net::ERR_ABORTED 404 (Not Found)
```

## ✅ 修正完了

ローカルの `dist/index.html` は修正済みです。パスは以下のように変更されました：

- `/favicon.ico` → `/music-practice-apuri/favicon.ico` ✅
- `/_expo/static/js/web/entry-*.js` → `/music-practice-apuri/_expo/static/js/web/entry-*.js` ✅

## 🚀 GitHub Pagesにデプロイする手順

### 方法1: 手動でデプロイ

1. **修正されたファイルを確認**:
   ```bash
   cat dist/index.html | grep -E '(href|src)='
   ```
   以下のように表示されればOK:
   ```
   href="/music-practice-apuri/favicon.ico"
   src="/music-practice-apuri/_expo/static/js/web/entry-*.js"
   ```

2. **dist/ ディレクトリの内容をGitHubにコミット・プッシュ**:
   ```bash
   git add dist/
   git commit -m "Fix GitHub Pages paths"
   git push
   ```

3. **GitHub Pagesの設定確認**:
   - GitHubリポジトリの Settings > Pages にアクセス
   - Source が正しいブランチ/ディレクトリを指しているか確認
   - 通常は `/root` または `/dist` ディレクトリ

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

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    
    steps:
      - uses: actions/checkout@v4
      
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
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## ⚠️ 重要な注意事項

1. **ファイルが存在することを確認**:
   ```bash
   ls -la dist/_expo/static/js/web/entry-*.js
   ```
   ファイルが存在しない場合は、再度ビルドが必要です:
   ```bash
   npm run build:web:github
   ```

2. **GitHub Pagesのルートディレクトリ設定**:
   - リポジトリ名が `music-practice-apuri` の場合
   - GitHub PagesのURLは `https://izy07.github.io/music-practice-apuri/`
   - ベースパスは `/music-practice-apuri` である必要があります

3. **キャッシュのクリア**:
   - ブラウザのキャッシュをクリアして再読み込み
   - または、シークレットモードでアクセス

## 🔍 トラブルシューティング

### まだ404エラーが出る場合

1. **GitHub Pagesに正しくデプロイされているか確認**:
   - `https://izy07.github.io/music-practice-apuri/index.html` にアクセス
   - HTMLソースを表示してパスが正しいか確認

2. **ファイルが存在するか確認**:
   - `https://izy07.github.io/music-practice-apuri/_expo/static/js/web/entry-*.js` に直接アクセス
   - 404の場合は、ファイルがデプロイされていない可能性があります

3. **再度ビルドとパス修正を実行**:
   ```bash
   npm run build:web:github
   ```

4. **GitHub Pagesの設定を再確認**:
   - Settings > Pages > Source を確認
   - デプロイが完了するまで数分待つ

