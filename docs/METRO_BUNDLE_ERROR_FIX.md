# Metro Bundler 500エラー修正ガイド

## エラーの詳細

```
GET http://localhost:8081/node_modules/expo-router/entry.bundle?... 
net::ERR_ABORTED 500 (Internal Server Error)

Refused to execute script because its MIME type ('application/json') is not executable
```

## 原因分析

1. **MIMEタイプエラー**: バンドルが`application/json`として返されている
   - 通常は`application/javascript`であるべき
   - Metroサーバーがエラーレスポンス（JSON形式）を返している可能性

2. **Hermesパラメータの問題**: URLに`transform.engine=hermes`が含まれている
   - WebプラットフォームではHermesエンジンを使用できない
   - MetroがWebでHermesを使用しようとしてエラーが発生

3. **バンドラー設定の競合**: Web環境でMetroとWebpackの設定が競合している可能性

## 修正内容

### 1. `app.config.ts`の修正
- `web.bundler: 'metro'`を明示的に指定
- WebプラットフォームでもMetroを使用することを明確化

### 2. `metro.config.js`の改善
- `rewriteRequestUrl`関数を改善
- Hermesパラメータの削除処理を最適化
- エラーハンドリングを強化

## 解決手順

### ステップ1: 既存のプロセスを停止
```bash
# ポート8081を使用しているプロセスを確認
lsof -ti:8081

# プロセスを停止
kill -9 $(lsof -ti:8081)
```

### ステップ2: キャッシュをクリア
```bash
# Metroキャッシュをクリア
rm -rf .metro
rm -rf .expo
rm -rf node_modules/.cache

# ブラウザのキャッシュもクリア（開発者ツールで「キャッシュの無効化とハード再読み込み」）
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

1. **Metroサーバーのログを確認**
   - ターミナルに表示されるエラーメッセージを確認
   - どのファイルでエラーが発生しているか特定

2. **型エラーの確認**
   - TypeScriptの型エラーがないか確認
   - `tsc --noEmit`で型チェックを実行

3. **循環依存の確認**
   - ファイル間の循環参照がないか確認

## 追加のトラブルシューティング

### WebpackとMetroの競合
Web環境でWebpackとMetroが競合している場合：
- `app.config.ts`で`bundler: 'metro'`を明示的に指定
- `webpack.config.js`は開発環境では使用されない（`expo export`時のみ使用）

### Hermesパラメータが残る場合
`metro.config.js`の`rewriteRequestUrl`が正しく動作していない可能性：
- ブラウザの開発者ツールでネットワークタブを確認
- リクエストURLにHermesパラメータが含まれていないか確認

### ポートの競合
他のプロセスがポート8081を使用している場合：
```bash
# 別のポートで起動
npx expo start --web --port 8082
```



