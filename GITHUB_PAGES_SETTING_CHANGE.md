# GitHub Pages設定変更ガイド

## ⚠️ 現在の状況

画像から確認できる設定：
- **Source**: `Deploy from a branch` (gh-pagesブランチ)
- **サイトURL**: https://izy07.github.io/music-practice-apuri/

## 🔧 問題点

新しいワークフロー (`deploy-pages.yml`) は **GitHub Actions** を使用しますが、現在の設定は **gh-pagesブランチ** を使用しています。

このままでは、新しい404エラー修正が反映されません。

## ✅ 解決方法: GitHub Actionsに変更

### ステップ1: GitHub Pagesの設定を変更

1. **リポジトリの Settings に移動**
   ```
   https://github.com/izy07/music-practice-apuri/settings/pages
   ```

2. **Build and deployment セクションを確認**
   - 現在: "Deploy from a branch" が選択されている

3. **Source を変更**
   - ドロップダウンから **"GitHub Actions"** を選択
   - **Save** ボタンをクリック

### ステップ2: 確認

設定変更後：
- ✅ 自動的に `Deploy to GitHub Pages` ワークフローが実行されます
- ✅ `main` ブランチにプッシュすると自動デプロイされます
- ✅ 新しい404エラー修正が反映されます

## 📊 変更前後の比較

### 変更前（現在）
- Source: `Deploy from a branch`
- ブランチ: `gh-pages`
- デプロイ方法: 手動（`npm run deploy`）
- 404エラー修正: 反映されない可能性

### 変更後（推奨）
- Source: `GitHub Actions`
- ブランチ: `main`（自動）
- デプロイ方法: 自動（pushで自動実行）
- 404エラー修正: ✅ 確実に反映される

## 🎯 推奨アクション

**今すぐ設定を変更してください：**

1. Settings → Pages に移動
2. Source を "GitHub Actions" に変更
3. Save をクリック

これで、新しい404エラー修正が確実に反映されます。

## ⚠️ 注意事項

- `gh-pages` ブランチは使用されなくなりますが、削除しても問題ありません
- 設定変更後、最初のデプロイは自動的に実行されます（2-5分かかります）
- デプロイ完了後、リロードしても404エラーが発生しなくなります

