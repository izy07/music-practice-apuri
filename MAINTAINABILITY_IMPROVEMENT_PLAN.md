# 保守性改善計画書

## 📋 概要

このドキュメントは、コードベースの保守性を向上させるための具体的な改善計画を記載しています。

**現在の評価**: 6.0/10  
**目標評価**: 8.5/10

---

## 🔴 問題1: 巨大ファイル（8ファイル）

### 現状分析

| ファイル | 行数 | 主な責務 | 優先度 |
|---------|------|---------|--------|
| `app/(tabs)/goals.tsx` | **3,696行** | 目標管理、目標曲、憧れの演奏、カレンダー | 🔴 最高 |
| `app/(tabs)/basic-practice.tsx` | **2,599行** | 基本練習メニュー、レベル管理 | 🔴 高 |
| `app/(tabs)/tuner.tsx` | **2,508行** | チューナー機能、音声処理 | 🔴 高 |
| `app/(tabs)/beginner-guide.tsx` | **2,356行** | 初心者ガイド、チュートリアル | 🔴 高 |
| `app/(tabs)/profile-settings.tsx` | **2,159行** | プロフィール設定、アバター管理 | 🟡 中 |
| `app/(tabs)/index.tsx` | **1,947行** | メイン画面、統計表示 | 🟡 中 |
| `hooks/useAuthAdvanced.ts` | **1,822行** | 認証、プロフィール、セッション管理 | 🔴 高 |
| `app/(tabs)/main-settings.tsx` | **1,812行** | 設定画面、各種設定項目 | 🟡 中 |

**合計**: 約19,897行（全コードの約31%）

### 問題点

1. **単一責任の原則違反**
   - 1ファイルに複数の責務が混在
   - テストが困難
   - コードレビューが困難

2. **状態管理の複雑化**
   - 20以上の`useState`が1ファイルに存在
   - 複数の`useEffect`が相互依存
   - バグの原因になりやすい

3. **マージコンフリクト**
   - 複数人での開発時にコンフリクトが頻発
   - 解決に時間がかかる

### 改善計画

#### Phase 1: goals.tsx の分割（最優先）

**目標**: 3,696行 → 各ファイル500行以下

**分割構造**:
```
app/(tabs)/goals/
  ├── index.tsx (約250行)
  │   └── メインコンポーネント、状態管理の統合
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
  │   └── useUserProfile.ts ✅ 既存
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
  │   └── CompletedGoalsSection.tsx ✅ 既存
  ├── types/
  │   └── goals.types.ts (新規)
  │       └── Goal, GoalSong, Event などの型定義
  └── styles.ts (新規)
      └── スタイル定義
```

**実装ステップ**:

1. **Week 1: 型定義とフックの抽出**
   - [ ] `types/goals.types.ts`を作成
   - [ ] `useTargetSong.ts`を作成
   - [ ] `useInspirationalPerformances.ts`を作成
   - [ ] `useCalendarEvents.ts`を作成

2. **Week 2: コンポーネントの分割**
   - [ ] `PersonalGoalsSection.tsx`を作成
   - [ ] `TargetSongSection.tsx`を作成
   - [ ] `InspirationalSection.tsx`を作成

3. **Week 3: カレンダーとフォーム**
   - [ ] `CalendarView.tsx`を作成
   - [ ] `GoalFormModal.tsx`を作成
   - [ ] `GoalCard.tsx`を作成

4. **Week 4: 統合とテスト**
   - [ ] `index.tsx`をリファクタリング
   - [ ] テストの作成
   - [ ] 動作確認

**期待される効果**:
- ファイルサイズ: 3,696行 → 平均300行/ファイル
- テスト容易性: 向上
- 保守性: 大幅向上

#### Phase 2: basic-practice.tsx の分割

**目標**: 2,599行 → 各ファイル500行以下

