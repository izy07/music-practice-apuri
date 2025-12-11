# App Store提出チェックリスト

## 📋 必須項目

### 1. アプリ基本情報
- [ ] **アプリ名の変更**
  - 現在: `bolt-expo-nativewind`
  - 変更先: `Music Practice` または適切なアプリ名
  - ファイル: `app.config.ts` の `name` と `slug` を更新

- [ ] **アプリ説明文（App Store Connect）**
  - アプリの機能説明（日本語・英語）
  - キーワード最適化
  - 最大4000文字

- [ ] **カテゴリ選択**
  - プライマリ: 音楽 / Music
  - セカンダリ: 教育 / Education または ライフスタイル / Lifestyle

- [ ] **年齢制限設定**
  - 4+ または 12+（録音機能があるため12+推奨）

### 2. アプリアイコン・スクリーンショット
- [ ] **アプリアイコン**
  - 1024x1024px（PNG形式、アルファチャンネルなし）
  - ファイル: `assets/images/icon.png` を確認・更新
  - すべてのサイズ（20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt, 1024pt）を生成

- [ ] **iPhoneスクリーンショット**
  - 6.7インチ（iPhone 14 Pro Max）: 1290x2796px
  - 6.5インチ（iPhone 11 Pro Max）: 1242x2688px
  - 5.5インチ（iPhone 8 Plus）: 1242x2208px
  - 各サイズで3-10枚

- [ ] **iPadスクリーンショット**（iPad対応の場合）
  - 12.9インチ: 2048x2732px
  - 11インチ: 1668x2388px

- [ ] **App Preview動画**（オプション）
  - 15-30秒の動画
  - 主要機能のデモ

### 3. サブスクリプション・In-App Purchase
- [ ] **In-App Purchase実装**
  - 現在: `mockPurchase` を使用（開発用）
  - 実装: App Store Connectで商品IDを登録
  - 実装: `expo-in-app-purchases` または `react-native-purchases` を使用
  - ファイル: `lib/subscriptionService.ts` を更新

- [ ] **サブスクリプション商品の登録**
  - 月額プラン: `premium_monthly` (¥380)
  - 年額プラン: `premium_yearly` (¥3,800)
  - App Store Connectで商品IDを登録

- [ ] **サブスクリプション情報の表示**
  - 料金、更新頻度、キャンセル方法を明示
  - ファイル: `app/(tabs)/pricing-plans.tsx` を確認

- [ ] **返金ポリシー**
  - App Store Connectで返金ポリシーを設定
  - 利用規約に記載（✅ 実装済み）

### 4. プライバシー・法的要件
- [ ] **プライバシーポリシー**
  - ✅ 実装済み: `app/(tabs)/privacy-policy.tsx`
  - App Store ConnectにURLを登録
  - または、アプリ内に表示（現在の実装）

- [ ] **利用規約**
  - ✅ 実装済み: `app/(tabs)/terms-of-service.tsx`
  - App Store ConnectにURLを登録
  - または、アプリ内に表示（現在の実装）

- [ ] **App Privacy（App Store Connect）**
  - 収集するデータの種類を明示
  - データの使用目的を明示
  - 第三者共有の有無を明示
  - トラッキングの有無を明示

- [ ] **GDPR対応**（EU向けの場合）
  - ✅ プライバシーポリシーにGDPR条項あり
  - データ主体の権利を明示
  - DPO（データ保護責任者）の連絡先を明示

### 5. アプリ設定・ビルド
- [ ] **Bundle Identifier**
  - ✅ 設定済み: `com.musicpractice.app`
  - App Store Connectで確認

- [ ] **バージョン番号**
  - 初回リリース: `1.0.0`
  - `package.json` と `app.config.ts` で統一

- [ ] **ビルド番号**
  - 初回: `1`
  - 以降はインクリメント

- [ ] **EAS Build設定**
  - ✅ `eas.json` 設定済み
  - 本番ビルドプロファイルを確認

- [ ] **iOS証明書・プロビジョニング**
  - EAS Buildで自動生成されるが、確認が必要
  - App Store Connectで証明書を確認

### 6. 機能・動作確認
- [ ] **主要機能の動作確認**
  - ✅ カレンダー機能
  - ✅ タイマー機能
  - ✅ 目標管理機能
  - ✅ チューナー機能
  - ✅ 録音機能
  - ✅ マイライブラリ機能
  - ✅ 基礎練習メニュー
  - ✅ 初心者ガイド

- [ ] **エラーハンドリング**
  - ✅ 実装済み: `lib/errorHandler.ts`
  - ネットワークエラー時の動作確認
  - オフライン時の動作確認

- [ ] **パフォーマンス**
  - アプリ起動時間の確認
  - 画面遷移のスムーズさ
  - メモリリークの確認

