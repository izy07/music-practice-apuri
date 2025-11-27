# basic-practice.tsx リファクタリング計画

## 概要

`app/(tabs)/basic-practice.tsx`（2,518行）を、単一責任の原則に従って分割し、保守性とテスト容易性を向上させる。

## 現状分析

### ファイル構造

- **総行数**: 2,518行
- **主な責務**:
  1. 練習メニューデータ定義（約1,200行）
  2. UIコンポーネント（約400行）
  3. 状態管理とロジック（約500行）
  4. スタイル定義（約400行）

### 主要な問題点

1. **単一責任の原則違反**: データ、ロジック、UI、スタイルが1ファイルに混在
2. **巨大なデータ定義**: `genericMenus`と`instrumentSpecificMenus`が1,200行以上
3. **状態管理の複雑化**: 複数の`useState`と`useEffect`が相互依存
4. **テスト困難性**: データとロジックが密結合

## 分割後のディレクトリ構造

```
app/(tabs)/basic-practice/
  ├── index.tsx (約300行) - メインコンポーネント、状態管理の統合
  ├── hooks/
  │   ├── useBasicPracticeLevel.ts ✅ 既存（改善が必要）
  │   ├── usePracticeMenu.ts (新規)
  │   │   └── 練習メニューの取得とフィルタリングロジック
  │   └── usePracticeProgress.ts (新規)
  │       └── ユーザーの練習進捗管理ロジック
  ├── components/
  │   ├── PracticeMenuSection.tsx (新規、約300行)
  │   │   └── 練習メニューリストの表示
  │   ├── LevelSelector.tsx (新規、約150行)
  │   │   └── レベル選択UI
  │   ├── PracticeItemCard.tsx (新規、約200行)
  │   │   └── 個別の練習項目カード
  │   └── DetailModal.tsx ✅ 既存（改善が必要）
  ├── data/
  │   ├── genericMenus.ts (新規、約600行)
  │   │   └── 共通（デフォルト）練習メニューデータ
  │   └── instrumentSpecificMenus.ts (新規、約600行)
  │       └── 楽器別の練習メニューデータ
  ├── types/
  │   └── practice.types.ts (新規)
  │       └── PracticeItem, Level などの型定義
  └── styles.ts (新規、約400行)
      └── スタイル定義
```

## 詳細な分割計画

### Phase 1: 型定義とデータの外部化（Week 17）

#### 1.1 型定義ファイルの作成

**ファイル**: `app/(tabs)/basic-practice/types/practice.types.ts`

**内容**:
```typescript
export interface PracticeItem {
  id: string;
  title: string;
  description: string;
  points: string[];
  videoUrl?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  howToPractice?: string[];
  recommendedTempo?: string;
  duration?: string;
  tips?: string[];
}

export interface Level {
  id: 'beginner' | 'intermediate' | 'advanced';
  label: string;
  description: string;
}
```

#### 1.2 練習メニューデータの外部化

**ファイル**: `app/(tabs)/basic-practice/data/genericMenus.ts`

- `genericMenus`配列（約600行）を抽出
- 既存の`lib/tabs/basic-practice/data/_practiceMenus.ts`を確認し、重複を避ける

**ファイル**: `app/(tabs)/basic-practice/data/instrumentSpecificMenus.ts`

- `instrumentSpecificMenus`オブジェクト（約600行）を抽出
- 既存の`lib/tabs/basic-practice/data/_instrumentSpecificMenus.ts`を確認し、重複を避ける

### Phase 2: フックの抽出（Week 18）

#### 2.1 usePracticeMenu フック

**ファイル**: `app/(tabs)/basic-practice/hooks/usePracticeMenu.ts`

**責務**:
- 楽器に応じた練習メニューの取得
- レベルによるフィルタリング
- 楽器別メニューと共通メニューのマージ

**インターフェース**:
```typescript
export function usePracticeMenu(
  instrumentKey: string,
  selectedLevel: 'beginner' | 'intermediate' | 'advanced'
): PracticeItem[] {
  // 実装
}
```

#### 2.2 usePracticeProgress フック

**ファイル**: `app/(tabs)/basic-practice/hooks/usePracticeProgress.ts`

**責務**:
- ユーザーレベルの取得と保存
- レベル選択の処理
- AsyncStorageとの連携

**インターフェース**:
```typescript
export function usePracticeProgress() {
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [hasSelectedLevel, setHasSelectedLevel] = useState(false);
  
  const checkUserLevel = async () => { /* ... */ };
  const saveUserLevel = async (level: string) => { /* ... */ };
  
  return {
    userLevel,
    hasSelectedLevel,
    checkUserLevel,
    saveUserLevel,
  };
}
```

