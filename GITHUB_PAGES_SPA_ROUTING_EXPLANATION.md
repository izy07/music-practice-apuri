# GitHub Pages SPAルーティングの仕組み

## 📋 なぜリロードで404エラーになるのか

GitHub Pagesは**静的ホスティングサービス**です。これは、事前にビルドされたHTMLファイルをそのまま配信するサービスです。

### 通常のWebアプリケーション（サーバーサイド）

```
ユーザー → /auth/login にアクセス
  ↓
サーバーがリクエストを処理
  ↓
適切なページを生成して返す
```

### GitHub Pages（静的ホスティング）

```
ユーザー → /auth/login にアクセス
  ↓
GitHub Pagesが /auth/login.html ファイルを探す
  ↓
ファイルが存在しない → 404エラー
```

## 🔧 解決方法

GitHub PagesでSPA（Single Page Application）を動作させるには、**404.html**を使用してすべてのリクエストを`index.html`にリダイレクトする必要があります。

### 動作の流れ

1. **ユーザーが `/auth/login` にアクセス**
   - GitHub Pagesが `/auth/login.html` を探す
   - ファイルが存在しないため、`404.html` を返す

2. **404.html内のJavaScriptが実行される**
   - 現在のパス（`/auth/login`）を検出
   - `/music-practice-apuri/index.html?_redirect=/auth/login` にリダイレクト

3. **index.htmlが読み込まれる**
   - Expo Routerがクライアントサイドでルーティング
   - `_redirect`パラメータから元のパス（`/auth/login`）を取得
   - 適切な画面に遷移

## ✅ 実装済みの対策

### 1. 404.htmlの自動生成

`scripts/create-robust-404.js`が、ビルド時に`404.html`を自動生成します。

### 2. リダイレクトスクリプト

404.html内に、すべてのパスを`index.html`にリダイレクトするJavaScriptを埋め込みます。

### 3. パス復元処理

`app/_layout.tsx`で、リダイレクト後のパスを復元してExpo Routerに伝えます。

## 🎯 期待される動作

- ✅ ルートURL（`/`）にアクセス → 正常に表示
- ✅ `/auth/login`に直接アクセス → 404.html経由でリダイレクト → 正常に表示
- ✅ `/tutorial`でリロード → 404.html経由でリダイレクト → 正常に表示
- ✅ ブックマークからアクセス → 正常に表示

## ⚠️ 注意点

- GitHub Pagesは静的ホスティングのため、サーバーサイドのルーティングはできません
- すべてのルーティングはクライアントサイド（Expo Router）で処理されます
- 404.htmlが正しく生成・デプロイされている必要があります

## 🔍 トラブルシューティング

### まだ404エラーが発生する場合

1. **404.htmlがデプロイされているか確認**
   ```bash
   curl https://izy07.github.io/music-practice-apuri/404.html
   ```

2. **ブラウザのキャッシュをクリア**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

3. **GitHub Pagesの再デプロイ**
   - Actions タブでワークフローを再実行

4. **.nojekyllファイルの確認**
   - Jekyllが無効になっている必要があります

## 📚 参考資料

- [GitHub Pages Custom 404 Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)
- [Expo Router Web Support](https://docs.expo.dev/router/introduction/)

