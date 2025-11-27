# カスタムフック

## 認証フック

### 推奨: `useAuthAdvanced` ✅

**最新の認証フック。新規コードではこちらを使用してください。**

```typescript
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';

function MyComponent() {
  const { isAuthenticated, user, signIn, signUp, signOut } = useAuthAdvanced();
  
  // ...
}
```

**機能:**
- ✅ グローバル状態管理（複数コンポーネント間で共有）
- ✅ ローカルストレージ永続化
- ✅ セッション自動復元
- ✅ エラーハンドリング
- ✅ リダイレクトループ検出
- ✅ 認証状態のリアルタイム同期

### 非推奨: `useAuth` ⚠️

**後方互換性のために残されています。新規コードでは使用しないでください。**

既存のコードで`useAuth`を使用している場合は、段階的に`useAuthAdvanced`へ移行してください。

**移行ガイド:**
```typescript
// 変更前
import { useAuth } from '@/hooks/useAuth';

// 変更後
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';

// APIは互換性があるため、多くの場合はインポートを変えるだけでOK
```

---

## その他のフック

### `useTimer`

タイマーとストップウォッチの機能を提供します。

```typescript
import { useTimer } from '@/hooks/useTimer';

function TimerComponent() {
  const { 
    timerSeconds, 
    isTimerRunning, 
    startTimer, 
    pauseTimer,
    resetTimer,
    setTimerPreset 
  } = useTimer();
  
  // ...
}
```

### `useSubscription`

サブスクリプションと課金状態を管理します。

```typescript
import { useSubscription } from '@/hooks/useSubscription';

function PremiumFeature() {
  const { subscription, entitlement, loading } = useSubscription();
  
  if (!entitlement.isEntitled) {
    return <UpgradePrompt />;
  }
  
  // プレミアム機能を表示
}
```

### `useFrameworkReady`

Expoフレームワークの準備完了を待機します。

```typescript
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

function App() {
  const isReady = useFrameworkReady();
  
  if (!isReady) {
    return <SplashScreen />;
  }
  
  // ...
}
```

---

## カスタムフックの作成ガイドライン

### 命名規則
- `use` で始める（React のルール）
- 機能を明確に表す名前（例: `useAuth`, `useTimer`）

### ファイル構成
```
hooks/
  ├── useMyFeature.ts      (フックの実装)
  └── useMyFeature.test.ts (テスト)
```

### テンプレート
```typescript
import { useState, useEffect } from 'react';

export const useMyFeature = () => {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // 初期化処理
    return () => {
      // クリーンアップ
    };
  }, []);
  
  const doSomething = () => {
    // ...
  };
  
  return {
    state,
    doSomething,
  };
};
```

### ベストプラクティス
1. **単一責任** - 1つのフックは1つの機能に集中
2. **依存関係の明示** - useEffectの依存配列を正確に
3. **クリーンアップ** - リソースを必ず解放
4. **テスト** - 重要なフックはテストを書く
5. **型定義** - TypeScriptの型を明示的に定義