### Phase 3: コンポーネントの分割（Week 19）

#### 3.1 PracticeMenuSection コンポーネント

**ファイル**: `app/(tabs)/basic-practice/components/PracticeMenuSection.tsx`

**責務**:
- 練習メニューリストの表示
- 練習項目カードのレンダリング
- クリック時の詳細モーダル表示

**Props**:
```typescript
interface PracticeMenuSectionProps {
  menus: PracticeItem[];
  onMenuSelect: (menu: PracticeItem) => void;
  currentTheme: InstrumentTheme;
}
```

#### 3.2 LevelSelector コンポーネント

**ファイル**: `app/(tabs)/basic-practice/components/LevelSelector.tsx`

**責務**:
- レベル選択タブの表示
- レベル選択モーダルの表示
- レベル変更の処理

**Props**:
```typescript
interface LevelSelectorProps {
  selectedLevel: 'beginner' | 'intermediate' | 'advanced';
  userLevel: string | null;
  levels: Level[];
  onLevelChange: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  onOpenModal: () => void;
  currentTheme: InstrumentTheme;
}
```

#### 3.3 PracticeItemCard コンポーネント

**ファイル**: `app/(tabs)/basic-practice/components/PracticeItemCard.tsx`

**責務**:
- 個別の練習項目カードの表示
- 難易度バッジの表示
- クリック時の処理

**Props**:
```typescript
interface PracticeItemCardProps {
  item: PracticeItem;
  onPress: () => void;
  currentTheme: InstrumentTheme;
}
```

### Phase 4: スタイルの分離と統合（Week 20）

#### 4.1 スタイルファイルの作成

**ファイル**: `app/(tabs)/basic-practice/styles.ts`

- `StyleSheet.create`の内容をすべて抽出
- 約400行のスタイル定義

#### 4.2 メインコンポーネントのリファクタリング

**ファイル**: `app/(tabs)/basic-practice/index.tsx`

**責務**:
- コンポーネントとフックの統合
- ルーティング処理
- 状態管理の最小限の統合

**目標行数**: 約300行以下

## 実装ステップ

### Step 1: 準備（既存構造の確認）

1. 既存の`lib/tabs/basic-practice/`ディレクトリの構造を確認
2. 既存のコンポーネントやフックを確認（`components/`, `hooks/`ディレクトリ）
3. 重複を避けつつ、適切な場所に配置

### Step 2: 型定義とデータの抽出

1. `types/practice.types.ts`を作成
2. `data/genericMenus.ts`を作成（または既存ファイルを活用）
3. `data/instrumentSpecificMenus.ts`を作成（または既存ファイルを活用）
4. `basic-practice.tsx`からデータ定義を削除

### Step 3: フックの作成

1. `hooks/usePracticeMenu.ts`を作成
2. `hooks/usePracticeProgress.ts`を作成
3. 既存の`hooks/useBasicPracticeLevel.ts`を確認・改善

### Step 4: コンポーネントの分割

1. `components/PracticeItemCard.tsx`を作成
2. `components/LevelSelector.tsx`を作成
3. `components/PracticeMenuSection.tsx`を作成
4. 既存の`components/DetailModal.tsx`を確認・改善

### Step 5: スタイルの分離

1. `styles.ts`を作成
2. `basic-practice.tsx`からスタイル定義を削除

### Step 6: メインコンポーネントのリファクタリング

1. `basic-practice.tsx`を`basic-practice/index.tsx`にリネーム
2. すべての抽出したコンポーネントとフックを統合
3. 状態管理を最小限に
4. 動作確認とテスト

## 成功基準

- [ ] 各ファイルが500行以下
- [ ] 責務が明確に分離されている
- [ ] 既存機能がすべて動作する
- [ ] テストが書きやすい構造になっている
- [ ] 型安全性が確保されている

## 注意事項

1. **既存機能の維持**: リファクタリング中も既存機能が動作することを確認
2. **段階的な移行**: 一度にすべてを変更せず、段階的に移行
3. **テスト**: 各Phaseで動作確認とテストを実施
4. **既存コードの活用**: `lib/tabs/basic-practice/`ディレクトリの既存コードを可能な限り活用

## 関連ファイル

- `lib/tabs/basic-practice/data/_practiceMenus.ts` - 既存の練習メニューデータ
- `lib/tabs/basic-practice/data/_instrumentSpecificMenus.ts` - 既存の楽器別メニュー
- `components/tabs/basic-practice/components/_DetailModal.tsx` - 既存の詳細モーダル
- `hooks/basic-practice/useBasicPracticeLevel.ts` - 既存のフック

