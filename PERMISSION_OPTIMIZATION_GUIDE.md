# 権限最適化の実装ガイド

このドキュメントでは、Android権限を最適化するための具体的な実装手順を説明します。

## 🎯 目標

1. カメラ権限をオプション化する
2. 開発用権限を本番ビルドから除外する
3. 権限の説明をより分かりやすくする

## 📋 実装手順

### ステップ1: カメラ権限をオプション化

#### 1.1 `app.config.ts`を修正

カメラ権限を明示的に`permissions`配列に含めないことで、使用時のみ動的に要求されるようにします。

```typescript
// app.config.ts の android セクション
android: {
  // ... 既存の設定 ...
  
  // 必須の権限のみを明示的に宣言
  permissions: ['RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS'],
  
  // カメラ権限は含めない → expo-cameraが使用時のみ動的に要求
  
  // ... 既存の blockedPermissions 設定 ...
}
```

#### 1.2 カメラ機能の権限要求を動的にする

`components/PostureCameraModal.tsx`では既に動的な権限要求が実装されているので、変更不要です：

```typescript
// 既に実装済み（確認用）
const [permission, requestPermission] = useCameraPermissions();

if (!permission.granted) {
  return (
    // 権限要求UIを表示
  );
}
```

### ステップ2: 開発用権限を本番ビルドから除外

#### 2.1 プロダクションビルド用の権限除外を追加

`app.config.ts`を修正して、本番ビルドでは`SYSTEM_ALERT_WINDOW`を除外します：

```typescript
// app.config.ts
const isProduction = process.env.NODE_ENV === 'production' || isEasBuild;

android: {
  // ... 既存の設定 ...
  
  blockedPermissions: [
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_MEDIA_AUDIO',
    
    // 本番ビルドでは開発用権限も除外
    ...(isProduction ? [
      'android.permission.SYSTEM_ALERT_WINDOW', // React Native開発者メニュー用
    ] : []),
  ],
}
```

### ステップ3: 権限の説明を強化

#### 3.1 Android用の権限説明を追加

`app.config.ts`にAndroid用の権限説明を追加します：

```typescript
// app.config.ts の android セクション
android: {
  // ... 既存の設定 ...
  
  // Android 6.0以降で権限要求時に表示される説明
  // （現時点ではExpo SDKが直接サポートしていないが、将来のために記載）
  config: {
    googleMobileAdsAppId: 'ca-app-pub-4701955364298598~7135719486',
  },
}
```

注: Androidでは権限の説明はアプリ内で実装する必要があります。`PostureCameraModal.tsx`と`AudioRecorder.tsx`で既に実装されています。

### ステップ4: Google Play Consoleでの説明を準備

#### 4.1 データの安全性セクションでの説明文

Google Play Consoleの「データの安全性」セクションで使用する説明文：

**マイク権限:**
```
演奏の録音およびチューナー機能で音程を検出するために使用します。
録音データはユーザー本人のアカウントにのみ保存され、
他のユーザーや第三者と共有されることはありません。
```

**カメラ権限:**
```
演奏フォームを録画する機能で使用します（オプション機能）。
録画データはユーザー本人のアカウントにのみ保存され、
他のユーザーや第三者と共有されることはありません。
この機能を使用しない場合、カメラ権限は要求されません。
```

**インターネット権限:**
```
練習記録をクラウドに保存し、複数のデバイス間で同期するために使用します。
また、ユーザー認証と広告表示にも使用します。
```

#### 4.2 アプリの説明での権限に関する記載

ストアリスティングの説明文に権限について明記：

```markdown
【必要な権限】
• マイク: 演奏の録音とチューナー機能
• カメラ: 演奏フォームの録画（オプション）
• インターネット: データの同期と認証

すべてのデータはあなた専用で保存され、
他のユーザーと共有されることはありません。
```

## 🧪 テスト手順

### テスト1: カメラ権限がオプションになっているか確認

1. アプリをアンインストール
2. 再インストール後、初回起動
3. カメラ機能を使わずに基本機能を利用
4. **期待結果**: カメラ権限が要求されない
5. カメラ機能（演奏フォーム録画）を開く
6. **期待結果**: このタイミングでカメラ権限が要求される