**分割構造**:
```
app/(tabs)/basic-practice/
  ├── index.tsx (約300行)
  ├── hooks/
  │   ├── useBasicPracticeLevel.ts ✅ 既存
  │   ├── usePracticeMenu.ts (新規)
  │   └── usePracticeProgress.ts (新規)
  ├── components/
  │   ├── PracticeMenuSection.tsx (新規)
  │   ├── LevelSelector.tsx (新規)
  │   ├── PracticeItemCard.tsx (新規)
  │   └── DetailModal.tsx ✅ 既存
  └── types/
      └── practice.types.ts (新規)
```

**優先事項**:
- [ ] `@ts-nocheck`の削除と型エラーの修正
- [ ] 練習メニューデータの外部化
- [ ] コンポーネントの分割

#### Phase 3: その他の巨大ファイル

**tuner.tsx (2,508行)**:
- 音声処理ロジックを別ファイルに分離
- UIコンポーネントとロジックの分離

**beginner-guide.tsx (2,356行)**:
- ガイドコンテンツを外部データに移行
- セクションごとにコンポーネント分割

**useAuthAdvanced.ts (1,822行)**:
- ✅ 代替実装（`useAuthSimple.ts`）が存在
- 段階的な移行を実施

---

## 🟡 問題2: Supabase直接インポート（80ファイル）

### 現状分析

**直接インポートしているファイル**: 80ファイル

**カテゴリ別内訳**:
- 画面コンポーネント: 35ファイル
- リポジトリ: 12ファイル（これは許容）
- フック: 15ファイル
- サービス: 8ファイル
- その他: 10ファイル

**問題点**:
1. **テスト困難性**
   - Supabaseクライアントのモックが困難
   - 単体テストが書きづらい

2. **結合度の高さ**
   - Supabaseへの直接依存
   - データベース変更時の影響範囲が大きい

3. **リポジトリパターンの未徹底**
   - 既にリポジトリ層が存在するにもかかわらず、直接インポートが多数

### 改善計画

#### Step 1: リポジトリ層の拡充

**現状**: 12のリポジトリが存在

**必要な追加リポジトリ**:
- [ ] `statisticsRepository.ts` (新規)
- [ ] `profileRepository.ts` (新規、`userRepository.ts`から分離)
- [ ] `settingsRepository.ts` (新規、`userSettingsRepository.ts`から分離)

#### Step 2: 段階的な移行

**Phase 1: 画面コンポーネント（35ファイル）**

**優先順位**:
1. **高優先度**（10ファイル/週）
   - `app/(tabs)/goals.tsx`
   - `app/(tabs)/statistics.tsx`
   - `app/(tabs)/profile-settings.tsx`
   - `app/(tabs)/index.tsx`
   - `app/(tabs)/basic-practice.tsx`

2. **中優先度**（5ファイル/週）
   - `app/(tabs)/my-library.tsx`
   - `app/(tabs)/recordings-library.tsx`
   - `app/(tabs)/main-settings.tsx`
   - その他

**移行パターン**:

**Before**:
```typescript
// ❌ 悪い例
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('goals')
  .select('*')
  .eq('user_id', userId);
```

**After**:
```typescript
// ✅ 良い例
import { goalRepository } from '@/repositories/goalRepository';

const result = await goalRepository.getGoals(userId);
if (result.success && result.data) {
  // データを使用
}
```

**Phase 2: フック（15ファイル）**

**優先順位**:
1. `hooks/useOptimizedStatistics.ts`
2. `hooks/useGoals.ts` ✅ 一部改善済み
3. `hooks/useOrganization.ts`
4. その他

**移行例**:
```typescript
// Before
import { supabase } from '@/lib/supabase';

const { data } = await supabase
  .from('practice_sessions')
  .select('*')
  .eq('user_id', userId);

// After
import { practiceSessionRepository } from '@/repositories/practiceSessionRepository';

const result = await practiceSessionRepository.getSessions(userId);
```

**Phase 3: サービス層（8ファイル）**

**現状**: 一部のサービスで直接インポートが残っている

**対応**:
- サービス層はリポジトリ層のみを使用
- 直接インポートを完全に禁止

#### Step 3: リントルールの導入