### 7. セキュリティ・データ保護
- [ ] **データ暗号化**
  - ✅ Supabase（HTTPS通信）
  - ✅ パスワードの暗号化保存

- [ ] **認証機能**
  - ✅ Google OAuth実装済み
  - ✅ メール認証実装済み
  - セッション管理の確認

- [ ] **Row Level Security (RLS)**
  - ✅ Supabase RLS設定済み
  - ユーザーデータの分離確認

### 8. ユーザーサポート
- [ ] **サポート連絡先**
  - ✅ 実装済み: `app.gakki@gmail.com`
  - App Store Connectに登録
  - プライバシーポリシーに記載（✅ 実装済み）

- [ ] **ヘルプ・サポート画面**
  - ✅ 実装済み: `app/(tabs)/help-support.tsx`
  - ✅ 実装済み: `app/(tabs)/support.tsx`

- [ ] **フィードバック機能**
  - ✅ 実装済み: `app/(tabs)/feedback.tsx`

### 9. App Store Connect設定
- [ ] **アプリ情報の入力**
  - アプリ名
  - サブタイトル
  - 説明文
  - キーワード
  - カテゴリ
  - 年齢制限

- [ ] **価格と販売地域**
  - 価格設定（無料アプリ + サブスクリプション）
  - 販売地域の選択

- [ ] **App Review情報**
  - レビュー用のテストアカウント情報
  - レビュー用のメモ（機能説明、テスト手順）

- [ ] **バージョン情報**
  - リリースノート（初回リリース）
  - 新機能の説明

### 10. テスト・レビュー準備
- [ ] **TestFlightテスト**
  - 内部テストグループに追加
  - 外部テストグループに追加（オプション）
  - テストユーザーへの配布

- [ ] **レビュー用資料**
  - アプリの主要機能の説明
  - テストアカウント情報
  - 特別な設定や手順の説明

- [ ] **審査ガイドライン準拠**
  - App Store Review Guidelines を確認
  - 特に以下を確認:
    - 1.1 Safety（安全性）
    - 2.1 Performance（パフォーマンス）
    - 3.1 Business（ビジネス）
    - 5.1 Privacy（プライバシー）

## ⚠️ 重要な注意事項

### 現在の実装状況
- ✅ プライバシーポリシー: 実装済み
- ✅ 利用規約: 実装済み
- ✅ サポート連絡先: 実装済み
- ⚠️ In-App Purchase: `mockPurchase` を使用（本番実装が必要）
- ⚠️ アプリ名: `bolt-expo-nativewind` のまま（変更が必要）

### 優先度の高い作業
1. **In-App Purchase実装**（最優先）
   - `mockPurchase` を実際のIAP実装に置き換え
   - App Store Connectで商品IDを登録

2. **アプリ名の変更**
   - `app.config.ts` の `name` と `slug` を更新

3. **アプリアイコンの準備**
   - 1024x1024pxのアイコンを作成
   - すべてのサイズを生成

4. **スクリーンショットの準備**
   - 主要機能のスクリーンショットを撮影
   - 各デバイスサイズに対応

### 推奨事項
- [ ] **App Preview動画の作成**
  - 主要機能を15-30秒で紹介
  - ユーザーエンゲージメント向上

- [ ] **ローカライゼーション**
  - 英語対応（既に実装済みの可能性）
  - 多言語対応で市場拡大

- [ ] **アナリティクス設定**
  - App Store Connect Analytics
  - 必要に応じてFirebase Analytics等

## 📝 提出前の最終確認

### コード関連
- [ ] デバッグコードの削除
- [ ] コンソールログの削除または本番用ログレベル設定
- [ ] テストデータの削除
- [ ] ハードコードされた認証情報の削除

### 設定関連
- [ ] 環境変数の確認（本番環境用）
- [ ] APIエンドポイントの確認（本番環境用）
- [ ] サブスクリプション設定の確認

### ドキュメント関連
- [ ] README.mdの更新
- [ ] 変更履歴（CHANGELOG.md）の更新
- [ ] ライセンス情報の確認

## 🚀 提出手順

1. **EAS Buildでビルド**
   ```bash
   eas build --platform ios --profile production
   ```

2. **App Store Connectにアップロード**
   ```bash
   eas submit --platform ios
   ```
   または、Xcode Organizerから手動アップロード

3. **App Store Connectで情報入力**
   - アプリ情報
   - スクリーンショット
   - プライバシー情報
   - 価格設定

4. **審査提出**
   - すべての情報を入力後、審査を提出
   - 審査には通常1-3日かかる

## 📞 サポート

質問や問題がある場合:
- メール: app.gakki@gmail.com
- App Store Connectのヘルプセンター
- Apple Developer Support

---

**最終更新日**: 2025年1月20日
**ステータス**: 準備中

