# Android SHA-1取得ガイド

AndroidのクローズドテストやGoogle OAuth認証に必要なSHA-1フィンガープリントを取得する方法です。

## クイックスタート

### デバッグキーストアから取得（開発用）

```bash
./scripts/get_sha1.sh
```

または

```bash
keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey -storepass android
```

### ローカルキーストアから取得

```bash
./scripts/get_sha1.sh --local /path/to/keystore.jks
```

パスワードとエイリアスを対話的に入力します。

### EAS管理のキーストアから取得（本番用）

EAS Buildを使用している場合、以下の方法でSHA-1を取得できます：

#### 方法1: EAS Buildのビルドログから取得

```bash
eas build --platform android
```

ビルドログにSHA-1が表示されます。

#### 方法2: Google Play Consoleから取得

1. Google Play Consoleにアクセス
2. アプリ → リリース → 設定 → アプリの署名
3. 「アプリの署名証明書」セクションにSHA-1が表示されます

#### 方法3: EAS CLIで取得（EAS CLI v5.0.0以降）

```bash
eas credentials
```

## 手動で取得する方法

### デバッグキーストア

```bash
keytool -keystore ~/.android/debug.keystore \
  -list -v \
  -alias androiddebugkey \
  -storepass android
```

### 本番キーストア

```bash
keytool -keystore /path/to/production.keystore \
  -list -v \
  -alias your-key-alias
```

パスワードを入力すると、SHA-1が表示されます。

## SHA-1の登録先

取得したSHA-1は以下の場所に登録する必要があります：

### 1. Google Cloud Console（OAuth認証用）

1. https://console.cloud.google.com/ にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」
4. OAuth 2.0 クライアントIDを選択（または新規作成）
5. 「Androidアプリ」タイプを選択
6. 「SHA-1証明書フィンガープリント」に追加

### 2. Firebase Console（Firebase認証用）

1. https://console.firebase.google.com/ にアクセス
2. プロジェクトを選択
3. プロジェクト設定 → アプリ → Androidアプリ
4. 「SHA証明書フィンガープリント」に追加

### 3. Google Play Console（アプリ署名用）

1. https://play.google.com/console/ にアクセス
2. アプリを選択
3. リリース → 設定 → アプリの署名
4. 「アプリの署名証明書」セクションに表示されます（自動的に登録されます）

## 注意事項

- **デバッグキーストア**: 開発・テスト用。すべての開発者が同じSHA-1を使用します。
- **本番キーストア**: リリース用。EAS Buildを使用している場合、EASが管理します。
- **SHA-256も必要**: Google Play ConsoleではSHA-256も必要になる場合があります。同じコマンドで取得できます。

## トラブルシューティング

### キーストアが見つからない

デバッグキーストアが存在しない場合、自動的に作成されます。または手動で作成：

```bash
keytool -genkey -v \
  -keystore ~/.android/debug.keystore \
  -storepass android \
  -alias androiddebugkey \
  -keypass android \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
```

### keytoolが見つからない

Java JDKがインストールされている必要があります。macOSの場合：

```bash
# Homebrewでインストール
brew install openjdk
```

### SHA-1が表示されない

`-v`オプションを付けて詳細情報を表示：

```bash
keytool -keystore /path/to/keystore -list -v -alias your-alias
```

「証明書のフィンガープリント」または「Certificate fingerprints」セクションにSHA-1が表示されます。
