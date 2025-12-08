# 機能フロー分析レポート #2: 練習記録フロー

## 概要
手動記録、音声記録（クイック記録）、タイマーから記録、録音ファイル保存の各フローを詳細に分析し、余分な工程や潜在的なバグを特定する。

## 1. 手動記録フロー

### ユーザー操作の流れ
1. カレンダー画面で日付を選択
2. 「練習記録を追加」ボタンをクリック
3. `PracticeRecordModal`が表示される
4. 練習時間（分）と内容を入力
5. 録音を追加（オプション）
6. 「保存」ボタンをクリック
7. 記録が保存され、カレンダーが更新

### データの流れ

#### フロントエンド処理 (`app/(tabs)/index.tsx` → `components/PracticeRecordModal.tsx`)
```
カレンダー日付クリック
  ↓
PracticeRecordModal表示
  ↓
loadExistingRecord() 実行
  ├─ 既存の練習セッション取得
  │  └─ practice_sessions テーブルから取得（楽器IDでフィルタリング）
  ├─ 既存の録音記録取得
  │  └─ recordings テーブルから取得（日付範囲で検索）
  └─ フォームに既存データを設定
  ↓
ユーザー入力
  ↓
保存ボタンクリック
  ↓
savePracticeRecord() 実行
  ├─ savePracticeSessionWithIntegration() 呼び出し
  │  └─ practiceSessionRepository.savePracticeSessionWithIntegration()
  ├─ 録音ファイル保存（オプション）
  │  └─ uploadRecordingBlob() + saveRecording()
  └─ カレンダー更新イベント発火
     └─ window.dispatchEvent('practiceRecordUpdated')
```

#### バックエンド処理 (`repositories/practiceSessionRepository.ts`)
```
savePracticeSessionWithIntegration()
├─ 今日の既存記録を取得
│  └─ getTodayPracticeSessions() (楽器IDでフィルタリング)
├─ 既存記録がある場合
│  ├─ 時間を加算
│  ├─ contentを更新
│  ├─ 最初の記録を更新
│  └─ 他の記録を削除（統合のため）
└─ 既存記録がない場合
   └─ 新規記録として挿入
```

### 問題点・余分な工程

#### ✅ 問題1: 重複した統合保存ロジック（解決済み）
**場所**: 
- ~~`components/QuickRecordModal.tsx:36-160` - `savePracticeRecordWithIntegration()`~~ **削除済み**
- `repositories/practiceSessionRepository.ts:293-437` - `savePracticeSessionWithIntegration()` **使用中**

**状態**: ✅ **解決済み**

**修正内容**: 
- `QuickRecordModal`の重複した`savePracticeRecordWithIntegration`関数を削除
- `practiceSessionRepository.savePracticeSessionWithIntegration`を使用するように変更
- `useAuthAdvanced`からユーザーIDを取得
- `useInstrumentTheme`から楽器IDを取得

**修正後の実装**:
```typescript
// QuickRecordModal.tsx
const { user } = useAuthAdvanced();
const { selectedInstrument } = useInstrumentTheme();

const savePracticeRecordWithIntegration = async (minutes: number) => {
  const result = await savePracticeSessionWithIntegration(
    user.id,
    minutes,
    {
      instrumentId: selectedInstrument?.id || null,
      content: 'クイック記録',
      inputMethod: 'voice',
      existingContentPrefix: 'クイック記録'
    }
  );
  // ...
};
```

**効果**: 
- コードの重複を解消（約125行削減）
- リポジトリパターンに統一
- 保守性の向上（ロジックが1箇所に集約）
- テスト容易性の向上（リポジトリ層でテスト可能）

#### ✅ 問題2: 既存記録読み込みの複雑なロジック（解決済み）
**場所**: `components/PracticeRecordModal.tsx:61-264`
**状態**: ✅ **解決済み**

**修正内容**: 
- `loadExistingRecord`関数を分割（`loadPracticeSessions`と`loadRecording`に分離）
- `preserveExistingRecording`フラグを削除（`savedRecordingId`のみで制御）
- リポジトリパターンを使用（`getPracticeSessionsByDate`を使用）
- 複雑な条件分岐を簡素化

