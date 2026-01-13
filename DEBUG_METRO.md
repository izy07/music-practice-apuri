# Metroデバッグガイド

## 詳細なログを確認する方法

### 1. Metroサーバーをデバッグモードで起動

```bash
cd "/Users/izuru/music-practice/music puracice2/music-practice"
DEBUG_METRO=true npx expo start --clear --web
```

これにより、以下の情報がログに表示されます：
- Web環境の検出結果
- 環境変数の値
- すべてのリクエストURL
- URL変更の前後

### 2. ブラウザの開発者ツールで確認

1. ブラウザの開発者ツールを開く（F12またはCmd+Option+I）
2. **Network**タブを開く
3. エラーが発生するページをリロード
4. `_error.bundle`のリクエストをクリック
5. **Headers**タブでリクエストURLを確認
6. **Response**タブでエラーメッセージを確認

### 3. Metroサーバーのターミナル出力を確認

Metroサーバーを実行しているターミナルに、以下のようなログが表示されます：

```
[Metro Config] Web環境検出: true
[Metro Config] 環境変数: { ... }
[Metro Middleware] リクエストURL: /node_modules/expo-router/_error.bundle?platform=web&...
[Metro Middleware] URL変更前: /node_modules/expo-router/_error.bundle?platform=web&transform.engine=hermes&...
[Metro Middleware] URL変更後: /node_modules/expo-router/_error.bundle?platform=web&...
```

### 4. エラーの根本原因を特定

エラーメッセージから、以下の情報を確認してください：

1. **リクエストURL**: Hermesパラメータが含まれているか
2. **ステータスコード**: 500エラーが発生しているか
3. **MIMEタイプ**: `application/json`が返されているか（これはエラーレスポンス）

### 5. 問題が解決しない場合

以下の情報を共有してください：
- Metroサーバーのターミナル出力（デバッグモードで実行した場合）
- ブラウザの開発者ツールのNetworkタブのスクリーンショット
- `metro.config.js`の内容
- `app.config.ts`の内容
