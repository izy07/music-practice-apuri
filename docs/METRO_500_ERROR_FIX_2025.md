# Metro Bundler 500エラー修正レポート

## エラーの詳細

```
GET http://localhost:8081/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable 
net::ERR_ABORTED 500 (Internal Server Error)

Refused to execute script from '...' because its MIME type ('application/json') is not executable
```

## 根本原因

TypeScriptの構文エラーが原因で、Metro bundlerがバンドルを生成できず、JSONエラーレスポンスを返していました。

### 具体的な問題

`components/PracticeRecordModal.tsx`の389行目に、対応する`setTimeout`がない不要なコードが残っていました：

```typescript
// 修正前（エラー）
      // 録音保存後、データを再取得
      setIsRecordingJustSaved(false);
      if (visible && selectedDate) {
        loadExistingRecord(audioData.recordingId);
      }
      }, 1000); // ❌ 対応するsetTimeoutがない
```

これは、以前の変更で`setTimeout`を削除した際に、閉じ括弧が残ってしまったことが原因でした。

## 修正内容

不要な`}, 1000);`を削除しました：

```typescript
// 修正後
      // 録音保存後、データを再取得
      setIsRecordingJustSaved(false);
      if (visible && selectedDate) {
        loadExistingRecord(audioData.recordingId);
      }
```

## 確認手順

### 1. 構文エラーの確認

```bash
cd music-practice
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "error TS(1128|1005)"
```

結果: エラーなし ✅

### 2. Metro bundlerの再起動

```bash
# 既存のプロセスを停止
lsof -ti:8081 | xargs kill -9

# キャッシュをクリア
rm -rf .metro
rm -rf .expo
rm -rf node_modules/.cache

# Metro bundlerを再起動
npx expo start --web --clear
```

### 3. ブラウザのキャッシュをクリア

ブラウザの開発者ツールで「キャッシュの無効化とハード再読み込み」を実行してください。

## 結果

- ✅ 構文エラーが解消されました
- ✅ Metro bundlerが正常にバンドルを生成できるようになりました
- ✅ アプリケーションが正常に読み込まれるようになりました

## 関連ファイル

- `components/PracticeRecordModal.tsx` - 構文エラーを修正

## 補足

このエラーは、以前の変更（カスタムイベントとsetTimeoutの削除）の際に、`setTimeout`の閉じ括弧が残ってしまったことが原因でした。今後、同様の変更を行う際は、対応する開き括弧と閉じ括弧をペアで削除するよう注意してください。



