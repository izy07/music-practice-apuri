# GitHub Pages デプロイエラー修正ガイド

## 🔍 問題の原因

GitHub Pagesで公開したアプリで以下のエラーが発生：

```
GET https://izy07.github.io/music-practice-apuri/_expo/static/js/web/entry-*.js 
net::ERR_ABORTED 404 (Not Found)
```

### 原因

1. **パスの不一致**: Expo Webアプリは絶対パス（`/_expo/static/...`）でリソースを参照
2. **GitHub Pagesのベースパス**: リポジトリ名が `music-practice-apuri` の場合、URLは `/music-practice-apuri/` がベースパスになる
3. **結果**: ブラウザは `/music-practice-apuri/_expo/static/...` を探すが、HTMLは `/_expo/static/...` を参照しているため404エラー

## ✅ 解決方法

### 方法1: ビルド後にパスを修正（推奨）

GitHub Pages用のビルドコマンドを使用：

```bash
npm run build:web:github
```

このコマンドは以下を実行します：
1. Expo Webアプリをビルド（`expo export --platform web`）
2. ビルド後のHTMLとメタデータファイルのパスを自動修正

### 方法2: 手動で修正スクリプトを実行

```bash
# 通常のビルド
npm run build:web

# パス修正スクリプトを実行
GITHUB_PAGES_BASE=/music-practice-apuri node scripts/fix-github-pages-paths.js
```

## 🔧 スクリプトの動作

`scripts/fix-github-pages-paths.js` は以下を修正します：

1. **index.html**: 
   - `/favicon.ico` → `/music-practice-apuri/favicon.ico`
   - `/_expo/static/...` → `/music-practice-apuri/_expo/static/...`

2. **metadata.json**:
   - バンドルとアセットのパスを修正

## 📝 環境変数

`GITHUB_PAGES_BASE` 環境変数でベースパスを指定できます：

```bash
# デフォルト: /music-practice-apuri
GITHUB_PAGES_BASE=/your-repo-name node scripts/fix-github-pages-paths.js
```

## 🚀 デプロイ手順

1. **GitHub Pages用にビルド**:
   ```bash
   npm run build:web:github
   ```

2. **dist/ ディレクトリをGitHub Pagesにデプロイ**:
   - GitHub Actionsを使用する場合: ワークフローで `build:web:github` を実行
   - 手動デプロイの場合: `dist/` の内容を `gh-pages` ブランチにプッシュ

3. **GitHub Pagesの設定確認**:
   - Settings > Pages > Source で正しいブランチ/ディレクトリを選択

## ⚠️ 注意事項

- ビルド後は `dist/` ディレクトリ内のファイルが修正されます
- 修正スクリプトは複数回実行しても安全です（既に修正済みのパスはスキップ）
- リポジトリ名を変更した場合は、`GITHUB_PAGES_BASE` 環境変数を更新してください

## 🔍 トラブルシューティング

### 404エラーが続く場合

1. **ブラウザのキャッシュをクリア**して再読み込み
2. **正しいベースパス**が設定されているか確認：
   ```bash
   cat dist/index.html | grep -E '(href|src)='
   ```
3. **GitHub PagesのURL**が正しいか確認（リポジトリ名と一致しているか）

### パスが正しく修正されない場合

1. スクリプトを手動で実行してエラーを確認：
   ```bash
   node scripts/fix-github-pages-paths.js
   ```
2. `dist/index.html` を開いてパスが正しく修正されているか確認

