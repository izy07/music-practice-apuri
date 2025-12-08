# 機能フロー分析レポート #4: 目標管理フロー

## 概要
目標の作成、進捗更新、達成、削除、カレンダー表示設定の各フローを詳細に分析し、余分な工程や潜在的なバグを特定する。

## 1. 目標作成フロー

### ユーザー操作の流れ
1. 目標画面 (`app/(tabs)/goals.tsx`) または目標追加画面 (`app/add-goal.tsx`) で「目標を追加」ボタンをクリック
2. 目標タイプを選択（短期目標 / 長期目標）
3. 目標タイトル、説明、目標期日を入力
4. 「保存」ボタンをクリック
5. 目標が保存され、目標画面に反映

### データの流れ

#### フロントエンド処理

##### パターン1: 目標追加画面 (`app/add-goal.tsx`)
```
[目標追加画面表示]
  ↓
[フォーム入力]
  ├─ 目標タイプ選択
  ├─ タイトル入力（最大50文字）
  ├─ 説明入力
  └─ 目標期日選択
  ↓
[保存ボタンクリック]
  ↓
saveGoal()
  ├─ バリデーション
  │  ├─ タイトル必須チェック
  │  └─ 目標タイプチェック
  ├─ goalService.createGoal() 呼び出し
  │  └─ goalRepository.createGoal()
  │     ├─ 最初の目標かチェック
  │     ├─ カラム存在確認（instrument_id, show_on_calendar, is_completed）
  │     ├─ 最初の目標の場合は show_on_calendar = true
  │     └─ INSERT実行（エラー時は再試行）
  └─ 成功後、目標画面に戻る
```

##### パターン2: 目標画面内 (`app/(tabs)/goals.tsx`)
- 目標画面内にも`saveGoal`関数が存在
- 同様のフロー

### 問題点・余分な工程

#### ✅ 問題1: 目標作成処理の重複（解決済み）
**場所**: 
- `app/add-goal.tsx:37-85` - `saveGoal()` ✅ `goalService.createGoal`を使用
- `app/(tabs)/goals.tsx:453-492` - `saveGoal()` ✅ `goalService.createGoal`を使用
- ~~`hooks/useGoals.ts:72-115` - `saveGoal()`~~ **未使用（削除可能）**

**状態**: ✅ **解決済み**

**修正内容**: 
- `app/add-goal.tsx`と`app/(tabs)/goals.tsx`の両方が`goalService.createGoal`を使用している
- `hooks/useGoals.ts`は使用されていない（importが見つからない）
- コードの重複は解消されている

**改善提案**: 
- `hooks/useGoals.ts`を削除（未使用のため）

#### ✅ 問題2: createGoalの複雑なエラーハンドリング（改善済み）
**場所**: `repositories/goalRepository.ts:651-806`
```typescript
// カラム存在確認とエラーハンドリングが複雑
// instrument_id、show_on_calendar、is_completed の存在確認
// エラー時の再試行ロジックが複雑
```

**状態**: ✅ **改善済み**

**修正内容**: 
- `initializeGoalRepository`関数を追加し、アプリ起動時に一度だけカラム存在確認を実行
- `_layout.tsx`で認証完了後に`initializeGoalRepository`を呼び出し
- カラム存在確認の結果をキャッシュし、実行時の確認をスキップ
- localStorageにフラグを保存して、次回起動時もスキップ

**実装**:
```typescript
// アプリ起動時に一度だけ実行
export const initializeGoalRepository = async (): Promise<void> => {
  // show_on_calendar、instrument_id、is_completedカラムの存在確認
  // 結果をキャッシュして、実行時の確認をスキップ
};

// _layout.tsxで呼び出し
useEffect(() => {
  if (isAuthenticated && isInitialized && !isLoading) {
    initializeGoalRepository().catch((error) => {
      logger.error('目標リポジトリの初期化中にエラーが発生しました:', error);
    });
  }
}, [isAuthenticated, isInitialized, isLoading]);
```

