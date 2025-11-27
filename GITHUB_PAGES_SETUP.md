# GitHub Pages セットアップガイド

## 前提条件

1. リポジトリ名が `music-practice-apuri` であることを確認
2. GitHub Pagesが有効になっていることを確認

## セットアップ手順

### 1. GitHub Pagesの設定

1. リポジトリの **Settings** → **Pages** に移動
2. **Source** を **GitHub Actions** に設定
3. **Save** をクリック

### 2. 自動デプロイの確認

`main` ブランチにプッシュすると、自動的にGitHub Pagesにデプロイされます。

ワークフローファイル: `.github/workflows/deploy-pages.yml`

### 3. 手動デプロイ（オプション）

```bash
npm run build:web:github
npm run deploy
```

## アクセスURL

デプロイ後、以下のURLでアクセスできます：

- **メインURL**: `https://izy07.github.io/music-practice-apuri/`
- **ルートURL**: `https://izy07.github.io/music-practice-apuri/`

## トラブルシューティング

### 404エラーが発生する場合

1. **リポジトリ名の確認**
   - リポジトリ名が `music-practice-apuri` であることを確認
   - 異なる場合は、`package.json` の `build:web:github` スクリプトのベースパスを変更

2. **GitHub Pagesの設定確認**
   - Settings → Pages で **Source** が **GitHub Actions** になっているか確認
   - デプロイが完了しているか確認（Actions タブで確認）

3. **ベースパスの確認**
   - `app.config.ts` の `web.baseUrl` が正しいか確認
   - `scripts/fix-github-pages-paths.js` の `BASE_PATH` が正しいか確認

4. **404.htmlの確認**
   - `dist/404.html` が正しく生成されているか確認
   - ブラウザの開発者ツールでネットワークタブを確認

### パスが正しく解決されない場合

1. ビルドをクリーンアップして再ビルド：
```bash
rm -rf dist
npm run build:web:github
```

2. ブラウザのキャッシュをクリア

3. ハードリロード（Ctrl+Shift+R または Cmd+Shift+R）

## ベースパスの変更

リポジトリ名を変更した場合、以下のファイルを更新してください：

1. `package.json` - `build:web:github` スクリプトの `EXPO_PUBLIC_WEB_BASE`
2. `scripts/fix-github-pages-paths.js` - `BASE_PATH` のデフォルト値
3. `app.config.ts` - `web.baseUrl` のデフォルト値
4. `.github/workflows/deploy-pages.yml` - `EXPO_PUBLIC_WEB_BASE` と `GITHUB_PAGES_BASE`

## 注意事項

- GitHub Pagesは静的サイトホスティングのため、サーバーサイドの機能は使用できません
- Supabaseなどの外部APIは正常に動作します
- 認証フローはクライアントサイドで処理されます