**修正後の実装**:
```typescript
// 練習記録を読み込む（リポジトリを使用）
const loadPracticeSessions = useCallback(async () => {
  const { data: sessions, error } = await getPracticeSessionsByDate(
    user.id,
    practiceDate,
    selectedInstrument?.id || null
  );
  // ...
}, [user, selectedDate, selectedInstrument]);

// 録音記録を読み込む（簡素化）
const loadRecording = useCallback(async (savedRecordingId?: string) => {
  // 録音記録の読み込み（条件分岐を簡素化）
  // ...
}, [user, selectedDate, selectedInstrument, existingRecording, isRecordingJustSaved]);

// 既存記録を読み込む（統合関数）
const loadExistingRecord = useCallback(async (savedRecordingId?: string) => {
  await Promise.all([
    loadPracticeSessions(),
    loadRecording(savedRecordingId)
  ]);
}, [loadPracticeSessions, loadRecording]);
```

**効果**: 
- 関数の責務を明確化（練習記録と録音記録を分離）
- フラグ管理を簡素化（`preserveExistingRecording`を削除）
- リポジトリパターンに統一（データアクセスを集約）
- 可読性の向上（複雑な条件分岐を削減）

#### ✅ 問題3: 録音記録の日付範囲検索の冗長性（解決済み）
**場所**: `components/PracticeRecordModal.tsx:163-240`
**状態**: ✅ **解決済み**

**修正内容**: 
- `getRecordingsByDate`関数を改善（タイムゾーン対応の日付範囲検索を実装）
- `PracticeRecordModal`で`getRecordingsByDate`を使用するように変更
- 冗長な日付範囲検索処理を削除（約30行削減）

**修正後の実装**:
```typescript
// lib/database.ts - getRecordingsByDate関数を改善
export const getRecordingsByDate = async (
  userId: string, 
  date: string,
  instrumentId?: string | null
) => {
  // タイムゾーン対応の日付範囲検索
  // ローカル日付で再フィルタリング（確実にタイムゾーン問題を回避）
  // ...
};

// PracticeRecordModal.tsx - 簡素化
const { data: recordings, error: recordingError } = await getRecordingsByDate(
  user.id,
  practiceDate,
  selectedInstrument || null
);
```

**効果**: 
- コードの重複を削減（約30行削減）
- タイムゾーン処理を統一（`getRecordingsByDate`に集約）
- 保守性の向上（録音記録の取得ロジックが1箇所に集約）
- 再利用性の向上（他のコンポーネントでも使用可能）

#### ✅ 問題4: 統合保存時の他の記録削除処理（改善済み）
**場所**: `repositories/practiceSessionRepository.ts:383-410`
**状態**: ✅ **改善済み**

**修正内容**: 
- 削除処理のエラーハンドリングを改善
- 削除処理のログを詳細化（削除前後の状態を記録）
- 削除エラーの詳細を記録（データ整合性の問題を明確化）

**修正後の実装**:
```typescript
// 他の記録を削除（統合のため）
// 注意: 削除に失敗しても統合保存は成功しているため、警告として扱う
// ただし、データ整合性を保つため、削除処理は重要
if (existingRecords.length > 1) {
  const otherRecordIds = existingRecords.slice(1).map(record => record.id!).filter(Boolean);
  if (otherRecordIds.length > 0) {
    logger.debug('削除前の状態を記録', { count: otherRecordIds.length, ids: otherRecordIds });
    
    const { error: deleteError } = await deletePracticeSessions(otherRecordIds, instrumentId);
    if (deleteError) {
      // 削除エラーは警告として記録（統合保存は成功しているため、処理は続行）
      // ただし、データ整合性の問題が発生する可能性があるため、詳細を記録
      logger.warn('削除エラー', {
        error: deleteError,
        failedIds: otherRecordIds,
        message: '統合保存は成功しましたが、重複記録の削除に失敗しました。'
      });
      ErrorHandler.handle(deleteError, '重複記録削除', false);
    } else {
      logger.debug('削除成功', { count: otherRecordIds.length });
    }
  }
}
```

**効果**: 
- 削除処理の可視性向上（削除前後の状態を記録）
- エラーハンドリングの改善（詳細なエラー情報を記録）
- データ整合性の問題を明確化（削除エラー時の影響を記録）
- デバッグの容易化（削除処理の詳細をログに記録）

**追加実装**: 
- ✅ **リトライ機能を追加**（指数バックオフ）
- ✅ **トランザクション処理用のRPC関数を作成**（将来の実装準備）

