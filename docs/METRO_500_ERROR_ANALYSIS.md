# Metro Bundler 500エラー詳細分析

## エラーメッセージ

```
GET http://localhost:8081/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable 
net::ERR_ABORTED 500 (Internal Server Error)

Refused to execute script because its MIME type ('application/json') is not executable
```

## 根本原因

### 1. Hermesパラメータの問題
- URLに`transform.engine=hermes`と`unstable_transformProfile=hermes-stable`が含まれている
- **WebプラットフォームではHermesエンジンを使用できない**
- MetroがWebでHermesを使用しようとしてエラーが発生
- エラーレスポンスがJSON形式で返され、MIMEタイプが`application/json`になる

### 2. エラーの発生フロー
1. Expo RouterがWebプラットフォームでもHermesパラメータを含むURLを生成
2. ブラウザがそのURLでバンドルをリクエスト
3. MetroサーバーがWebプラットフォームでHermesを使用しようとしてエラー
4. エラーレスポンス（JSON形式）が返される
5. ブラウザが`application/json`のMIMEタイプでJavaScriptとして実行しようとして失敗

## 修正内容

### 1. `metro.config.js`の改善

#### a) プラットフォーム検出の強化
```javascript
const isWeb = 
  process.env.EXPO_PLATFORM === 'web' || 
  process.env.EXPO_PUBLIC_PLATFORM === 'web' ||
  process.platform === 'web' ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && typeof window !== 'undefined');
```

#### b) Hermesの完全無効化
```javascript
if (isWeb) {
  config.transformer = config.transformer || {};
  config.transformer.unstable_allowRequireContext = true;
  config.transformer.babelTransformerPath = require.resolve('metro-react-native-babel-transformer');
}
```

#### c) `rewriteRequestUrl`の改善
- URL解析に依存せず、文字列操作で確実にHermesパラメータを削除
- 正規表現を使用して複数のパターンに対応
- デバッグ用のログ出力を追加

```javascript
rewriteRequestUrl: (url) => {
  if (url.includes('.bundle') || url.includes('/node_modules/') || url.includes('entry.bundle')) {
    let cleanedUrl = url;
    
    // transform.engine=hermes を削除
    cleanedUrl = cleanedUrl.replace(/[?&]transform\.engine=hermes(&|$)/g, (match, suffix) => {
      return suffix === '&' ? '&' : '';
    });
    
    // unstable_transformProfile=hermes-stable を削除
    cleanedUrl = cleanedUrl.replace(/[?&]unstable_transformProfile=hermes-stable(&|$)/g, (match, suffix) => {
      return suffix === '&' ? '&' : '';
    });
    
    // 末尾の&や?を削除
    cleanedUrl = cleanedUrl.replace(/[?&]$/, '');
    cleanedUrl = cleanedUrl.replace(/\?&/, '?');
    
    if (cleanedUrl !== url) {
      console.log('[Metro] Removed Hermes params:', url, '->', cleanedUrl);
    }
    
    return cleanedUrl;
  }
  // ... 他の処理
}
```

### 2. `app.config.ts`の修正
```typescript
web: {
  bundler: 'metro', // WebプラットフォームでもMetroを使用することを明示
  // ...
}
```

## 解決手順

### ステップ1: 既存のプロセスを停止
```bash
# ポート8081を使用しているプロセスを確認
lsof -ti:8081

# プロセスを停止
kill -9 $(lsof -ti:8081) 2>/dev/null || true
```

### ステップ2: キャッシュを完全にクリア
```bash
# Metroキャッシュをクリア
rm -rf .metro
rm -rf .expo
rm -rf node_modules/.cache

# ブラウザのキャッシュもクリア
# 開発者ツールで「キャッシュの無効化とハード再読み込み」を実行
```

### ステップ3: 再起動
```bash
# クリーンな状態で起動
npx expo start --web --clear
```

### ステップ4: エラーが続く場合
```bash
# 完全にクリーンアップ
rm -rf node_modules
rm -rf .expo
rm -rf .metro
npm install
npx expo start --web --clear
```

## 確認事項

### 1. Metroサーバーのログを確認
ターミナルに表示されるエラーメッセージを確認：
- どのファイルでエラーが発生しているか
- エラーの種類（構文エラー、型エラーなど）

### 2. ブラウザの開発者ツールで確認
- ネットワークタブでリクエストURLを確認
- Hermesパラメータが削除されているか確認
- レスポンスのMIMEタイプを確認

### 3. 型エラーの確認
```bash
# TypeScriptの型チェック
tsc --noEmit
```

## トラブルシューティング

### 問題: `rewriteRequestUrl`が呼ばれない
- Metroサーバーが正しく起動しているか確認
- `metro.config.js`の構文エラーがないか確認
- 環境変数`EXPO_PLATFORM=web`が設定されているか確認

### 問題: Hermesパラメータが残る
- ブラウザのキャッシュをクリア
- Metroサーバーを再起動
- `rewriteRequestUrl`のログ出力を確認

### 問題: 500エラーが続く
- Metroサーバーのターミナル出力でエラーの詳細を確認
- 型エラーや構文エラーがないか確認
- 循環依存がないか確認

## 参考情報

- [Expo Metro Config Documentation](https://docs.expo.dev/guides/customizing-metro/)
- [Metro Bundler Configuration](https://metrobundler.dev/docs/configuration)
- [Expo Router Web Support](https://docs.expo.dev/router/introduction/)