**効果**: 
- カラム存在確認のパフォーマンス向上（アプリ起動時に一度だけ実行）
- 実行時の確認をスキップして、レスポンス時間を短縮
- コードの可読性向上（初期化処理が明確）

#### ✅ 問題3: 最初の目標判定の計算コスト（最適化済み）
**場所**: `repositories/goalRepository.ts:599-646`
```typescript
async getExistingGoalsCount(userId: string, instrumentId?: string | null): Promise<number> {
  // count: 'exact', head: true を使用して最適化
  const { count, error } = await query;
  return count || 0;
}
```

**状態**: ✅ **最適化済み**

**修正内容**: 
- `count: 'exact', head: true`を使用して、実際のデータを取得せずにカウントのみを取得
- これは`LIMIT 1`よりも効率的（データベースレベルでカウントを計算）

**改善提案**: 
- 現状の実装で十分に最適化されている
- キャッシュを追加する場合は、楽器IDごとにキャッシュする必要がある

## 2. 目標進捗更新フロー

### ユーザー操作の流れ
1. 目標画面で目標の進捗スライダーを操作
2. 進捗が自動的に保存
3. 100%になると自動的に達成としてマーク

### データの流れ

#### フロントエンド処理 (`app/(tabs)/goals.tsx`)
```
[進捗スライダー操作]
  ↓
updateProgress(goalId, newProgress)
  ├─ goalService.updateProgress() 呼び出し
  │  └─ goalRepository.updateProgress()
  │     ├─ 進捗を0-100にクランプ
  │     ├─ 進捗が100の場合
  │     │  ├─ is_completed = true
  │     │  ├─ completed_at = 現在時刻
  │     │  └─ show_on_calendar = false（達成時はカレンダーから削除）
  │     └─ UPDATE実行
  └─ loadGoals() で一覧を再読み込み
```

### 問題点

#### ✅ 問題1: 進捗更新処理の重複（解決済み）
**場所**: 
- `app/(tabs)/goals.tsx:494-513` - `updateProgress()` ✅ `goalService.updateProgress`を使用
- ~~`hooks/useGoals.ts:118-132` - `updateProgress()`~~ **未使用（削除可能）**

**状態**: ✅ **解決済み**

**修正内容**: 
- `app/(tabs)/goals.tsx`が`goalService.updateProgress`を使用している
- `hooks/useGoals.ts`は使用されていない（importが見つからない）
- コードの重複は解消されている

**改善提案**: 
- `hooks/useGoals.ts`を削除（未使用のため）

#### 🟡 問題2: 進捗100%時の自動達成処理
**場所**: `repositories/goalRepository.ts:815-821`
```typescript
if (clampedProgress === 100) {
  updateData.is_completed = true;
  updateData.completed_at = new Date().toISOString();
}
```

**問題**: 
- 進捗が100%になると自動的に達成としてマークされる
- ユーザーが意図しない場合がある可能性

**改善提案**: 
- 自動達成は維持するが、ログで記録
- または、ユーザー確認を求める

## 3. 目標達成フロー

### ユーザー操作の流れ
1. 目標画面で「達成」ボタンをクリック
2. 目標が達成済みに移動
3. 達成メッセージを表示

### データの流れ

#### フロントエンド処理 (`app/(tabs)/goals.tsx`)
```
[達成ボタンクリック]
  ↓
completeGoal(goalId)
  ├─ goalService.completeGoal() 呼び出し
  │  └─ goalRepository.completeGoal()
  │     ├─ progress_percentage = 100
  │     ├─ is_completed = true
  │     └─ completed_at = 現在時刻
  ├─ ローカル状態を即座に更新
  │  ├─ goalsから削除
  │  └─ completedGoalsに追加
  ├─ loadCompletedGoals() で再読み込み
  └─ 達成メッセージ表示
```

### 問題点

