# GitHub Pages 手動デプロイ手順

## 📋 前提条件

- `dist/` ディレクトリが既にビルド済み
- 修正済みのパスが適用されている

## ✅ 方法1: gh-pages ブランチに直接プッシュ（最も簡単）

### ステップ1: gh-pages ブランチを準備

```bash
# 現在のブランチを確認
git branch

# 現在のブランチが main であることを確認してから実行
cd "/Users/izuru/music-practice/music puracice2/music-practice"

# gh-pagesブランチが存在しない場合、新規作成
git checkout --orphan gh-pages

# 既存のファイルを削除（新規ブランチなので空から始める）
git rm -rf .

# dist/ の内容をコピー（現在のディレクトリに）
cp -r dist/* .

# すべてのファイルをステージング
git add .

# コミット
git commit -m "Deploy to GitHub Pages"

# gh-pagesブランチにプッシュ
git push origin gh-pages --force

# mainブランチに戻る
git checkout main
```

### ステップ2: GitHub Pagesの設定

1. GitHubリポジトリにアクセス: `https://github.com/izy07/music-practice-apuri`
2. **Settings** > **Pages** に移動
3. **Source** を **Deploy from a branch** に設定
4. **Branch** を **gh-pages** に設定
5. **Folder** を **/ (root)** に設定
6. **Save** をクリック

### ステップ3: 確認

- 数分待つ（デプロイには数分かかります）
- `https://izy07.github.io/music-practice-apuri/` にアクセス
- 開発者ツールのコンソールでエラーがないか確認

---

## ✅ 方法2: GitHub CLIを使用（推奨）

### ステップ1: GitHub CLIのインストール（未インストールの場合）

```bash
# macOSの場合
brew install gh

# 認証
gh auth login
```

### ステップ2: デプロイ

```bash
cd "/Users/izuru/music-practice/music puracice2/music-practice"

# ビルド（既に完了している場合はスキップ）
npm run build:web:github

# GitHub Pagesにデプロイ
gh-pages -d dist -r https://github.com/izy07/music-practice-apuri.git
```

**注意**: `gh-pages` パッケージをインストールする必要がある場合:
```bash
npm install --save-dev gh-pages
```

---

## ✅ 方法3: 手動でファイルをアップロード

### ステップ1: dist/ をzipで圧縮

```bash
cd "/Users/izuru/music-practice/music puracice2/music-practice"
cd dist
zip -r ../dist-for-github.zip .
cd ..
```

### ステップ2: GitHubでアップロード

1. GitHubリポジトリにアクセス
2. **Add file** > **Upload files** をクリック
3. `dist-for-github.zip` を解凍した内容をアップロード
   - または、**Create new file** で手動でファイルを作成
4. **Commit changes** をクリック

**注意**: この方法は `dist/` が `.gitignore` に含まれているため、推奨しません。

---

## 🔧 トラブルシューティング

### gh-pagesブランチが見つからないエラー

```bash
# リモートのブランチを確認
git fetch origin
git branch -r

# gh-pagesブランチが存在しない場合は、方法1の手順で新規作成
```

### 権限エラー

```bash
# GitHubの認証を確認
gh auth status

# 再認証
gh auth login
```

### パスが正しくない

```bash
# パス修正スクリプトを再実行
cd "/Users/izuru/music-practice/music puracice2/music-practice"
GITHUB_PAGES_BASE=/music-practice-apuri node scripts/fix-github-pages-paths.js

# その後、再度デプロイ
```

---

## 🚀 今すぐデプロイするコマンド（方法1の簡易版）

以下のコマンドを順番に実行してください:

```bash
cd "/Users/izuru/music-practice/music puracice2/music-practice"

# 1. ビルド（パス修正も実行）
npm run build:web:github

# 2. gh-pagesブランチに切り替え（存在しない場合は作成）
git checkout --orphan gh-pages 2>/dev/null || git checkout gh-pages

# 3. 既存のファイルを削除（新規ブランチの場合のみ）
git rm -rf . 2>/dev/null || true

# 4. dist/ の内容をコピー
cp -r dist/* .

# 5. すべてをコミット
git add .
git commit -m "Deploy to GitHub Pages $(date +%Y-%m-%d)"

# 6. プッシュ
git push origin gh-pages --force

# 7. mainブランチに戻る
git checkout main
```

**注意**: このコマンドを実行する前に、変更をコミットしていないことを確認してください。

