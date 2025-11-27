# 自動デプロイ設定手順

## 🚀 自動デプロイに変更する手順

### ステップ1: GitHub Pagesの設定を変更

1. **リポジトリの Settings に移動**
   ```
   https://github.com/izy07/music-practice-apuri/settings/pages
   ```

2. **Build and deployment セクションを確認**
   - 現在: "Deploy from a branch" (gh-pagesブランチ)

3. **Source を変更**
   - ドロップダウンから **"GitHub Actions"** を選択
   - **Save** ボタンをクリック

### ステップ2: 自動デプロイの確認

設定変更後、以下が自動的に実行されます：

1. **GitHub Actionsが自動実行**
   - `main` ブランチへのpushで自動デプロイ
   - ワークフロー: `Deploy to GitHub Pages`

2. **デプロイ完了を待つ**
   - 通常2-5分かかります
   - Actions タブで進行状況を確認できます

3. **サイトにアクセス**
   - https://izy07.github.io/music-practice-apuri/
   - リロードしても404エラーが発生しないことを確認

## ✅ 自動デプロイのメリット

- ✅ `main` ブランチにpushするだけで自動デプロイ
- ✅ 404エラー修正が確実に反映される
- ✅ ビルドログが確認できる
- ✅ デプロイ履歴が管理できる
- ✅ 手動デプロイが不要

## 📋 今後のデプロイ方法

### 自動デプロイ（推奨）

```bash
# 変更をコミット
git add .
git commit -m "変更内容"
git push origin main
```

これだけで自動的にデプロイされます！

### デプロイ状況の確認

1. **Actions タブ**
   - https://github.com/izy07/music-practice-apuri/actions
   - `Deploy to GitHub Pages` ワークフローの実行状況を確認

2. **Settings → Pages**
   - 最後のデプロイ時刻を確認
   - サイトURLを確認

## 🔧 トラブルシューティング

### GitHub Actionsが実行されない場合

1. **Settings → Pages の確認**
   - Source が "GitHub Actions" になっているか確認

2. **Actions タブの確認**
   - ワークフローが有効になっているか確認
   - エラーがないか確認

3. **権限の確認**
   - Settings → Actions → General
   - "Workflow permissions" が正しく設定されているか確認

### デプロイが失敗する場合

1. **Actions タブでエラーを確認**
   - 失敗したワークフローをクリック
   - エラーメッセージを確認

2. **ローカルでビルドをテスト**
   ```bash
   npm run build:web:github
   ```

3. **ログを確認**
   - Actions タブで各ステップのログを確認

## 🎯 設定変更後の動作

### 変更前
- ❌ 手動で `npm run deploy` を実行する必要がある
- ❌ `gh-pages` ブランチを管理する必要がある
- ❌ 404エラー修正が反映されない可能性

### 変更後
- ✅ `main` ブランチにpushするだけで自動デプロイ
- ✅ `gh-pages` ブランチは不要（削除してもOK）
- ✅ 404エラー修正が確実に反映される

## 📝 チェックリスト

- [ ] Settings → Pages → Source を "GitHub Actions" に変更
- [ ] Save をクリック
- [ ] Actions タブでワークフローが実行されているか確認
- [ ] デプロイ完了を待つ（2-5分）
- [ ] サイトにアクセスして動作確認

