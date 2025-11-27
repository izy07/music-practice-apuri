# goals.tsx リファクタリング計画

## 概要

`app/(tabs)/goals.tsx`（3,696行）を、単一責任の原則に従って分割し、保守性とテスト容易性を向上させる。

## 現状分析

### ファイル状況

- **ファイル**: `app/(tabs)/goals.tsx`（見つからず、既に分割されている可能性）
- **想定行数**: 3,696行（レビュー時点の情報）
- **主な責務**（想定）:
  1. 個人目標管理
  2. 目標曲管理
  3. 憧れの演奏管理
  4. カレンダー表示
  5. 完了目標の表示

### 既存の構造確認

`app/(tabs)/goals/`ディレクトリが存在するため、既に分割が始まっている可能性があります。

## 分割後のディレクトリ構造

```
app/(tabs)/goals/
  ├── index.tsx (約250行) - メインコンポーネント、状態管理の統合
  ├── hooks/
  │   ├── useGoals.ts ✅ 既存（改善が必要）
  │   ├── useTargetSong.ts (新規)
  │   │   └── 目標曲の管理ロジック
  │   ├── useInspirationalPerformances.ts (新規)
  │   │   └── 憧れの演奏管理ロジック
  │   ├── useCalendarEvents.ts (新規)
  │   │   └── カレンダーイベント管理
  │   ├── useGoalForm.ts (新規)
  │   │   └── 目標フォームの状態管理
  │   └── _useUserProfile.ts ✅ 既存（hooks/tabs/goals/）
  ├── components/
  │   ├── PersonalGoalsSection.tsx (新規、約400行)
  │   │   └── 個人目標セクション
  │   ├── TargetSongSection.tsx (新規、約350行)
  │   │   └── 目標曲セクション
  │   ├── InspirationalSection.tsx (新規、約300行)
  │   │   └── 憧れの演奏セクション
  │   ├── CalendarView.tsx (新規、約450行)
  │   │   └── カレンダー表示
  │   ├── GoalFormModal.tsx (新規、約300行)
  │   │   └── 目標追加/編集モーダル
  │   ├── GoalCard.tsx (新規、約200行)
  │   │   └── 目標カードコンポーネント
  │   ├── _CompletedGoalsSection.tsx ✅ 既存（components/goals/）
  │   ├── _PersonalGoalsSection.tsx ✅ 既存（components/goals/）
  │   ├── _ActiveGoalsList.tsx ✅ 既存（components/goals/）
  │   └── _CalendarModal.tsx ✅ 既存（components/tabs/goals/components/）
  ├── types/
  │   └── goals.types.ts (新規)
  │       └── Goal, GoalSong, Event などの型定義
  ├── utils/
  │   └── goals.utils.ts ✅ 既存（lib/tabs/goals/utils.tsを確認）
  └── styles.ts (新規)
      └── スタイル定義
```

## 詳細な分割計画

### Phase 1: 型定義とフックの抽出（Week 9-10）

#### 1.1 型定義ファイルの作成

**ファイル**: `app/(tabs)/goals/types/goals.types.ts`

**内容**:
```typescript
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_date?: string;
  progress_percentage: number;
  goal_type: 'personal_short' | 'personal_long' | 'group';
  is_active: boolean;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TargetSong {
  id: string;
  user_id: string;
  title: string;
  composer: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InspirationalPerformance {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  video_url?: string;
  performer_name?: string;
  piece_name?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  genre?: string;
  slot?: number;
  created_at: string;
  updated_at: string;
}
```

#### 1.2 フックの作成

**useTargetSong.ts**: 目標曲のCRUD操作
**useInspirationalPerformances.ts**: 憧れの演奏のCRUD操作
**useCalendarEvents.ts**: カレンダーイベントの取得と表示
**useGoalForm.ts**: 目標フォームの状態管理とバリデーション

### Phase 2: コンポーネントの分割（Week 11-12）

各セクションを独立したコンポーネントに分割：
- PersonalGoalsSection
- TargetSongSection
- InspirationalSection

既存コンポーネントの活用：
- `components/goals/_CompletedGoalsSection.tsx`
- `components/goals/_PersonalGoalsSection.tsx`
- `components/goals/_ActiveGoalsList.tsx`

### Phase 3: カレンダーとフォーム（Week 13-14）

- CalendarViewコンポーネントの作成
- GoalFormModalコンポーネントの作成
- GoalCardコンポーネントの作成

### Phase 4: 統合とテスト（Week 15-16）

- メインコンポーネント（index.tsx）のリファクタリング
- テストの作成・更新
- 動作確認

## 実装ステップ

1. 既存のコンポーネントとフックを確認
2. 型定義ファイルの作成
3. フックの抽出と作成
4. コンポーネントの分割
5. スタイルの分離
6. メインコンポーネントのリファクタリング

## 成功基準

- [ ] 各ファイルが500行以下
- [ ] 責務が明確に分離されている
- [ ] 既存機能がすべて動作する
- [ ] テストが書きやすい構造になっている

## 注意事項

- 既存のコンポーネント（`components/goals/`配下）を最大限活用
- 段階的な移行を実施
- 各Phaseで動作確認とテストを実施

## 次のステップ

まず、実際の`goals.tsx`ファイルの場所を確認し、現在の構造を分析してから、詳細な分割計画を更新する。

