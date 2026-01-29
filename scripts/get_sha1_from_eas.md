# EAS BuildからSHA-1を取得する方法

EAS BuildのビルドログからSHA-1証明書フィンガープリントを取得する手順です。

## 手順

### 1. Androidビルドを実行

```bash
eas build --platform android --profile preview
```

または本番用のビルド：

```bash
eas build --platform android --profile production
```

### 2. ビルドログからSHA-1を確認

ビルドが開始されると、ログに以下のような情報が表示されます：

```
[RUN_GRADLEW] > Task :app:signingReport
[RUN_GRADLEW] Variant: debug
[RUN_GRADLEW] Config: debug
[RUN_GRADLEW] Store: /path/to/keystore
[RUN_GRADLEW] Alias: androiddebugkey
[RUN_GRADLEW] SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
[RUN_GRADLEW] SHA-256: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

または、以下のような形式で表示される場合もあります：

```
Certificate fingerprints:
     SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
     SHA-256: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

### 3. SHA-1をコピー

ログ内の「SHA1:」または「SHA-1:」の後に続く40文字の16進数（コロン区切り）をコピーします。

例：
```
SHA1: A1:B2:C3:D4:E5:F6:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB
```

### 4. Google Cloud Consoleに登録

1. https://console.cloud.google.com/ にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」
4. OAuth 2.0 クライアントIDを選択（または新規作成）
5. 「Androidアプリ」タイプを選択
6. 以下の情報を入力：
   - **パッケージ名**: `com.musicpractice.app`
   - **SHA-1証明書フィンガープリント**: コピーしたSHA-1

## 注意事項

- ビルドには時間がかかります（通常10-20分）
- ビルドログはEASのWebコンソールでも確認できます
- デバッグビルドとリリースビルドで異なるSHA-1が使用される場合があります
- クローズドテストには**リリースビルド（production）のSHA-1**を使用してください

## ビルドログの確認方法

### 方法1: ターミナルで確認

ビルド実行中にターミナルに表示されるログを確認します。

### 方法2: EAS Webコンソールで確認

1. https://expo.dev/accounts/[your-account]/projects/[your-project]/builds にアクセス
2. 実行中のビルドまたは完了したビルドをクリック
3. ビルドログを確認

### 方法3: ビルドログをファイルに保存

```bash
eas build --platform android --profile preview 2>&1 | tee build.log
```

その後、`build.log`ファイルからSHA-1を検索：

```bash
grep -i "SHA1\|SHA-1" build.log
```

## トラブルシューティング

### ビルドが失敗する場合

- EAS CLIが最新版か確認: `npm install -g eas-cli`
- ログイン状態を確認: `eas whoami`
- プロジェクト設定を確認: `eas.json`

### SHA-1が見つからない場合

- ビルドログ全体を確認（`grep`で検索）
- ビルドが完了しているか確認
- 別のビルドプロファイルを試す（preview → production）