**ESLintルールの追加**:
```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "@/lib/supabase",
            "message": "Supabaseへの直接インポートは禁止です。リポジトリ層を使用してください。"
          }
        ],
        "patterns": [
          {
            "group": ["@supabase/supabase-js"],
            "message": "Supabaseへの直接インポートは禁止です。リポジトリ層を使用してください。"
          }
        ]
      }
    ]
  }
}
```

**例外**: リポジトリ層と`lib/supabase.ts`自体は許可

#### 移行スケジュール

| 週 | 対象 | ファイル数 | 累計 |
|---|------|-----------|------|
| Week 1-2 | 高優先度画面 | 10 | 10 |
| Week 3-4 | 中優先度画面 | 10 | 20 |
| Week 5-6 | 低優先度画面 | 15 | 35 |
| Week 7-8 | フック | 15 | 50 |
| Week 9-10 | サービス層 | 8 | 58 |
| Week 11-12 | その他 | 22 | 80 |

**目標**: 12週間で全ファイルの移行完了

---

## 🟡 問題3: InstrumentThemeContext依存（77ファイル）

### 現状分析

**依存ファイル数**: 77ファイル（全136ファイルの約57%）

**問題点**:
1. **単一障害点（SPOF）**
   - `InstrumentThemeContext`の変更が77ファイルに影響
   - テストが困難

2. **不要な再レンダリング**
   - Contextの値が変更されると、全ての依存コンポーネントが再レンダリング
   - パフォーマンスへの影響

3. **結合度の高さ**
   - テーマ情報が不要な画面でも依存している可能性

### 改善計画

#### Step 1: 軽量フックの活用促進

**既存の軽量フック**:
- ✅ `useInstrumentThemeLight.ts` - 最小限の情報のみ
- ✅ `useThemeColors.ts` - 色情報のみ
- ✅ `useInstrumentSelection.ts` - 楽器選択状態のみ

**使用状況**:
- `useInstrumentThemeLight`: 使用されていない
- `useThemeColors`: 一部で使用
- `useInstrumentSelection`: 使用されていない

#### Step 2: 依存関係の分析と削減

**分析結果**:

1. **色情報のみ必要なファイル**（約30ファイル）
   - `useThemeColors()`に置き換え可能
   - 例: `app/(tabs)/statistics.tsx`, `app/(tabs)/my-library.tsx`

2. **楽器選択状態のみ必要なファイル**（約15ファイル）
   - `useInstrumentSelection()`に置き換え可能
   - 例: `app/(tabs)/goals.tsx`, `app/(tabs)/basic-practice.tsx`

3. **完全なテーマ情報が必要なファイル**（約32ファイル）
   - `useInstrumentTheme()`の使用を継続
   - 例: `components/InstrumentHeader.tsx`

#### Step 3: 段階的な移行

**Phase 1: 色情報のみ必要なファイル（30ファイル）**

**移行例**:

**Before**:
```typescript
// ❌ 悪い例
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

const { currentTheme } = useInstrumentTheme();
const primaryColor = currentTheme.primary;
```

**After**:
```typescript
// ✅ 良い例
import { useThemeColors } from '@/hooks/useThemeColors';

const { primary, secondary, accent } = useThemeColors();
```

**Phase 2: 楽器選択状態のみ必要なファイル（15ファイル）**

**移行例**:

**Before**:
```typescript
// ❌ 悪い例
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

const { selectedInstrument } = useInstrumentTheme();
```

**After**:
```typescript
// ✅ 良い例
import { useInstrumentSelection } from '@/hooks/useInstrumentThemeLight';

const { selectedInstrument, hasInstrument } = useInstrumentSelection();
```

**Phase 3: 完全なテーマ情報が必要なファイル（32ファイル）**

**対応**:
- `useInstrumentTheme()`の使用を継続
- ただし、必要な情報のみを取得するよう最適化

#### Step 4: Contextの最適化

**現状の問題**:
- Contextの値が変更されると、全ての依存コンポーネントが再レンダリング

**改善策**:
1. **Contextの分割**
   ```typescript
   // 色情報のみのContext
   const InstrumentColorsContext = createContext(...);
   
   // 楽器選択状態のみのContext
   const InstrumentSelectionContext = createContext(...);
   
   // 完全なテーマ情報のContext
   const InstrumentThemeContext = createContext(...);
   ```