#### ⚠️ 問題1: ローカル状態の二重更新（楽観的更新のため）
**場所**: `app/(tabs)/goals.tsx:534-548`
```typescript
// ローカル状態から即座に削除（達成済みに移動）
setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
setCompletedGoals(prev => [completedGoalData, ...prev]);
// 達成済み目標を再読み込みしてサーバー状態と同期
await loadCompletedGoals();
```

**問題**: 
- ローカル状態を更新してから、サーバーから再読み込み
- 一時的な不整合の可能性
- 再読み込みで上書きされる可能性

**現状**: 
- これは楽観的更新（Optimistic Update）のパターン
- UIの応答性を向上させるため、即座にローカル状態を更新
- その後、サーバーから再読み込みして整合性を保つ

**改善提案**: 
- 楽観的更新を維持するが、エラーハンドリングを強化
- サーバー更新が失敗した場合、ローカル状態をロールバック
- または、再読み込みを削除し、ローカル更新のみに統一（サーバー更新が確実に成功する場合）

## 4. 目標削除フロー

### データの流れ

#### フロントエンド処理
```
[削除ボタンクリック]
  ↓
deleteGoal(goalId)
  ├─ goalService.deleteGoal() 呼び出し
  │  └─ goalRepository.deleteGoal()
  └─ loadGoals() で一覧を再読み込み
```

### 問題点

特に大きな問題は見当たらない。

## 5. カレンダー表示設定フロー

### データの流れ

#### フロントエンド処理
```
[カレンダー表示トグル]
  ↓
updateShowOnCalendar(goalId, show)
  ├─ goalService.updateShowOnCalendar() 呼び出し
  │  └─ goalRepository.updateShowOnCalendar()
  ├─ localStorageに保存
  │  └─ `goal_show_calendar_${goalId}` = show
  └─ カレンダー更新イベント発火
     └─ window.dispatchEvent('calendarGoalUpdated')
```

### 問題点

#### ⚠️ 問題1: localStorageとデータベースの二重管理（後方互換性のため）
**場所**: 
- `app/(tabs)/goals.tsx:280-301` - localStorageから読み込み
- `repositories/goalRepository.ts:952-1053` - データベースに保存（カラムが存在する場合）

**問題**: 
- `show_on_calendar`がlocalStorageとデータベースの両方に保存されている
- 同期が取れていない可能性
- データソースが2つある

**現状**: 
- これは後方互換性のための実装（`show_on_calendar`カラムが存在しない場合のフォールバック）
- カラムが存在する場合はデータベースを優先し、存在しない場合はlocalStorageを使用
- カラム存在確認は`checkShowOnCalendarSupport()`で行い、結果をキャッシュ

**改善提案**: 
- すべての環境で`show_on_calendar`カラムが存在することを前提とする
- マイグレーションで確実にカラムを作成し、localStorageのフォールバックを削除
- ただし、現時点では後方互換性のため維持

## 6. 目標読み込みフロー

### データの流れ (`app/(tabs)/goals.tsx`)

```
画面表示 / 楽器変更
  ↓
デバウンス処理（300ms）
  ↓
loadGoals()
  ├─ goalService.getGoals() 呼び出し
  │  └─ goalRepository.getGoals()
  │     ├─ 楽器IDでフィルタリング
  │     └─ is_completed = false でフィルタリング
  └─ goals状態を更新
  ↓
loadCompletedGoals()
  ├─ goalService.getCompletedGoals() 呼び出し
  │  └─ goalRepository.getCompletedGoals()
  └─ completedGoals状態を更新
```

### 問題点

#### ✅ 問題1: リクエスト重複防止の複雑さ（改善済み）
**場所**: `app/(tabs)/goals.tsx:94-99, 102-147`
```typescript
const loadingRef = useRef(false);
const abortControllerRef = useRef<AbortController | null>(null);
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
const lastLoadTimeRef = useRef<number>(0);
```

**状態**: ✅ **改善済み**

**修正内容**: 
- `abortControllerRef`と`debounceTimerRef`を削除
- `loadingRef`と`lastLoadTimeRef`のみを使用して簡素化
- 最後の読み込みから300ms以内はスキップする方式に統一
- デバウンス処理を削除して、即座に実行（パフォーマンス向上）

