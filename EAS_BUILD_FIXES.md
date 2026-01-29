# EAS Buildエラー修正内容

## 実施した修正

### 1. `eas.json`の更新
- `cli.appVersionSource: "remote"`を追加
- これにより、EAS Buildの警告を解消

### 2. `.gitignore`の更新
- `android/`と`ios/`ディレクトリを追加
- EAS Buildはmanaged workflowなので、これらのディレクトリは不要
- 誤ってコミットされないようにするため

## 次のステップ

### ビルドを再実行

```bash
eas build --platform android --profile preview
```

または、テストスクリプトを使用：

```bash
./scripts/test_eas_build.sh
```

### エラーが続く場合

1. **Webコンソールでログを確認**
   - ビルドページのURLを開く
   - エラーメッセージを確認

2. **ローカルでprebuildをテスト**
   ```bash
   npx expo prebuild --platform android --clean
   ```

3. **プラグイン設定を確認**
   - `app.config.ts`のプラグイン設定
   - 特に`react-native-google-mobile-ads`の設定

## よくある問題

### プラグイン設定エラー
- プラグインの設定が正しいか確認
- 必要な環境変数が設定されているか確認

### ファイルパスの問題
- アイコンファイルのパスが正しいか確認
- すべてのアセットファイルが存在するか確認

### 環境変数の問題
- EAS Buildの環境変数設定を確認
- 必要な環境変数が設定されているか確認