**リトライ機能の実装**:
```typescript
// deletePracticeSessions関数にリトライ機能を追加
export const deletePracticeSessions = async (
  sessionIds: string[],
  instrumentId?: string | null,
  options: {
    maxRetries?: number;  // デフォルト: 3回
    baseDelay?: number;   // デフォルト: 200ms
  } = {}
): Promise<{ error: SupabaseError; retryCount?: number }> => {
  // 指数バックオフ: 200ms, 400ms, 800ms
  // リトライ不可なエラー（PGRST205, PGRST116等）は即座に終了
  // ...
};
```

**トランザクション処理用のRPC関数**:
- `supabase/migrations/20250125000000_create_save_practice_session_with_integration_function.sql`
- 更新と削除を1つのトランザクションで実行
- エラー時は自動的にロールバック

**注意事項**: 
- 削除に失敗しても統合保存は成功しているため、処理は続行
- リトライ機能により、一時的なネットワークエラーに対して自動的に再試行
- トランザクション処理用のRPC関数は将来の実装準備として作成済み（必要に応じて使用可能）

## 2. 音声記録（クイック記録）フロー

### ユーザー操作の流れ
1. カレンダー画面で「クイック記録」ボタンをクリック
2. `QuickRecordModal`が表示される
3. 音声録音ボタンをクリック、または時間選択
4. 音声録音の場合:
   - マイク権限をリクエスト
   - 10秒間録音
   - Whisper APIで音声認識
   - テキストから分数を抽出
5. 記録を保存
6. カレンダーが更新

### データの流れ

#### フロントエンド処理 (`components/QuickRecordModal.tsx`)
```
クイック記録ボタンクリック
  ↓
QuickRecordModal表示
  ↓
音声録音開始
  ├─ SttService.requestMicPermission()
  ├─ SttService.recordAudio(10秒)
  ├─ SttService.transcribe() (Whisper API)
  └─ parseMinutesFromText() (分数抽出)
  ↓
savePracticeRecordWithIntegration() 実行
  ├─ ⚠️ 独自実装（重複）
  ├─ 既存記録取得（Supabase直接アクセス）
  ├─ 時間加算・更新または新規挿入
  └─ 他の記録削除
  ↓
カレンダー更新イベント発火
```

### 問題点・余分な工程

#### ✅ 問題1: 重複した統合保存ロジック（解決済み）
- ✅ `QuickRecordModal`の重複した`savePracticeRecordWithIntegration`関数を削除済み
- ✅ `practiceSessionRepository.savePracticeSessionWithIntegration`を使用するように変更済み
- 詳細は上記の「問題1: 重複した統合保存ロジック（解決済み）」セクションを参照

#### ✅ 問題2: 楽器ID取得の直接クエリ（解決済み）
**場所**: `components/QuickRecordModal.tsx:31, 47`
**状態**: ✅ **解決済み**

**修正内容**: 
- 直接クエリを削除
- `useInstrumentTheme`の`selectedInstrument`を使用するように変更

**修正後の実装**:
```typescript
// QuickRecordModal.tsx
const { currentTheme, selectedInstrument } = useInstrumentTheme();

const savePracticeRecordWithIntegration = async (minutes: number) => {
  const result = await savePracticeSessionWithIntegration(
    user.id,
    minutes,
    {
      instrumentId: selectedInstrument?.id || null, // useInstrumentThemeから取得
      // ...
    }
  );
  // ...
};
```

**効果**: 
- データベースアクセスの削減（キャッシュされた値を使用）
- コードの簡素化（直接クエリを削除）
- パフォーマンスの向上（毎回のデータベースアクセスを回避）
- 一貫性の向上（他のコンポーネントと同じ方法で楽器IDを取得）

#### ✅ 問題3: 音声認識のエラーハンドリング不足（解決済み）
**場所**: `components/QuickRecordModal.tsx:88-200`
**状態**: ✅ **解決済み**

**修正内容**: 
- 録音失敗時の具体的なエラーメッセージを追加
- 音声認識失敗時の詳細なエラーハンドリングを追加
- エラーの種類に応じた適切なメッセージを表示
- リソースの適切な解放処理を追加