### テスト2: 本番ビルドで開発用権限が除外されているか確認

1. EAS Buildで本番ビルドを作成:
   ```bash
   eas build --profile production --platform android
   ```

2. ビルドされた`.aab`ファイルから権限を確認:
   ```bash
   # .aabファイルをダウンロード後
   bundletool build-apks --bundle=app.aab --output=app.apks
   bundletool dump manifest --bundle=app.aab | grep "uses-permission"
   ```

3. **期待結果**: `SYSTEM_ALERT_WINDOW`が含まれていない

### テスト3: 必須権限が正しく機能するか確認

1. 録音機能をテスト
   - **期待結果**: マイク権限が正しく要求され、録音が動作する

2. チューナー機能をテスト
   - **期待結果**: マイク権限が正しく要求され、音程検出が動作する

3. データ同期をテスト
   - **期待結果**: インターネット接続が正しく機能する

## 📊 ビフォー・アフター比較

### 変更前
```
権限の数: 11個
- マイク ✓
- カメラ ✓ (初回起動時に要求)
- 音声設定変更 ✓
- インターネット受信 ✓
- ネットワーク接続確認 ✓
- 完全なネットワークアクセス ✓
- 起動時実行 ✓
- 他のアプリの上に表示 ✓ (開発用)
- バイブレーション制御 ✓
- スリープ防止 ✓
- Google Playライセンス ✓
```

### 変更後
```
権限の数: 10個（本番ビルド）/ 11個（開発ビルド）
- マイク ✓
- カメラ ✓ (使用時のみ要求 - オプション)
- 音声設定変更 ✓
- インターネット受信 ✓
- ネットワーク接続確認 ✓
- 完全なネットワークアクセス ✓
- 起動時実行 ✓
- 他のアプリの上に表示 ✗ (本番ビルドから除外)
- バイブレーション制御 ✓
- スリープ防止 ✓
- Google Playライセンス ✓
```

### 改善点
1. ✅ カメラ権限が使用時のみ要求されるようになる
2. ✅ 本番ビルドから開発用権限が除外される
3. ✅ ユーザーの不安が軽減される
4. ✅ Google Play審査での承認率が向上

## 🚀 デプロイ手順

1. **変更をコミット**
   ```bash
   git add app.config.ts
   git commit -m "権限設定を最適化: カメラをオプション化、開発用権限を除外"
   ```

2. **テストビルドを作成**
   ```bash
   eas build --profile preview --platform android
   ```

3. **内部テストで検証**
   - テスターに配布
   - 権限要求のタイミングを確認
   - 機能が正しく動作することを確認

4. **本番ビルドを作成**
   ```bash
   eas build --profile production --platform android
   ```

5. **Google Play Consoleにアップロード**
   - 「データの安全性」セクションを更新
   - 権限の説明を更新
   - クローズドテストを実施

## ❓ FAQ

### Q1: カメラ権限をオプション化すると、機能が動作しなくなりませんか？

A: いいえ。`expo-camera`は使用時に自動的に権限を要求します。`PostureCameraModal.tsx`で権限チェックと要求が実装されているため、問題なく動作します。

### Q2: 開発中は開発者メニューが必要です。どうすればいいですか？

A: `blockedPermissions`の設定は`isProduction`フラグで制御されているため、開発ビルド（`expo start`や`expo run:android`）では`SYSTEM_ALERT_WINDOW`が除外されません。本番ビルド（EAS Build）のみで除外されます。

### Q3: 既存のユーザーへの影響はありますか？

A: いいえ。既に権限を許可しているユーザーには影響ありません。新規ユーザーや再インストールしたユーザーのみ、カメラ権限が使用時のみ要求されるようになります。

### Q4: Google Play審査への影響は？

A: プラスの影響があります。権限の使用目的が明確になり、不要な権限が削減されるため、審査が通りやすくなります。

## 📚 参考資料

- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Android Permissions Best Practices](https://developer.android.com/training/permissions/requesting)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
