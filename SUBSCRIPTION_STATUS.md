# 課金制度（サブスクリプション）の現状

## 実装状況

### ✅ 実装済みの機能

1. **データベース**
   - `user_subscriptions`テーブルが作成済み
   - プラン: `free`, `premium_monthly`, `premium_yearly`
   - トライアル期間: 21日間
   - RLS（Row Level Security）が設定済み

2. **サービス層**
   - `lib/subscriptionService.ts`: サブスクリプション管理サービス
     - `getSubscription()`: サブスクリプション取得
     - `ensureSubscription()`: サブスクリプション確実化（21日間トライアル付与）
     - `mockPurchase()`: 模擬購入（開発用）
     - `cancelSubscription()`: サブスクリプション解約
     - `computeEntitlement()`: 権利計算（トライアル・プレミアム状態）
     - `canAccessFeature()`: 機能アクセス権限チェック

3. **フック**
   - `hooks/useSubscription.ts`: サブスクリプション状態管理フック
     - トライアル期間の計算
     - プレミアム状態の管理
     - エントイトルメント（権利）の管理

4. **UI画面**
   - `app/(tabs)/pricing-plans.tsx`: 料金プラン画面
     - Free/トライアルプラン表示
     - Premium月額プラン（¥380/月）
     - Premium年額プラン（¥4,000/年）
     - 機能比較表示

5. **機能制限**
   - `my-library.tsx`: プレミアム未購読時にゲート表示
   - 無料機能: `calendar`, `tuner`, `timer`
   - プレミアム機能: `my-library`, `recordings-library`など

## ❌ 非表示になっている箇所

### 設定画面のメニュー項目

**ファイル**: `app/(tabs)/settings.tsx` (73-81行目)

```typescript
// 料金プラン項目を一時的に非表示（アプリリリース後に表示予定）
// {
//   id: 'pricing',
//   title: '料金プラン',
//   subtitle: 'プレミアム・年額プラン',
//   icon: Crown,
//   color: '#FFD700',
//   onPress: () => router.push('/(tabs)/pricing-plans' as any)
// },
```

**状態**: コメントアウトされて非表示

### タブバーでの非表示

**ファイル**: `app/(tabs)/_layout.tsx` (65行目)

`pricing-plans`は`HIDDEN_TABS`配列に含まれており、タブバーには表示されませんが、直接URLや`router.push()`でアクセス可能です。

## 現在の動作

1. **ユーザー登録時**
   - 自動的に21日間のトライアルが付与される
   - `ensureSubscription()`でトライアル期間が設定される

2. **トライアル中**
   - すべての機能が利用可能
   - `computeEntitlement()`で`isEntitled: true`が返される

3. **トライアル終了後**
   - 無料機能のみ利用可能
   - プレミアム機能（マイライブラリなど）はゲート表示

4. **購入処理**
   - 現在は`mockPurchase()`による模擬購入のみ
   - 実際の決済システム（Stripe等）は未統合

## 有効化方法

### 設定画面のメニュー項目を表示する場合

`app/(tabs)/settings.tsx`の73-81行目のコメントアウトを解除:

```typescript
{
  id: 'pricing',
  title: '料金プラン',
  subtitle: 'プレミアム・年額プラン',
  icon: Crown,
  color: '#FFD700',
  onPress: () => router.push('/(tabs)/pricing-plans' as any)
},
```

## 注意事項

1. **決済システム未統合**
   - 現在は`mockPurchase()`による模擬購入のみ
   - 本番環境では実際の決済システム（Stripe、App Store、Google Play等）との統合が必要

2. **価格**
   - 月額: ¥380
   - 年額: ¥4,000
   - 現在は固定値として実装

3. **トライアル期間**
   - 21日間（固定）
   - サインアップ日時を基準に計算

4. **機能制限**
   - `canAccessFeature()`で機能アクセスを制御
   - 無料機能とプレミアム機能の区分が実装済み