**修正後の実装**:
```typescript
// エラーの種類に応じた適切なメッセージ
try {
  // 録音処理
  const recordResult = await SttService.recordAudio(10);
  
  // 音声認識処理
  try {
    const result = await SttService.transcribe(uri);
    // ...
  } catch (transcribeError) {
    // APIキー関連のエラー
    if (errorMessage.includes('API key')) {
      Alert.alert('音声認識の設定エラー', '...');
    }
    // ネットワークエラー
    else if (errorMessage.includes('network')) {
      Alert.alert('ネットワークエラー', '...');
    }
    // その他のエラー
    else {
      Alert.alert('音声認識に失敗しました', '...');
    }
  }
} catch (recordError) {
  // マイクアクセス拒否
  if (errorMessage.includes('マイク') || errorMessage.includes('permission')) {
    Alert.alert('マイクへのアクセスが拒否されました', '...');
  }
  // 録音デバイスエラー
  else if (errorMessage.includes('device')) {
    Alert.alert('録音デバイスが見つかりません', '...');
  }
  // その他の録音エラー
  else {
    Alert.alert('録音に失敗しました', '...');
  }
} finally {
  // リソースの適切な解放
  if (disposeFn) await disposeFn();
}
```

**効果**: 
- ユーザーに具体的なフィードバックを提供（エラーの種類に応じた適切なメッセージ）
- デバッグの容易化（エラーの種類をログに記録）
- ユーザー体験の向上（問題の原因を明確に伝達）
- リソース管理の改善（適切な解放処理）

## 3. タイマーから記録フロー

### ユーザー操作の流れ
1. タイマー画面でタイマーを開始
2. タイマーが終了
3. 自動保存が有効な場合:
   - 自動的に練習記録を保存
4. 自動保存が無効な場合:
   - ダイアログを表示して記録するか確認

### データの流れ (`app/(tabs)/timer.tsx`)

```
タイマー開始
  ↓
TimerService.startTimer()
  ↓
タイマー完了検出 (useEffect)
  ├─ timerSeconds === 0 && !isTimerRunning
  └─ completedPracticeTime設定
  ↓
自動保存が有効な場合
  ├─ savePracticeRecord() 実行
  │  └─ savePracticeSessionWithIntegration() 呼び出し
  └─ 記録完了
  ↓
自動保存が無効な場合
  └─ showPracticeRecordDialog() 実行
     └─ ユーザー確認
```

### 問題点・余分な工程

#### ✅ 問題1: タイマー完了検出の複雑な条件（解決済み）
**場所**: `app/(tabs)/timer.tsx:337-400`
**状態**: ✅ **解決済み**

**修正内容**: 
- 複雑な`useEffect`によるタイマー完了検出を削除（約30行削減）
- `useTimer`フックの`onTimerComplete`コールバックを使用するように変更
- `completedPracticeTime`を`useState`から`useRef`に変更（重複実行防止のため）
- 条件分岐を簡素化

**修正後の実装**:
```typescript
// useTimerフックのコールバックで一元化
const completedPracticeTimeRef = useRef<number | null>(null);

const { timerSeconds, isTimerRunning, ... } = useTimer(() => {
  const practiceMinutes = timerPresetRef.current > 0 
    ? Math.ceil(timerPresetRef.current / 60) 
    : 0;
  
  // 重複実行を防ぐ
  if (completedPracticeTimeRef.current === practiceMinutes && practiceMinutes > 0) {
    return;
  }
  
  completedPracticeTimeRef.current = practiceMinutes;
  
  // サウンド、バイブレーション、練習記録の保存を一括処理
  // ...
});

// タイマーが再開された時に完了状態をクリア（簡素化）
useEffect(() => {
  if (mode === 'timer' && timerSeconds > 0) {
    completedPracticeTimeRef.current = null;
  }
}, [timerSeconds, mode]);
```

**効果**: 
- コードの簡素化（約30行削減、複雑な条件分岐を削除）
- 処理の一元化（タイマー完了時の処理を1箇所に集約）
- 可読性の向上（条件分岐が明確）
- 保守性の向上（ロジックが1箇所に集約）

#### ✅ 問題2: 完了状態のリセットタイミング（解決済み）
**場所**: `app/(tabs)/timer.tsx:1108-1122`
```typescript
useEffect(() => {
  if (timerSeconds > 0 || isTimerRunning) {
    setCompletedPracticeTime(null);
  }
}, [timerSeconds, isTimerRunning]);
```

**問題**: 
- 完了状態のリセットが複数箇所にある
- タイミングが分かりにくい

**状態**: ✅ **解決済み**