2. **メモ化の強化**
   - `useMemo`で計算値をメモ化
   - `React.memo`でコンポーネントをメモ化

#### 移行スケジュール

| 週 | 対象 | ファイル数 | 累計 |
|---|------|-----------|------|
| Week 1-2 | 色情報のみ | 10 | 10 |
| Week 3-4 | 色情報のみ | 10 | 20 |
| Week 5-6 | 色情報のみ | 10 | 30 |
| Week 7-8 | 楽器選択状態のみ | 15 | 45 |
| Week 9-10 | Context最適化 | 32 | 77 |

**目標**: 10週間で依存関係を30%削減（77 → 54ファイル）

---

## 📊 改善効果の測定

### 指標

1. **ファイルサイズ**
   - 目標: 全ファイル500行以下
   - 現在: 8ファイルが500行超
   - 目標: 0ファイル

2. **Supabase直接インポート**
   - 目標: リポジトリ層のみ（12ファイル）
   - 現在: 80ファイル
   - 目標: 12ファイル

3. **InstrumentThemeContext依存**
   - 目標: 30%削減
   - 現在: 77ファイル
   - 目標: 54ファイル以下

### 測定方法

1. **週次レポート**
   - 各週の進捗を記録
   - 問題点を特定

2. **コードメトリクス**
   - ファイルサイズの監視
   - 依存関係の可視化

3. **テストカバレッジ**
   - リファクタリング後のテストカバレッジを維持
   - 目標: 70%以上

---

## 🎯 成功基準

### 短期目標（3ヶ月）

- [ ] `goals.tsx`の分割完了
- [ ] `basic-practice.tsx`の分割完了
- [ ] Supabase直接インポートを50%削減（80 → 40ファイル）
- [ ] InstrumentThemeContext依存を20%削減（77 → 62ファイル）

### 中期目標（6ヶ月）

- [ ] 全巨大ファイルの分割完了
- [ ] Supabase直接インポートを90%削減（80 → 12ファイル）
- [ ] InstrumentThemeContext依存を30%削減（77 → 54ファイル）
- [ ] テストカバレッジ70%達成

### 長期目標（12ヶ月）

- [ ] 保守性評価8.5/10達成
- [ ] 全ファイル500行以下
- [ ] 依存関係の最適化完了
- [ ] コード品質の継続的な改善

---

## 📝 実装チェックリスト

### 巨大ファイルの分割

- [ ] `goals.tsx`の分割計画作成
- [ ] `goals.tsx`の型定義抽出
- [ ] `goals.tsx`のフック抽出
- [ ] `goals.tsx`のコンポーネント分割
- [ ] `basic-practice.tsx`の`@ts-nocheck`削除
- [ ] `basic-practice.tsx`の分割
- [ ] その他巨大ファイルの分割

### Supabase直接インポートの削減

- [ ] リポジトリ層の拡充
- [ ] 高優先度画面の移行（10ファイル）
- [ ] 中優先度画面の移行（10ファイル）
- [ ] 低優先度画面の移行（15ファイル）
- [ ] フックの移行（15ファイル）
- [ ] サービス層の移行（8ファイル）
- [ ] ESLintルールの導入

### InstrumentThemeContext依存の削減

- [ ] 軽量フックの拡充
- [ ] 色情報のみ必要なファイルの移行（30ファイル）
- [ ] 楽器選択状態のみ必要なファイルの移行（15ファイル）
- [ ] Contextの最適化
- [ ] メモ化の強化

---

## 🔗 関連ドキュメント

- [コードレビューレポート](CODE_REVIEW_REPORT.md)
- [アーキテクチャサマリー](ARCHITECTURE_SUMMARY.md)
- [コード複雑度分析](CODE_COMPLEXITY_ANALYSIS.md)
- [リファクタリングガイド](REFACTORING_GUIDE.md)

---

**作成日**: 2024年12月  
**最終更新**: 2024年12月  
**ステータス**: 計画段階