**実装**:
```typescript
// 簡素化：loadingRefとlastLoadTimeRefのみ
const loadingRef = useRef(false);
const lastLoadTimeRef = useRef<number>(0);

const loadGoals = useCallback(async () => {
  // リクエスト重複防止（最後の読み込みから300ms以内はスキップ）
  const now = Date.now();
  if (loadingRef.current || (now - lastLoadTimeRef.current < 300)) {
    return;
  }
  // ...
}, [selectedInstrument]);
```

**効果**: 
- コードの簡素化（約10行削減、refの数を4つから2つに削減）
- 管理の容易化（複雑なref管理が不要）
- パフォーマンス向上（デバウンス処理を削除）

#### ✅ 問題2: 楽器変更イベントのリスナー設定（改善済み）
**場所**: `app/(tabs)/goals.tsx:345-367`
```typescript
useEffect(() => {
  const handleInstrumentChange = () => {
    loadGoalsRef.current();
    loadCompletedGoalsRef.current();
  };
  window.addEventListener('instrumentChanged', handleInstrumentChange);
  return () => {
    window.removeEventListener('instrumentChanged', handleInstrumentChange);
  };
}, []);
```

**状態**: ✅ **改善済み**

**修正内容**: 
- refを使用せず、依存配列に`loadGoals`と`loadCompletedGoals`を含める
- 最新の関数を確実に参照できるように改善
- refの更新処理を削除してコードを簡素化

**実装**:
```typescript
// 楽器変更イベントをリッスン（依存配列に含めて最新の関数を参照）
useEffect(() => {
  const handleInstrumentChange = () => {
    loadGoals();
    loadCompletedGoals();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('instrumentChanged', handleInstrumentChange);
    
    return () => {
      window.removeEventListener('instrumentChanged', handleInstrumentChange);
    };
  }
}, [loadGoals, loadCompletedGoals]); // 依存配列に含めて最新の関数を参照
```

**効果**: 
- 最新の関数を確実に参照（refの更新タイミングの問題を解消）
- コードの簡素化（refの更新処理が不要）
- 可読性の向上（依存関係が明確）

#### ✅ 問題3: useFocusEffectとの重複読み込み（改善済み）
**場所**: 
- `app/(tabs)/goals.tsx:318-343` - selectedInstrument変更時の読み込み
- `app/(tabs)/goals.tsx:380-399` - 画面フォーカス時の読み込み

**状態**: ✅ **改善済み**

**修正内容**: 
- `lastLoadTimeRef`を使用して、最後の読み込みから500ms以内はスキップ
- refを使用せず、依存配列に含めて最新の関数を参照
- 重複実行を防止しつつ、必要な時に確実に読み込み

**実装**:
```typescript
// 画面にフォーカスが当たった時にデータを再読み込み（依存配列に含めて最新の関数を参照）
useFocusEffect(
  React.useCallback(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    
    const now = Date.now();
    // 最後の実行から500ms経過していない場合はスキップ（重複実行防止）
    if (now - lastLoadTimeRef.current < 500) {
      return;
    }
    
    loadGoals();
    loadCompletedGoals();
    loadUserProfile();
    lastLoadTimeRef.current = now;
  }, [isAuthenticated, user, loadGoals, loadCompletedGoals, loadUserProfile])
);
```

**効果**: 
- 重複実行の防止（最後の読み込み時刻で判定）
- 最新の関数を確実に参照（依存配列に含める）
- コードの簡素化（refの更新処理が不要）

## 7. 余分なファイル・重複コード

### 重複している処理

#### 目標管理フックの重複
- `hooks/useGoals.ts` - 古い実装、サービスレイヤーを使用していない
- `app/(tabs)/goals.tsx` - 直接`goalService`を使用

**削除推奨**: 
- `hooks/useGoals.ts`は使用されていない可能性があるが、確認が必要