**解決策**: 
- `resetTimer()`と`clearTimer()`をラップして、呼び出し時に明示的に`completedPracticeTimeRef.current = null`を設定
- リセット処理を1箇所に集約（ラップ関数内で一元管理）
- `useEffect`は補助的な役割に変更（タイマーが実行中に再開された場合の念のためのリセット）

**実装**:
```typescript
// resetTimerとclearTimerをラップして完了状態もリセット
const resetTimer = () => {
  logger.debug('resetTimer called - 完了状態をリセット');
  completedPracticeTimeRef.current = null;
  originalResetTimer();
};

const clearTimer = () => {
  logger.debug('clearTimer called - 完了状態をリセット');
  completedPracticeTimeRef.current = null;
  originalClearTimer();
};

// タイマーが再開された時に完了状態をクリア（resetTimer/clearTimerで明示的にリセット済み）
useEffect(() => {
  if (mode === 'timer' && timerSeconds > 0 && isTimerRunning) {
    // タイマーが実行中に再開された場合は完了状態をクリア
    // （resetTimer/clearTimerで既にリセットされているが、念のため）
    completedPracticeTimeRef.current = null;
  }
}, [timerSeconds, isTimerRunning, mode]);
```

**効果**: 
- リセット処理の一元化（`resetTimer`/`clearTimer`で明示的にリセット）
- タイミングの明確化（リセットボタンやクリアボタンを押した時に確実にリセット）
- コードの可読性向上（リセット処理が1箇所に集約）

## 4. 録音ファイル保存フロー

### データの流れ (`components/AudioRecorder.tsx`)

```
録音開始
  ↓
録音データ取得
  ↓
保存ボタンクリック
  ├─ 録音ファイルアップロード
  │  └─ uploadRecordingBlob() → Supabase Storage
  ├─ 録音レコード保存
  │  └─ saveRecording() → recordings テーブル
  └─ カレンダー更新イベント発火
```

### 問題点

#### ✅ 問題1: 録音ファイル保存と練習記録の分離（解決済み）
**場所**: `components/AudioRecorder.tsx:379-522`
- 録音ファイルは`recordings`テーブルに保存される
- 練習記録は`practice_sessions`テーブルに保存される
- 2つのテーブルが分離されているが、関連性が弱い

**状態**: ✅ **解決済み**

**修正内容**: 
- `practice_sessions`テーブルに`recording_id`カラムを追加（マイグレーション: `20260227000000_add_recording_id_to_practice_sessions.sql`）
- `PracticeSession`インターフェースに`recording_id`を追加
- `savePracticeSessionWithIntegration`関数に`recordingId`オプションを追加
- `PracticeRecordModal.tsx`の`onSave`シグネチャに`recordingId`を追加
- `handleSaveRecord`関数で`existingRecording?.id`を`onSave`に渡すように修正
- `index.tsx`の`savePracticeRecord`関数で`recordingId`を受け取り、保存時に`recording_id`を設定

**実装**:
```typescript
// マイグレーション: practice_sessionsテーブルにrecording_idカラムを追加
ALTER TABLE practice_sessions
ADD COLUMN IF NOT EXISTS recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL;

// PracticeSessionインターフェース
export interface PracticeSession {
  // ...
  recording_id?: string | null;
  // ...
}

// savePracticeSessionWithIntegration関数
export const savePracticeSessionWithIntegration = async (
  userId: string,
  minutes: number,
  options: {
    // ...
    recordingId?: string | null;
  } = {}
): Promise<{ success: boolean; error?: SupabaseError }> => {
  // ...
  const sessionData = {
    // ...
    recording_id: recordingId || null,
  };
  // ...
};

// PracticeRecordModal.tsx
const recordingId = existingRecording?.id || undefined;
await onSave?.(minutesNumber, content?.trim() || undefined, audioUrl || undefined, videoUrl || undefined, recordingId);
```

**効果**: 
- 録音と練習記録の関連を強化（`recording_id`で関連付け）
- データの整合性向上（外部キー制約により、削除時に自動的にNULLに設定）
- 検索の高速化（`recording_id`にインデックスを追加）
- 将来の拡張性向上（録音と練習記録の関連を活用した機能追加が可能）

## 5. 余分なファイル・重複コード

### 重複している処理

