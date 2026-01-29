# SHA-1取得の代替方法

EAS Buildが失敗している場合、以下の代替方法でSHA-1を取得できます。

## 方法1: Google Play Consoleから取得（最も簡単・推奨）

既にアプリをGoogle Play Consoleにアップロードしている場合：

1. Google Play Consoleにアクセス
2. アプリ → リリース → 設定 → アプリの署名
3. 「アプリの署名証明書」セクションにSHA-1が表示されます

**注意**: これは本番用のSHA-1です。開発用のSHA-1とは異なる場合があります。

## 方法2: Javaをインストールしてローカルで取得

### macOSでJavaをインストール

```bash
# Homebrewでインストール
brew install openjdk

# または、Oracle JDKをインストール
brew install --cask oracle-jdk
```

### デバッグキーストアからSHA-1を取得

```bash
# デバッグキーストアが存在しない場合は作成
mkdir -p ~/.android
keytool -genkeypair -v \
  -keystore ~/.android/debug.keystore \
  -storepass android \
  -alias androiddebugkey \
  -keypass android \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"

# SHA-1を取得
keytool -keystore ~/.android/debug.keystore \
  -list -v \
  -alias androiddebugkey \
  -storepass android | grep -E "(SHA1|SHA-1)"
```

## 方法3: EAS Buildのエラーを解決して再実行

EAS BuildのPrebuildエラーを解決する必要があります。

### よくある原因と解決方法

1. **プラグイン設定エラー**
   - `app.config.ts`のプラグイン設定を確認
   - 特に`react-native-google-mobile-ads`の設定

2. **ファイルパスの問題**
   - アイコンファイルのパスを確認
   - すべてのアセットファイルが存在するか確認

3. **環境変数の問題**
   - 必要な環境変数が設定されているか確認

### デバッグ方法

```bash
# ローカルでprebuildを実行してエラーを確認
npx expo prebuild --platform android --no-install

# EAS Buildのログを確認
eas build:view [BUILD_ID]
```

## 方法4: 一時的にプラグインを無効化してビルド

問題のあるプラグインを一時的に無効化して、ビルドが成功するか確認：

```typescript
// app.config.ts
plugins: [
  'expo-router', 
  'expo-font', 
  'expo-dev-client',
  'expo-asset',
  'expo-audio',
  'expo-web-browser',
  // 一時的にコメントアウト
  // [
  //   'react-native-google-mobile-ads',
  //   { ... }
  // ],
  [
    'expo-notifications',
    { ... }
  ],
],
```

ビルドが成功したら、プラグインの設定を修正して再度有効化します。
