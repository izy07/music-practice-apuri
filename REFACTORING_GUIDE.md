# リファクタリングガイド

## 🎯 リファクタリングの優先順位

### Priority 1: 巨大コンポーネントの分割

現在、以下のファイルが大きすぎます：

```
⚠️ 要分割:
- app/(tabs)/goals.tsx          (2897行) → 5-6ファイルに分割推奨
- app/(tabs)/beginner-guide.tsx (1366行) → 3-4ファイルに分割推奨
- app/(tabs)/timer.tsx          (1083行) → 2-3ファイルに分割推奨
- app/(tabs)/note-training.tsx  (1268行) → 3-4ファイルに分割推奨
- app/(tabs)/my-library.tsx     (1045行) → 2-3ファイルに分割推奨
```

### 推奨: 500行以下

1つのファイルは**500行以下**に保つのが理想です。

---

## 📁 コンポーネント分割の例

### Before (2897行の巨大ファイル)

```
app/(tabs)/goals.tsx  (2897行)
```

### After (分割後)

```
app/(tabs)/goals/
  ├── index.tsx                 (200行) メインロジック
  ├── useGoals.ts               (150行) カスタムフック ✅ 作成済み
  ├── PersonalGoals.tsx         (300行) 個人目標セクション
  ├── GroupGoals.tsx            (200行) 団体目標セクション
  ├── TargetSong.tsx            (250行) 目標曲セクション
  ├── InspirationalPerformances.tsx (300行) 憧れの演奏
  ├── GoalCard.tsx              (150行) 目標カードコンポーネント
  ├── AddGoalModal.tsx          (350行) 目標追加モーダル
  ├── CalendarModal.tsx         (250行) カレンダーモーダル
  ├── VideoPlayerModal.tsx      (150行) 動画再生モーダル
  └── styles.ts                 (200行) スタイル定義
```

**メリット:**
- ✅ コードの可読性向上
- ✅ メンテナンス性向上
- ✅ テストが書きやすい
- ✅ 再利用可能

---

## 🔧 リファクタリング手順

### Step 1: カスタムフックの抽出

ビジネスロジックを分離します。

```typescript
// ❌ Before: goals.tsx (2897行)
export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  
  const loadGoals = async () => {
    // 100行のロジック...
  };
  
  const saveGoal = async () => {
    // 80行のロジック...
  };
  
  // ... 2700行のコード
}
```

```typescript
// ✅ After: useGoals.ts (150行)
export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  
  const loadGoals = useCallback(async () => {
    // ロジック
  }, []);
  
  return { goals, loadGoals, saveGoal, ... };
};

// ✅ After: goals/index.tsx (200行)
import { useGoals } from './useGoals';

export default function GoalsScreen() {
  const { goals, loadGoals, saveGoal } = useGoals();
  
  return (
    <View>
      <PersonalGoals goals={goals} />
      <GroupGoals goals={goals} />
    </View>
  );
}
```

### Step 2: UIコンポーネントの抽出

再利用可能なUIコンポーネントに分離します。

```typescript
// ✅ PersonalGoals.tsx
import { Goal } from '@/types/models';

interface PersonalGoalsProps {
  goals: Goal[];
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
}

export const PersonalGoals = ({ goals, onEdit, onDelete }: PersonalGoalsProps) => {
  return (
    <View>
      {goals.filter(g => g.goal_type === 'personal_short' || g.goal_type === 'personal_long')
        .map(goal => (
          <GoalCard 
            key={goal.id} 
            goal={goal} 
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </View>
  );
};
```

### Step 3: スタイルの分離

スタイル定義を別ファイルに分離します。

```typescript
// ✅ goals/styles.ts
import { StyleSheet } from 'react-native';

export const createStyles = (theme: InstrumentTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  // ...
});
```

### Step 4: 型定義の統合

共通の型定義を使用します。

```typescript
// ❌ Before: ファイルごとに定義
interface Goal {
  id: string;
  title: string;
  // ...
}

// ✅ After: 統一型を使用
import { Goal } from '@/types/models';
```

---

## 🏗️ ディレクトリ構造のベストプラクティス

### 機能ベースの構成

```
app/(tabs)/
  ├── goals/
  │   ├── index.tsx               (メインコンポーネント)
  │   ├── useGoals.ts             (カスタムフック)
  │   ├── PersonalGoals.tsx       (サブコンポーネント)
  │   ├── GroupGoals.tsx          (サブコンポーネント)
  │   └── styles.ts               (スタイル)
  ├── timer/
  │   ├── index.tsx
  │   ├── useTimerLogic.ts
  │   ├── TimerDisplay.tsx
  │   └── StopwatchDisplay.tsx
  └── statistics/
      ├── index.tsx
      ├── BarChart.tsx
      ├── useStatistics.ts
      └── styles.ts
```

