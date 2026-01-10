# SubscriptionContext移行ガイド

## 概要

課金制度の複雑さを削減するため、`SubscriptionContext`を作成しました。これにより、サブスクリプション状態が一元管理され、各画面での重複取得が削減されます。

## 実装完了 ✅

1. ✅ `contexts/SubscriptionContext.tsx`を作成
2. ✅ `app/_layout.tsx`に`SubscriptionProvider`を追加

## 移行方法

### Before（現在の実装）

```typescript
import { useSubscription } from '@/hooks/useSubscription';

export default function MyScreen() {
  const { entitlement, loading, refresh } = useSubscription();
  
  // 使用例
  if (entitlement.isEntitled) {
    // プレミアム機能
  }
}
```

### After（推奨）

```typescript
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

export default function MyScreen() {
  const { entitlement, loading, refresh } = useSubscriptionContext();
  
  // 使用例（同じ）
  if (entitlement.isEntitled) {
    // プレミアム機能
  }
}
```

## 移行対象の画面

以下の画面で`useSubscription`を`useSubscriptionContext`に置き換えることができます：

1. `app/(tabs)/recordings-library.tsx`
2. `app/(tabs)/my-library.tsx`
3. `app/(tabs)/index.tsx`
4. `app/(tabs)/instrument-selection.tsx`
5. `app/(tabs)/pricing-plans.tsx`
6. `app/(tabs)/goals.tsx`
7. `app/add-goal.tsx`
8. `app/(tabs)/timer.tsx`
9. `app/(tabs)/score-auto-scroll.tsx`

## メリット

### 1. 状態の一元管理
- サブスクリプション状態が1箇所で管理される
- 状態の同期が保証される

### 2. パフォーマンス向上
- 重複取得の削減
- メモリ使用量の削減

### 3. テスト容易性
- Contextをモック可能
- テストコードが簡潔になる

### 4. 保守性
- 変更が1箇所で済む
- コードの重複を削減

## 移行の優先順位

### 高優先度（推奨）
- 新規実装: 必ず`useSubscriptionContext`を使用
- 既存コードの修正時: 併せて移行

### 中優先度
- 段階的な移行: 1画面ずつ移行してテスト

### 低優先度
- 既存の`useSubscription`も引き続き動作しますが、長期的には`useSubscriptionContext`に統一することを推奨します

## 注意事項

1. **Providerの配置**: `SubscriptionProvider`は`app/_layout.tsx`に既に追加済みです
2. **後方互換性**: 既存の`useSubscription`フックは引き続き動作します
3. **型安全性**: `EntitlementType`型が定義されています

## 例: 移行前後の比較

### recordings-library.tsx

**Before:**
```typescript
import { useSubscription } from '@/hooks/useSubscription';

export default function RecordingsLibraryScreen() {
  const { entitlement, loading } = useSubscription();
  // ...
}
```

**After:**
```typescript
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

export default function RecordingsLibraryScreen() {
  const { entitlement, loading } = useSubscriptionContext();
  // ...
}
```

変更はインポート文の置き換えのみです！
