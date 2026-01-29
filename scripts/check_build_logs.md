# EAS Buildログの確認方法

## 方法1: Webコンソールで確認（最も簡単）

1. 以下のURLをブラウザで開く：
   ```
   https://expo.dev/accounts/izu77/projects/music-puracice2/builds/d6799a60-1b16-4bac-964a-6d1f86d69764
   ```

2. ビルドページが開いたら：
   - ページ下部の「Logs」セクションを確認
   - 「Prebuild build phase」のエラーメッセージを探す
   - エラーメッセージをコピーして確認

## 方法2: EAS CLIコマンドでログを取得

### ビルド情報を確認
```bash
eas build:view d6799a60-1b16-4bac-964a-6d1f86d69764
```

### ログを直接表示
```bash
eas build:view d6799a60-1b16-4bac-964a-6d1f86d69764 --logs
```

### ログをファイルに保存
```bash
eas build:view d6799a60-1b16-4bac-964a-6d1f86d69764 --logs > build_logs.txt
```

その後、エラーを検索：
```bash
grep -i "error\|fail\|exception" build_logs.txt
```

## 方法3: 最新のビルドログを確認

```bash
# 最新のビルド一覧を表示
eas build:list --platform android --limit 1

# 最新のビルドIDを取得してログを表示
eas build:view [BUILD_ID] --logs
```

## ログで確認すべきポイント

1. **Prebuild build phase**のエラー
   - プロジェクト設定の問題
   - プラグインの設定エラー
   - ファイルパスの問題

2. **SHA-1情報**（ビルドが成功した場合）
   - `SHA1:` または `SHA-1:` で検索
   - 証明書フィンガープリントの情報

3. **Gradleビルドエラー**
   - Android固有の設定問題
   - 依存関係の競合

## よくあるエラーパターン

### アイコンファイルが見つからない
```
Error: Cannot find module './assets/images/icon.png'
```
→ アイコンファイルのパスを確認

### プラグイン設定エラー
```
Error: Plugin configuration error
```
→ `app.config.ts`のプラグイン設定を確認

### プロジェクト名の不一致
```
Error: Project slug mismatch
```
→ `app.config.ts`の`slug`を確認
