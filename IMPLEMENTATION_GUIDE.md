# 実装ガイド：優先改善項目

このドキュメントは、リードエンジニアのコードレビューで提案された改善項目の実装ガイドです。

---

## 📋 優先度別ロードマップ

### ✅ 完了済み
- [x] テスト環境構築
- [x] CI/CD パイプライン
- [x] パフォーマンス最適化
- [x] 型定義統合
- [x] ドキュメント整備

### 🚧 実装中（このガイドでカバー）
- [ ] Priority 1: コンポーネント分割
- [ ] Priority 2: テスト強化
- [ ] Priority 3: ツール導入

---

## Priority 1: 巨大コンポーネントの分割（1週間）

### 目標
- goals.tsx: 2897行 → 5-6ファイル
- timer.tsx: 1083行 → 2-3ファイル

### 実装手順

#### Step 1: goals.tsx の分割

**既に作成済み:**
- ✅ `app/(tabs)/goals/useGoals.ts` - 目標管理ロジック

**次に作成:**

```bash
# ディレクトリ作成
mkdir -p app/\(tabs\)/goals/components
mkdir -p app/\(tabs\)/goals/hooks
```

```typescript
// 1. app/(tabs)/goals/hooks/useTargetSong.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useTargetSong = () => {
  const [targetSong, setTargetSong] = useState(null);
  
  const loadTargetSong = useCallback(async () => {
    // 既存のloadTargetSongロジックを移動
  }, []);
  
  const saveTargetSong = useCallback(async (data) => {
    // 既存のsaveTargetSongロジックを移動
  }, []);
  
  return { targetSong, loadTargetSong, saveTargetSong };
};

// 2. app/(tabs)/goals/components/PersonalGoalsSection.tsx
import { Goal } from '@/types/models';

interface Props {
  goals: Goal[];
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
}

export const PersonalGoalsSection = ({ goals, onEdit, onDelete }: Props) => {
  // renderPersonalGoals の内容を移動
};

// 3. app/(tabs)/goals/index.tsx（新規メイン）
import { useGoals } from './hooks/useGoals';
import { useTargetSong } from './hooks/useTargetSong';
import { PersonalGoalsSection } from './components/PersonalGoalsSection';

export default function GoalsScreen() {
  const { goals, loadGoals, ... } = useGoals();
  const { targetSong, ... } = useTargetSong();
  
  return (
    <ScrollView>
      <PersonalGoalsSection goals={goals} ... />
      <TargetSongSection targetSong={targetSong} ... />
    </ScrollView>
  );
}
```

**作業時間:** 2-3日

#### Step 2: timer.tsx の分割

```typescript
// 1. app/(tabs)/timer/useTimerLogic.ts
export const useTimerLogic = () => {
  const { timerSeconds, startTimer, ... } = useTimer();
  const [targetMinutes, setTargetMinutes] = useState(25);
  
  // タイマーロジック
  
  return { timerSeconds, startTimer, ... };
};

// 2. app/(tabs)/timer/components/TimerDisplay.tsx
export const TimerDisplay = ({ seconds, isRunning }) => {
  return (
    <View>
      <Text>{formatTime(seconds)}</Text>
      {/* 表示UI */}
    </View>
  );
};

// 3. app/(tabs)/timer/index.tsx
import { useTimerLogic } from './useTimerLogic';
import { TimerDisplay } from './components/TimerDisplay';
import { StopwatchDisplay } from './components/StopwatchDisplay';

export default function TimerScreen() {
  const logic = useTimerLogic();
  
  return (
    <View>
      <TimerDisplay {...logic.timer} />
      <StopwatchDisplay {...logic.stopwatch} />
    </View>
  );
}
```

**作業時間:** 1-2日

---

## Priority 2: テスト強化（2週間）

### 2-1: E2Eテストの追加

**推奨ツール:** Playwright（Detoxより軽量）

```bash
# インストール
npm install --save-dev @playwright/test

# 設定ファイル作成
npx playwright init
```

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('ログインフローが動作する', async ({ page }) => {
  await page.goto('http://localhost:8081');
  
  // ログインページに遷移
  await page.click('text=ログイン');
  
  // 認証情報入力
  await page.fill('[placeholder*="メール"]', 'test@example.com');
  await page.fill('[placeholder*="パスワード"]', 'testpassword123');
  
  // ログインボタンクリック
  await page.click('button:has-text("ログイン")');
  
  // カレンダー画面に遷移することを確認
  await expect(page).toHaveURL(/.*tabs/);
});
```

**作業時間:** 3-4日

### 2-2: カバレッジ 50%達成

**現在: 30% → 目標: 50%**

追加すべきテスト:

```typescript
// 1. hooks/useAuthAdvanced.test.ts（優先度高）
describe('useAuthAdvanced', () => {
  it('ログイン状態が保持される', () => {});
  it('セッション復元が動作する', () => {});
});

// 2. lib/groupManagement.test.ts（機能テスト）
describe('PracticeScheduleManager', () => {
  it('スケジュールを作成できる', async () => {});
});