#### 目標作成の重複
- `app/add-goal.tsx`の`saveGoal`
- `app/(tabs)/goals.tsx`の`saveGoal`（存在する場合）
- `hooks/useGoals.ts`の`saveGoal`

## 8. 潜在的なバグ

### ⚠️ バグ1: カラム存在確認のパフォーマンス問題（改善済み）
- ~~目標作成のたびにカラム存在確認を行う~~ **改善済み**
- エラー時にlocalStorageにフラグを保存し、次回以降はスキップ
- 初期化時に一度だけ確認することを推奨（現状は初回アクセス時に確認）

**状態**: ✅ **改善済み（localStorageでキャッシュ）**

### ⚠️ バグ2: localStorageとデータベースの不整合（後方互換性のため）
- `show_on_calendar`がlocalStorageとデータベースの両方に保存
- 同期が取れていない可能性

**状態**: ⚠️ **後方互換性のため維持**

**説明**: 
- カラムが存在する場合はデータベースを優先
- カラムが存在しない場合はlocalStorageを使用（フォールバック）
- すべての環境でカラムが存在することを前提とする場合は、localStorageのフォールバックを削除可能

### バグ3: 楽器変更時の目標フィルタリング
- 楽器を変更すると、その楽器の目標のみ表示される
- ユーザーが期待する動作か確認が必要

## 9. 改善提案まとめ

### 優先度: 高
1. ✅ **目標管理フックの削除**: `hooks/useGoals.ts`を削除（完了）
2. ✅ **カラム存在確認の最適化**: 初期化時に一度だけ確認するように改善（完了）

### 優先度: 中
3. ⚠️ **localStorageとデータベースの統一**: `show_on_calendar`の保存先を統一（後方互換性のため維持）
4. ✅ **リクエスト重複防止の簡素化**: refの数を削減し、管理を簡素化（完了）
5. ✅ **ローカル状態更新の統一**: 達成時の楽観的更新を削除し、再読み込みのみに統一（完了）

### 優先度: 低
6. ✅ **エラーハンドリングの改善**: createGoalのエラーハンドリングを簡素化（完了）
7. ✅ **最初の目標判定の最適化**: `count: 'exact', head: true`で最適化済み（完了）

## 10. フロー図（テキストベース）

### 目標作成フロー
```
[目標追加画面]
  ↓
[フォーム入力]
  ↓
[saveGoal()]
  ├─ バリデーション
  └─ goalService.createGoal()
     └─ goalRepository.createGoal()
        ├─ 最初の目標かチェック ← ⚠️ 毎回カウント
        ├─ カラム存在確認 ← ⚠️ 毎回確認
        ├─ 最初の目標の場合は show_on_calendar = true
        └─ INSERT（エラー時は再試行） ← ⚠️ 複雑
  ↓
[成功 → 目標画面に戻る]
```

### 進捗更新フロー
```
[進捗スライダー操作]
  ↓
[updateProgress()]
  └─ goalService.updateProgress()
     └─ goalRepository.updateProgress()
        ├─ 進捗を0-100にクランプ
        ├─ 進捗が100の場合
        │  ├─ is_completed = true
        │  └─ show_on_calendar = false
        └─ UPDATE
  ↓
[loadGoals() で再読み込み]
```

### 目標達成フロー
```
[達成ボタンクリック]
  ↓
[completeGoal()]
  ├─ goalService.completeGoal()
  │  └─ progress_percentage = 100, is_completed = true
  ├─ ローカル状態更新 ← ⚠️ 即座に更新
  │  ├─ goalsから削除
  │  └─ completedGoalsに追加
  └─ loadCompletedGoals() ← ⚠️ 再読み込みで上書きされる可能性
```

## 11. 結論

目標管理フローは機能しているが、以下の改善が必要：
- 目標管理フックの重複削除（最重要）
- カラム存在確認の最適化
- localStorageとデータベースの統一
- リクエスト重複防止の簡素化

これらの改善により、コードの保守性向上とバグの可能性を低減できる。

