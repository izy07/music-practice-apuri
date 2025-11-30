# Metro Bundler 500エラーの対処方法

## エラーの原因
- Metro bundlerがバンドルを生成する際にエラーが発生
- MIMEタイプが'application/json'になっている（通常は'application/javascript'であるべき）
- **WebプラットフォームでHermesエンジンが使用されている**（Webでは不要）
  - エラーURLに`transform.engine=hermes`パラメータが含まれている
  - HermesはReact Native（iOS/Android）専用で、Webでは使用できない

## 対処手順

### 0. Metro設定の確認（重要）
`metro.config.js`でWebプラットフォーム用の設定が正しく行われているか確認してください。
特に、WebプラットフォームではHermesエンジンを無効化する必要があります。

### 1. 既存のMetro bundlerプロセスを停止
```bash
# ポート8081を使用しているプロセスを確認
lsof -ti:8081

# プロセスを停止（PIDを確認してから）
kill -9 <PID>
```

### 2. キャッシュをクリアして再起動
```bash
cd music-practice
npx expo start --clear
```

### 3. それでも解決しない場合
```bash
# node_modulesとキャッシュを完全にクリア
rm -rf node_modules
rm -rf .expo
rm -rf .metro
npm install
npx expo start --clear
```

### 4. エラーの詳細を確認
Metro bundlerのターミナル出力で、実際のエラーメッセージを確認してください。
通常、以下のような情報が表示されます：
- どのファイルでエラーが発生しているか
- エラーの種類（構文エラー、型エラーなど）

## よくある原因
1. **型エラー**: TypeScriptの型チェックでエラーが発生している
2. **循環依存**: ファイル間の循環参照
3. **インポートエラー**: 存在しないモジュールのインポート
4. **構文エラー**: JavaScript/TypeScriptの構文ミス

## 確認すべきファイル
最近変更したファイル：
- `app/attendance.tsx`
- `app/calendar.tsx`
- `app/(tabs)/share.tsx`

これらのファイルで型エラーや構文エラーがないか確認してください。

## Webプラットフォーム特有の問題

### Hermesエンジンの問題
Webプラットフォームで`transform.engine=hermes`パラメータが含まれている場合、以下の対処を行ってください：

1. **Metro設定の確認（修正済み）**
   - `metro.config.js`でWebプラットフォーム用の設定が正しく行われています
   - `rewriteRequestUrl`関数で、バンドルリクエストからHermesパラメータを自動的に削除します
   - WebプラットフォームではHermesエンジンを無効化し、Babelパーサーを使用します

2. **キャッシュの完全クリア**
   ```bash
   # すべてのキャッシュをクリア
   rm -rf .expo
   rm -rf .metro
   rm -rf node_modules/.cache
   npx expo start --web --clear
   ```

3. **ブラウザのキャッシュクリア**
   - ブラウザの開発者ツールで「キャッシュの無効化とハード再読み込み」を実行
   - または、シークレットモードでアクセス

4. **ポートの確認**
   - 他のプロセスがポート8081を使用していないか確認
   ```bash
   lsof -ti:8081
   ```

## 修正内容（2024年最新）

### Metro設定の改善
`metro.config.js`に以下の修正を加えました：

1. **Hermesパラメータの自動削除**
   - `rewriteRequestUrl`関数で、バンドルリクエストURLから`transform.engine=hermes`と`unstable_transformProfile=hermes-stable`パラメータを自動的に削除
   - これにより、WebプラットフォームでHermesエンジンが使用されることを防ぎます

2. **Transformer設定の明示化**
   - Webプラットフォームでは`babelTransformerPath`を明示的に指定
   - Hermesパーサーの代わりにBabelパーサーを使用

3. **プラットフォーム検出の改善**
   - `process.env.EXPO_PLATFORM`と`process.env.EXPO_PUBLIC_PLATFORM`の両方をチェック

### エラーの根本原因
- Expo RouterがWebプラットフォームでもHermesパラメータを含むURLを生成していた
- MetroバンドラーがWebプラットフォームでHermesエンジンを使用しようとしてエラーが発生
- エラーレスポンスがJSON形式で返され、MIMEタイプが`application/json`になっていた

### 解決方法
修正後の`metro.config.js`により、以下の処理が自動的に行われます：
1. Webプラットフォームを検出
2. バンドルリクエストURLからHermesパラメータを削除
3. Babelパーサーを使用してバンドルを生成

これにより、Webプラットフォームでの500エラーとMIMEタイプエラーが解決されます。