// 3. components/AudioRecorder.test.tsx（UI）
describe('AudioRecorder', () => {
  it('録音ボタンが表示される', () => {});
});
```

**作業時間:** 4-5日

---

## Priority 3: ツール導入（1ヶ月）

### 3-1: Zustand 状態管理 ✅ インストール済み

**サンプル実装:**
- ✅ `stores/useAuthStore.ts` - 作成済み

**移行手順:**

```typescript
// 1. 既存のContext APIと並行運用
// app/(tabs)/goals.tsx
import { useGoals } from './goals/useGoals'; // 既存
import { useGoalsStore } from '@/stores/useGoalsStore'; // 新規（オプション）

// 2. 段階的に移行
// まずは新機能でZustandを使用
// 既存機能は触らない

// 3. 完全移行（Phase 3）
// 全てのContext APIをZustandに置き換え
```

**メリット:**
- ✅ グローバル状態の簡略化
- ✅ パフォーマンス向上（不要な再レンダリング削減）
- ✅ DevToolsでデバッグ可能

**作業時間:** 5-7日

### 3-2: Sentry エラートラッキング

**インストール:**

```bash
npm install @sentry/react-native
npx @sentry/wizard -i reactNative
```

**設定:**

```typescript
// lib/errorTracking.ts
import * as Sentry from '@sentry/react-native';
import config from './config';

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: config.env.isProduction ? 'production' : 'development',
    enabled: config.env.isProduction, // 本番のみ有効
    tracesSampleRate: 1.0,
  });
};

export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('❌ エラー:', error);
  
  if (config.env.isProduction) {
    Sentry.captureException(error, { extra: context });
  }
};

// 使用例
try {
  await savePracticeRecord(data);
} catch (error) {
  logError(error as Error, { context: 'savePracticeRecord', data });
}
```

**メリット:**
- ✅ 本番環境のエラーを即座に検知
- ✅ スタックトレースで原因特定
- ✅ ユーザー影響を把握

**作業時間:** 2-3日

---

## 📊 実装スケジュール（現実的）

### Week 1-2: Priority 1（コンポーネント分割）
```
Day 1-3:   goals.tsx 分割
Day 4-5:   timer.tsx 分割
Day 6-7:   テスト確認、ドキュメント更新
```

### Week 3-4: Priority 2（テスト強化）
```
Day 8-11:  カバレッジ 50%達成
Day 12-14: E2Eテスト追加
```

### Week 5-8: Priority 3（ツール導入）
```
Day 15-21: Zustand移行
Day 22-24: Sentry導入
Day 25-28: 統合テスト、ドキュメント更新
```

---

## 🎯 即座に使えるツール

### 1. コンポーネントサイズ分析

```bash
chmod +x scripts/analyze-component-size.sh
./scripts/analyze-component-size.sh
```

### 2. テスト実行

```bash
npm run test:watch  # 開発中
npm run test:coverage  # カバレッジ確認
```

### 3. CI/CD確認

```bash
# GitHub Actionsをローカルで実行（act）
# brew install act
# act -j test
```

---

## 💡 段階的な実装戦略

### Phase 1: 基盤（✅ 完了）
- テスト環境
- CI/CD
- パフォーマンス最適化

### Phase 2: 構造改善（進行中）
- コンポーネント分割
- 型定義統合
- 状態管理改善

### Phase 3: 本番準備（今後）
- E2Eテスト
- エラートラッキング
- モニタリング

---

## 🚀 クイックスタート

すぐに始められる改善：

```bash
# 1. Zustandサンプルを確認
cat stores/useAuthStore.ts

# 2. コンポーネントサイズを確認
./scripts/analyze-component-size.sh

# 3. カバレッジを確認
npm run test:coverage
open coverage/lcov-report/index.html

# 4. 分割候補を特定
# goals.tsx, timer.tsx, beginner-guide.tsx など
```

---

## 📚 参考資料

### コンポーネント分割
- [React Component Best Practices](https://react.dev/learn/thinking-in-react)
- [Clean Code Practices](https://github.com/ryanmcdermott/clean-code-javascript)

### Zustand
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Migration from Context API](https://docs.pmnd.rs/zustand/guides/migrating-to-zustand)

### Sentry
- [Sentry React Native Setup](https://docs.sentry.io/platforms/react-native/)
- [Error Tracking Best Practices](https://docs.sentry.io/platforms/javascript/guides/react/best-practices/)

### E2Eテスト
- [Playwright Documentation](https://playwright.dev/)
- [Detox Documentation](https://wix.github.io/Detox/)

---

## ⚡ 時短Tips

### 既存のコードを活用
- useGoals.ts は既に実装済み
- types/models.ts で型定義済み
- テストのテンプレートあり

### 自動生成ツール
```bash
# コンポーネントのボイラープレート生成
# （実装すれば便利）
./scripts/generate-component.sh PersonalGoalsSection
```

### AI支援
- GitHub Copilot でコード補完
- ChatGPT でボイラープレート生成
- Cursor でリファクタリング支援

---

**重要:** このガイドは参考資料です。実際の実装は、プロジェクトの優先度とリソースに応じて調整してください。

