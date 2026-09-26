# Android権限の必要性分析レポート

## 📱 現在要求されている権限

このアプリは以下の権限を要求しています：

### ✅ **必要な権限（コア機能に必須）**

#### 1. **Microphone (マイク) - `RECORD_AUDIO`**
- **使用目的**: 
  - ユーザーの演奏を録音する機能
  - チューナー機能で音程を検出
- **使用箇所**: 
  - `components/AudioRecorder.tsx` - 録音機能
  - `lib/nativeTunerEngine.ts` - チューナー機能
- **必要性**: **必須** ⭐
- **設定状況**: `app.config.ts`の`permissions`配列で明示的に宣言済み

#### 2. **Other - change your audio settings - `MODIFY_AUDIO_SETTINGS`**
- **使用目的**: 録音時の音質設定や音量調整
- **必要性**: **必須** ⭐
- **設定状況**: `app.config.ts`の`permissions`配列で明示的に宣言済み

### ⚠️ **条件付きで必要な権限**

#### 3. **Camera (カメラ) - `CAMERA`**
- **使用目的**: 演奏フォームの録画機能（オプション機能）
- **使用箇所**: `components/PostureCameraModal.tsx`
- **必要性**: **オプション機能に必要**
- **設定状況**: `expo-camera`パッケージが自動的に追加
- **備考**: この機能を使用しない場合は権限を削除可能

### ✅ **システムが自動的に要求する権限（通常必要）**

#### 4. **Internet - receive data from Internet - `INTERNET`**
- **使用目的**: 
  - Supabaseバックエンドとの通信
  - ユーザー認証
  - データの同期
  - 広告の表示（AdMob）
- **必要性**: **必須** ⭐
- **設定状況**: React NativeとExpoが自動的に追加

#### 5. **Network - view network connections - `ACCESS_NETWORK_STATE`**
- **使用目的**: 
  - オフライン/オンライン状態の検出
  - ネットワークの状態に応じた処理の最適化
- **必要性**: **必須** ⭐
- **設定状況**: Expoが自動的に追加

#### 6. **Network - full network access - `ACCESS_WIFI_STATE`**
- **使用目的**: Wi-Fi接続状態の確認
- **必要性**: **推奨** ⭐
- **設定状況**: Expoが自動的に追加

#### 7. **Startup - run at startup - `RECEIVE_BOOT_COMPLETED`**
- **使用目的**: 
  - 練習リマインダー通知のスケジュール復元
  - アプリの起動時設定
- **必要性**: **通知機能に必要**
- **設定状況**: `expo-notifications`が自動的に追加

#### 8. **Other - draw over other apps - `SYSTEM_ALERT_WINDOW`**
- **使用目的**: 
  - 開発モード時のデバッグメニュー表示
  - React Native開発者メニュー
- **必要性**: **開発時のみ** 🔧
- **設定状況**: React Native Devが自動的に追加
- **備考**: **本番ビルドでは削除可能**

#### 9. **Other - control vibration - `VIBRATE`**
- **使用目的**: 
  - 通知受信時のバイブレーション
  - UIフィードバック
- **必要性**: **UX向上のため推奨**
- **設定状況**: `expo-notifications`が自動的に追加

#### 10. **Other - prevent device from sleeping - `WAKE_LOCK`**
- **使用目的**: 
  - 録音中や練習中に画面が消えないようにする
  - メトロノーム使用時の画面維持
- **必要性**: **推奨** ⭐
- **設定状況**: React Nativeが自動的に追加

#### 11. **Google Play license check**
- **使用目的**: アプリの正規性確認とライセンス検証
- **必要性**: **Google Playストア配信に必須**
- **設定状況**: Google Play Servicesが自動的に追加

## 🔍 明示的にブロックしている権限

以下の権限は、`app.config.ts`の`blockedPermissions`で**明示的に除外**されています：

```typescript
blockedPermissions: [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
]
```

これにより、以下の不要な権限が削除されています：
- ❌ 外部ストレージの読み取り
- ❌ 外部ストレージへの書き込み
- ❌ メディアファイル（画像/動画/音声）へのアクセス

**理由**: このアプリは録音・録画データをアプリ専用領域とクラウド（Supabase）にのみ保存するため、外部ストレージへのアクセスは不要です。

## 📊 権限の必要性サマリー

