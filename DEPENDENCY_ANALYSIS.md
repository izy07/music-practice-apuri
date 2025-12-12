# 依存関係分析レポート

## 調査結果

### 使用中の依存関係（削除不可）

以下の依存関係は実際に使用されているため、削除できません：

1. **react-native-webview** (13.16.0)
   - 使用箇所: `app/(tabs)/score-auto-scroll.tsx`
   - 用途: 楽譜の自動スクロール機能でWebViewを使用
   - 削除不可

2. **expo-camera** (~17.0.8)
   - 使用箇所: 
     - `components/PostureCameraModal.tsx` - 姿勢チェック用カメラ
     - `app/(tabs)/profile-settings.tsx` - プロフィール画像撮影
     - `app/(tabs)/beginner-guide.tsx` - 姿勢チェック機能
     - `app/(tabs)/basic-practice.tsx` - 姿勢チェック機能
   - 用途: カメラ機能（姿勢チェック、プロフィール画像）
   - 削除不可

3. **expo-audio** (~1.0.14)
   - 使用箇所:
     - `lib/sttService.ts` - 音声認識サービス
     - `components/TuningSoundPlayer.tsx` - チューニング音再生
   - 用途: 音声処理機能
   - 削除不可

## 結論

調査した依存関係（react-native-webview、expo-camera、expo-audio）はすべて実際に使用されているため、削除できません。アプリサイズの削減を検討する場合は、以下の代替案を検討してください：

1. **機能の見直し**: 使用頻度の低い機能を削除またはオプション化
2. **動的インポート**: 使用頻度の低い機能を動的に読み込む
3. **コード分割**: 大きなコンポーネントの分割（既に実施済み）

