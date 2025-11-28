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

1. **Metro設定の確認**
   - `metro.config.js`でWebプラットフォーム用の設定が正しいか確認
   - WebプラットフォームではHermesエンジンを無効化する必要がある

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