| 権限 | 必要性 | 削除可能か | 備考 |
|------|--------|-----------|------|
| マイク | 必須 ⭐ | ❌ | 録音とチューナー機能に必須 |
| 音声設定変更 | 必須 ⭐ | ❌ | 録音品質の調整に必須 |
| カメラ | オプション | ✅ | フォーム録画機能を削除すれば不要 |
| インターネット受信 | 必須 ⭐ | ❌ | データ同期と認証に必須 |
| ネットワーク接続確認 | 必須 ⭐ | ❌ | オフライン対応に必須 |
| 完全なネットワークアクセス | 推奨 ⭐ | △ | Wi-Fi状態の確認 |
| 起動時実行 | 推奨 ⭐ | △ | 通知機能に必要 |
| 他のアプリの上に表示 | 開発時のみ | ✅ | 本番ビルドから削除可能 |
| バイブレーション制御 | 推奨 | △ | UX向上のため推奨 |
| スリープ防止 | 推奨 ⭐ | △ | 録音中の画面維持 |
| Google Playライセンス | 必須 ⭐ | ❌ | ストア配信に必須 |

## 💡 推奨される改善策

### 1. カメラ権限をオプション化（最優先）

**現状**: `expo-camera`パッケージが自動的にカメラ権限を要求

**改善方法**:
```typescript
// app.config.ts に追加
android: {
  // ... 既存の設定 ...
  // カメラ権限をオプションにする
  permissions: [
    'RECORD_AUDIO',
    'MODIFY_AUDIO_SETTINGS',
    // CAMERAは含めない（使用時のみ動的に要求）
  ],
}
```

**メリット**: 
- ユーザーの不安軽減
- カメラ機能を使用する際のみ権限を要求することで、より透明性が高まる

### 2. 開発用権限を本番ビルドから除外

**現状**: `SYSTEM_ALERT_WINDOW`（他のアプリの上に表示）が含まれている

**改善方法**:
```typescript
// app.config.ts
android: {
  permissions: [
    'RECORD_AUDIO',
    'MODIFY_AUDIO_SETTINGS',
  ],
  // 本番ビルドでは開発用権限を除外
  blockedPermissions: [
    // ... 既存の設定 ...
    ...(process.env.NODE_ENV === 'production' ? ['SYSTEM_ALERT_WINDOW'] : []),
  ],
}
```

### 3. 権限の使用説明を強化

各権限について、ユーザーに分かりやすい説明を追加：

```typescript
// 現在の説明
NSMicrophoneUsageDescription: '演奏の録音およびチューナー機能で音程を検出するためにマイクを使用します。'

// Androidにも同様の説明を追加（将来のAndroid 12以降対応）
android: {
  // ... 既存の設定 ...
  permissionsExplanations: {
    RECORD_AUDIO: '演奏の録音およびチューナー機能で音程を検出するためにマイクを使用します。録音データは他のユーザーと共有されることはありません。',
    CAMERA: '演奏フォームを録画する機能で使用します（オプション）。録画データは他のユーザーと共有されることはありません。',
  }
}
```

## ✅ 結論

### すべての権限は正当な理由があります

このアプリが要求している権限は、以下の理由により**すべて正当**です：

1. **コア機能に必須の権限**
   - マイク：録音とチューナー機能
   - 音声設定：録音品質の調整
   - インターネット：データ同期と認証
   - ネットワーク状態：オフライン対応

2. **機能向上のための権限**
   - カメラ：演奏フォーム録画（オプション機能）
   - バイブレーション：通知フィードバック
   - スリープ防止：録音中の画面維持

3. **システム要件の権限**
   - Google Playライセンス：ストア配信に必須
   - 起動時実行：通知スケジュールの復元

### ただし、以下の改善が可能です：

1. ✅ **カメラ権限をオプション化** - 使用時のみ動的に要求
2. ✅ **開発用権限を本番から除外** - `SYSTEM_ALERT_WINDOW`を削除
3. ✅ **権限の説明を強化** - ユーザーの理解と信頼を向上

これらの改善により、ユーザーの不安を軽減し、アプリの信頼性を向上させることができます。

## 📝 参考資料

- `app.config.ts` (88-98行目) - Android権限の設定
- `plugins/withStripLegacyStoragePermissions.js` - 不要な権限の除外
- `components/PostureCameraModal.tsx` - カメラ機能の実装
- `components/AudioRecorder.tsx` - 録音機能の実装
- `docs/GOOGLE_PLAY_REVIEW_CHECKLIST.md` - Google Play審査チェックリスト
