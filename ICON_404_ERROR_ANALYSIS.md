# icon.png 404エラー分析と解決策

## 🔍 エラー内容
```
GET http://localhost:8081/assets/images/icon.png 404 (Not Found)
```

## 📋 問題の原因

### 1. アセットファイルの存在確認
- ✅ `assets/images/icon.png` は存在する
- ✅ ファイルパスは正しい

### 2. 参照箇所の確認
以下の場所で`icon.png`が参照されています：

1. **`web/index.html`** (8-9行目)
   ```html
   <link rel="icon" type="image/png" href="/assets/images/icon.png" />
   ```

2. **`lib/notificationService.ts`** (232-233行目)
   ```typescript
   icon: '/assets/images/icon.png',
   badge: '/assets/images/icon.png',
   ```

3. **`app.config.ts`** (16, 24, 38行目)
   - Android adaptiveIcon: `'./assets/images/icon.png'`
   - Web favicon: `'./assets/images/favicon.png'`
   - expo-notifications plugin: `'./assets/images/icon.png'`

### 3. 根本原因

**Expo Webの開発サーバーでは、`assets`ディレクトリのファイルはMetro bundlerによって処理され、`/_expo/static/`配下に配置されます。**

- 開発環境: `/_expo/static/assets/images/icon.png` または Metro bundler経由
- 本番環境（ビルド後）: `/assets/images/icon.png`

現在のコードでは、開発環境で`/assets/images/icon.png`を直接参照しているため、404エラーが発生しています。

## ✅ 実装した解決策

### 1. `web/index.html`の修正
- JavaScriptで動的にパスを解決
- 開発環境では`/_expo/static/assets/images/icon.png`を使用
- 本番環境では`/assets/images/icon.png`を使用
- エラーハンドリング（onerror）を追加

### 2. `lib/notificationService.ts`の修正
- アイコンパスを動的に解決する関数を追加
- 開発環境と本番環境で異なるパスを使用

### 3. `metro.config.js`の修正
- `/assets/`パスの処理を改善
- 開発環境でのアセット提供をサポート

## 📝 追加の推奨事項

### エラーを完全に解決するには：

1. **開発サーバーの再起動**
   ```bash
   npm start -- --clear
   ```

2. **アセットの確認**
   - `assets/images/icon.png`が存在することを確認
   - ファイルサイズが0バイトでないことを確認

3. **ブラウザキャッシュのクリア**
   - ブラウザのキャッシュをクリアして再読み込み

4. **代替案: publicディレクトリの使用**
   - `public/images/icon.png`にコピー（既に実装済み）
   - この場合、`/images/icon.png`でアクセス可能

## ⚠️ 注意事項

- このエラーは開発環境でのみ発生する可能性が高い
- 本番環境（ビルド後）では通常問題ありません
- エラー自体は機能に影響しませんが、コンソールに表示されるため修正を推奨

## 🔄 次のステップ

1. 開発サーバーを再起動
2. ブラウザで確認（エラーが解消されているか）
3. まだエラーが表示される場合は、ブラウザのキャッシュをクリア