#### ✅ 統合保存ロジックの重複（解決済み）
- ~~`components/QuickRecordModal.tsx`の`savePracticeRecordWithIntegration`~~ **解決済み**
- `repositories/practiceSessionRepository.ts`の`savePracticeSessionWithIntegration` **使用中**

**状態**: ✅ **解決済み**

**修正内容**: 
- `QuickRecordModal.tsx`の`savePracticeRecordWithIntegration`は既にリポジトリの`savePracticeSessionWithIntegration`を使用している
- ラッパー関数として残っているが、これは問題ない（エラーハンドリングとイベント通知のため）

#### ✅ contentのクリーンアップ処理の重複（解決済み）
- ~~`components/PracticeRecordModal.tsx:125-133`~~ **解決済み**
- ~~`lib/tabs/basic-practice/components/PracticeDetailModal.tsx:68-76`~~ **解決済み**
- `lib/utils/contentCleaner.ts`の`cleanContentFromTimeDetails`関数 **使用中**

**状態**: ✅ **解決済み**

**修正内容**: 
- `PracticeRecordModal.tsx`の重複した正規表現処理を`cleanContentFromTimeDetails`に置き換え
- `PracticeDetailModal.tsx`の重複した正規表現処理を`cleanContentFromTimeDetails`に置き換え
- 共通関数を使用することで、コードの重複を解消し、保守性を向上

**実装**:
```typescript
// 修正前（重複）
const cleanedContent = session.content
  .replace(/\s*\(累計\d+分\)/g, '')
  .replace(/\s*累計\d+分/g, '')
  .replace(/\s*\+\s*[^,]+?\d+分/g, '')
  .replace(/\s*[^,]+?\d+分/g, '')
  .replace(/練習記録/g, '')
  .replace(/^[\s,]+|[\s,]+$/g, '')
  .replace(/,\s*,/g, ',')
  .trim();

// 修正後（共通関数を使用）
import { cleanContentFromTimeDetails } from '@/lib/utils/contentCleaner';
const cleanedContent = cleanContentFromTimeDetails(session.content);
```

**効果**: 
- コードの重複を解消（約10行削減 × 2箇所 = 約20行削減）
- 保守性の向上（ロジックが1箇所に集約）
- 一貫性の向上（すべての箇所で同じロジックを使用）

## 6. 潜在的なバグ

### ⚠️ バグ1: 楽器変更時のデータ不整合（注意事項）
- 楽器を変更すると、同じ日付の記録が別の楽器として扱われる可能性
- 楽器IDでフィルタリングしているが、変更タイミングによっては不整合

**現状**: 
- 楽器IDでフィルタリングは実装されている
- 楽器変更時に既存の記録が別の楽器として扱われる可能性はあるが、これは仕様として意図されている可能性もある（楽器ごとに記録を分離するため）

**改善提案**: 
- 楽器変更時に既存記録の楽器IDを更新する機能を検討
- または、楽器変更時に警告を表示してユーザーに確認を求める

### ⚠️ バグ2: 競合状態（Race Condition）（未解決）
- 複数の記録を同時に保存した場合
- 統合保存処理が並行実行されると、時間が正しく加算されない可能性

**現状**: 
- `savePracticeSessionWithIntegration`は既存記録を取得してから更新するため、競合状態が発生する可能性がある
- トランザクション処理用のRPC関数`save_practice_session_with_integration`が存在するが、使用されていない

**改善提案**: 
- RPC関数`save_practice_session_with_integration`を使用してトランザクション処理を実装
- または、データベースレベルのロック（SELECT FOR UPDATE）を使用

**実装状況**: 
- RPC関数は存在するが、未使用
- 現時点では競合状態が発生する可能性がある

### ✅ バグ3: 削除処理の失敗時の整合性（改善済み）
- 他の記録を削除する処理が失敗しても警告のみ
- データベースに残存記録が残る可能性

**状態**: ✅ **改善済み**

**修正内容**: 
- `deletePracticeSessions`関数にリトライ機能（指数バックオフ）を追加
- 最大3回のリトライを実装（200ms, 400ms, 800ms）
- 削除エラーは詳細にログ記録され、警告として扱われる