---

## 📝 リファクタリングチェックリスト

### Before 開始前
- [ ] Git コミット（変更前の状態を保存）
- [ ] テストが全て通ることを確認
- [ ] ブランチを作成 (`git checkout -b refactor/goals-component`)

### During 作業中
- [ ] 1つの機能ずつ分割
- [ ] 分割後も動作確認
- [ ] 型定義を`types/models.ts`から使用
- [ ] 新しいテストを追加（必要に応じて）

### After 完了後
- [ ] 全テストが通ることを確認
- [ ] 動作確認（手動テスト）
- [ ] コードレビュー依頼
- [ ] マージ

---

## 🎯 具体的なリファクタリング例

### goals.tsx の分割（サンプル実装済み）

#### ✅ 作成済み
- `app/(tabs)/goals/useGoals.ts` - ビジネスロジック

#### 🚧 今後作成すべきファイル

1. **PersonalGoals.tsx**
```typescript
export const PersonalGoals = ({ goals, onUpdate, onDelete }) => {
  const shortTermGoals = goals.filter(g => g.goal_type === 'personal_short');
  const longTermGoals = goals.filter(g => g.goal_type === 'personal_long');
  
  return (
    <View>
      <Section title="短期目標">
        {shortTermGoals.map(goal => <GoalCard goal={goal} />)}
      </Section>
      <Section title="長期目標">
        {longTermGoals.map(goal => <GoalCard goal={goal} />)}
      </Section>
    </View>
  );
};
```

2. **GoalCard.tsx**
```typescript
export const GoalCard = ({ goal, onEdit, onDelete }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{goal.title}</Text>
      <ProgressBar progress={goal.progress_percentage} />
      <View style={styles.actions}>
        <Button onPress={() => onEdit(goal)}>編集</Button>
        <Button onPress={() => onDelete(goal.id)}>削除</Button>
      </View>
    </View>
  );
};
```

3. **AddGoalModal.tsx**
```typescript
export const AddGoalModal = ({ visible, onClose, onSave }) => {
  const [form, setForm] = useState({ title: '', description: '' });
  
  return (
    <Modal visible={visible}>
      {/* モーダルの内容 */}
    </Modal>
  );
};
```

---

## 🚀 段階的な移行戦略

### Phase 1（1週間）- 基盤整備 ✅ 完了
- [x] 型定義の統合 (`types/models.ts`)
- [x] バックアップファイル削除
- [x] カスタムフック抽出の例（`useGoals.ts`）

### Phase 2（1週間）- 主要コンポーネント分割
- [ ] goals.tsx の完全分割
- [ ] timer.tsx の分割
- [ ] my-library.tsx の分割

### Phase 3（1週間）- その他の分割
- [ ] beginner-guide.tsx の分割
- [ ] note-training.tsx の分割
- [ ] 共通コンポーネントの抽出

### Phase 4（継続的）- 保守
- [ ] 新規コンポーネントは最初から分割
- [ ] 500行を超えたら即座に分割

---

## 💡 Tips

### 分割の判断基準

**分割すべき時:**
- ファイルが500行を超えた
- スクロールが必要になった
- 複数の機能が1ファイルにある
- テストが書きづらい

**まだ分割不要な時:**
- ファイルが200行以下
- 単一の明確な責任
- 分割すると逆に複雑になる

### 命名規則

```
コンポーネント:  PascalCase  (例: PersonalGoals.tsx)
フック:        use + PascalCase (例: useGoals.ts)
ユーティリティ: camelCase   (例: formatDate.ts)
型定義:        models.ts, types.ts
スタイル:      styles.ts
```

### インポート順序

```typescript
// 1. React 関連
import React from 'react';
import { View, Text } from 'react-native';

// 2. サードパーティライブラリ
import { useRouter } from 'expo-router';

// 3. 型定義
import { Goal } from '@/types/models';

// 4. コンポーネント
import InstrumentHeader from '@/components/InstrumentHeader';

// 5. フック
import { useGoals } from './useGoals';

// 6. ユーティリティ
import { formatDate } from '@/lib/dateUtils';

// 7. スタイル
import { createStyles } from './styles';
```

---

## 🧪 リファクタリング後のテスト

```bash
# 1. 全テストが通ることを確認
npm test

# 2. 型チェック
npx tsc --noEmit

# 3. 動作確認
npm start

# 4. カバレッジ確認（下がっていないか）
npm run test:coverage
```

---

## 📚 参考資料

- [React Component Best Practices](https://react.dev/learn/thinking-in-react)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

