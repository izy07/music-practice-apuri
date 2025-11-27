# GitHub Pages ソース設定の変更方法

## ⚠️ 現在の状況

画像から確認できる設定：
- **現在のソース**: `Deploy from a branch`
- **ブランチ**: `gh-pages`
- **サイトURL**: https://izy07.github.io/music-practice-apuri/

## 🔧 推奨設定

新しいワークフロー (`deploy-pages.yml`) を使用するには、**GitHub Actions** に変更する必要があります。

## 📋 設定変更手順

### ステップ1: GitHub Pagesの設定を変更

1. **リポジトリの Settings に移動**
   - https://github.com/izy07/music-practice-apuri/settings/pages

2. **Build and deployment セクションを確認**
   - 現在: "Deploy from a branch" が選択されている

3. **Source を変更**
   - ドロップダウンから **"GitHub Actions"** を選択
   - **Save** ボタンをクリック

### ステップ2: 確認

設定変更後：
- ✅ 自動的に `Deploy to GitHub Pages` ワークフローが実行されます
- ✅ `main` ブランチにプッシュすると自動デプロイされます
- ✅ `gh-pages` ブランチは不要になります（削除してもOK）

## 🔄 2つの選択肢

### オプション1: GitHub Actionsに変更（推奨）

**メリット**:
- ✅ 自動デプロイ（mainブランチへのpushで自動実行）
- ✅ ビルドログが確認できる
- ✅ デプロイ履歴が管理できる
- ✅ 404.htmlが確実に生成される

**手順**:
1. Settings → Pages → Source を "GitHub Actions" に変更
2. Save をクリック

### オプション2: gh-pagesブランチを継続使用

**メリット**:
- ✅ 現在の設定を維持できる
- ✅ 手動デプロイの制御ができる

**デメリット**:
- ❌ 自動デプロイされない（手動で `npm run deploy` が必要）
- ❌ 新しい404.html修正が反映されない可能性

**手順**:
- 現在の設定を維持
- デプロイ時は `npm run deploy` を実行

## 🎯 推奨: GitHub Actionsに変更

新しいワークフローには以下の改善が含まれています：
- ✅ 404.htmlの自動生成
- ✅ .nojekyllファイルの自動生成
- ✅ ベースパスの自動設定
- ✅ リロード時の404エラー防止

## 📝 設定変更後の確認

1. **Actions タブを確認**
   - https://github.com/izy07/music-practice-apuri/actions
   - `Deploy to GitHub Pages` ワークフローが実行されているか確認

2. **デプロイ完了を待つ**
   - 通常2-5分かかります

3. **サイトにアクセス**
   - https://izy07.github.io/music-practice-apuri/
   - リロードしても404エラーが発生しないことを確認

## ⚠️ 注意事項

- `gh-pages` ブランチから `GitHub Actions` に変更すると、`gh-pages` ブランチは使用されなくなります
- 既存の `gh-pages` ブランチは削除しても問題ありません
- 設定変更後、最初のデプロイは自動的に実行されます