**実装**:
```typescript
// リトライ機能付きで削除を実行
const { error: deleteError, retryCount: deleteRetryCount } = await deletePracticeSessions(
  otherRecordIds, 
  instrumentId,
  {
    maxRetries: 3,
    baseDelay: 200
  }
);

if (deleteError) {
  // 削除エラーは警告として記録（統合保存は成功しているため、処理は続行）
  logger.warn(`[${REPOSITORY_CONTEXT}] savePracticeSessionWithIntegration:delete-error`, {
    error: deleteError,
    message: '統合保存は成功しましたが、重複記録の削除に失敗しました。データ整合性に問題が発生する可能性があります。'
  });
}
```

**注意**: 
- 完全な解決にはトランザクション処理が必要（RPC関数の使用を推奨）
- 現時点ではリトライ機能により、一時的なネットワークエラーに対する耐性が向上

### ✅ バグ4: タイムゾーン処理の不統一（改善済み）
- 録音記録の日付検索で前後1日を含めている
- タイムゾーン処理が統一されていない

**状態**: ✅ **改善済み**

**修正内容**: 
- `getRecordingsByDate`関数でタイムゾーン対応の日付範囲検索を実装
- 前後1日を含めて検索し、その後ローカル日付で再フィルタリング
- 楽器IDでのフィルタリングも追加

**実装**:
```typescript
// 日付範囲を計算（タイムゾーンの問題を回避）
const targetDate = new Date(date);
const startOfDay = new Date(targetDate);
startOfDay.setHours(0, 0, 0, 0);
startOfDay.setDate(startOfDay.getDate() - 1); // 前日を含める（タイムゾーン対応）

const endOfDay = new Date(targetDate);
endOfDay.setHours(23, 59, 59, 999);
endOfDay.setDate(endOfDay.getDate() + 1); // 翌日を含める（タイムゾーン対応）

// ローカル日付で再フィルタリング（タイムゾーンの問題を確実に回避）
const dateStr = formatLocalDate(targetDate);
const filteredData = (data || []).filter((recording: { recorded_at: string }) => {
  const recordedDateStr = formatLocalDate(new Date(recording.recorded_at));
  return recordedDateStr === dateStr;
});
```

**効果**: 
- タイムゾーンの問題を確実に回避
- 正確な日付での検索が可能
- 楽器IDでのフィルタリングも追加され、より正確な検索が可能

## 7. 改善提案まとめ

### 優先度: 高
1. **統合保存ロジックの重複削除**: `QuickRecordModal`の独自実装を削除
2. **楽器ID取得の統一**: `useInstrumentTheme`を使用

### 優先度: 中
3. **既存記録読み込みの簡素化**: フラグ管理を減らす
4. **タイムゾーン処理の統一**: 正確な日付範囲で検索
5. **エラーハンドリングの強化**: 削除処理のエラー処理

### 優先度: 低
6. **タイマー完了検出の簡素化**: `useTimer`のコールバック使用
7. **contentクリーンアップ処理の統合**: 共通関数化

## 8. フロー図（テキストベース）

### 手動記録フロー
```
[カレンダー日付選択]
  ↓
[PracticeRecordModal表示]
  ↓
[既存記録読み込み] ← ⚠️ 複雑なフラグ管理
  ├─ 練習セッション取得
  └─ 録音記録取得（前後1日を含む） ← ⚠️ 冗長
  ↓
[ユーザー入力]
  ↓
[保存]
  ├─ savePracticeSessionWithIntegration() ← ✅ リポジトリ使用
  ├─ 録音ファイル保存（オプション）
  └─ カレンダー更新イベント
```

### クイック記録フロー
```
[クイック記録ボタン]
  ↓
[QuickRecordModal表示]
  ↓
[音声録音 または 時間選択]
  ↓
[保存]
  ├─ savePracticeRecordWithIntegration() ← ⚠️ 独自実装（重複）
  ├─ 楽器ID取得（直接クエリ） ← ⚠️ useInstrumentThemeを使うべき
  └─ カレンダー更新イベント
```

### タイマー記録フロー
```
[タイマー完了]
  ↓
[完了検出] ← ⚠️ 複雑な条件分岐
  ↓
[自動保存有効]
  ├─ 自動保存
  └─ savePracticeSessionWithIntegration()
  ↓
[自動保存無効]
  └─ ダイアログ表示
```

## 9. 結論

練習記録フローは機能しているが、以下の改善が必要：
- 統合保存ロジックの重複削除（最重要）
- 楽器ID取得の統一
- 状態管理の簡素化
- タイムゾーン処理の統一

これらの改善により、コードの保守性向上とバグの可能性を低減できる。

