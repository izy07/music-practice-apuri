# パフォーマンス・セキュリティ・クラッシュ・型安全性分析レポート

## 1. 練習記録のデータ取得を高速化する方法

### 現在の実装状況

✅ **既に実装されている最適化:**
- 必要なカラムのみ取得（`select`で特定カラムのみ指定）
- 期間制限（30日、2年など）
- 件数制限（100件、1000件など）
- キャッシュ機能（メモリキャッシュ、ローカルストレージ）

### 改善提案

#### 1.1 データベースインデックスの追加

**問題点:**
- `practice_sessions`テーブルに適切なインデックスが設定されていない可能性がある
- `user_id`、`practice_date`、`instrument_id`の組み合わせで検索が頻繁に行われる

**推奨インデックス:**
```sql
-- 複合インデックス（最も頻繁に使用されるクエリパターン）
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_date_instrument 
ON practice_sessions(user_id, practice_date DESC, instrument_id);

-- 単一インデックス（個別の検索用）
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id 
ON practice_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_practice_date 
ON practice_sessions(practice_date DESC);
```

**効果:** クエリ速度が10-100倍向上する可能性

#### 1.2 集計クエリの最適化

**現在の問題:**
- 統計画面で全データを取得してからJavaScript側で集計している
- 大量のデータ転送が発生

**改善案:**
```typescript
// データベース側で集計を行う
const { data } = await supabase
  .from('practice_sessions')
  .select('practice_date, duration_minutes')
  .eq('user_id', userId)
  .gte('practice_date', startDate)
  .order('practice_date', { ascending: false });
  
// ❌ 現在: クライアント側で集計
const total = data.reduce((sum, record) => sum + record.duration_minutes, 0);

// ✅ 改善: データベース側で集計（PostgreSQLの集計関数を使用）
const { data } = await supabase.rpc('get_practice_statistics', {
  p_user_id: userId,
  p_start_date: startDate,
  p_end_date: endDate
});
```

**PostgreSQL関数例:**
```sql
CREATE OR REPLACE FUNCTION get_practice_statistics(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_minutes NUMERIC,
  practice_days INTEGER,
  avg_minutes_per_day NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(duration_minutes), 0)::NUMERIC as total_minutes,
    COUNT(DISTINCT practice_date)::INTEGER as practice_days,
    CASE 
      WHEN COUNT(DISTINCT practice_date) > 0 
      THEN COALESCE(SUM(duration_minutes), 0)::NUMERIC / COUNT(DISTINCT practice_date)
      ELSE 0
    END as avg_minutes_per_day
  FROM practice_sessions
  WHERE user_id = p_user_id
    AND practice_date >= p_start_date
    AND (p_end_date IS NULL OR practice_date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.3 ページネーションの実装

**現在の問題:**
- `limit(100)`で制限しているが、ページネーションが実装されていない
- 100件を超えるデータが必要な場合に取得できない

**改善案:**
```typescript
// カーソルベースのページネーション
export const getPracticeSessionsPaginated = async (
  userId: string,
  cursor?: string, // 最後に取得したレコードのID
  limit: number = 50
): Promise<{ data: PracticeSession[]; nextCursor?: string }> => {
  let query = supabase
    .from('practice_sessions')
    .select('id, practice_date, duration_minutes, input_method, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // 1件多く取得して次のページがあるか確認
  
  if (cursor) {
    query = query.lt('created_at', cursor); // カーソルより前のデータを取得
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  const hasNextPage = data && data.length > limit;
  const results = hasNextPage ? data.slice(0, limit) : (data || []);
  const nextCursor = hasNextPage && results.length > 0 
    ? results[results.length - 1].created_at 
    : undefined;
  
  return { data: results, nextCursor };
};
```

#### 1.4 キャッシュ戦略の改善

**現在の問題:**
- キャッシュの有効期限が設定されていない
- データ更新時にキャッシュが無効化されない

**改善案:**
```typescript
// TTL付きキャッシュ
class PracticeDataCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private TTL = 5 * 60 * 1000; // 5分
  
  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  invalidate(pattern: string) {
    // パターンに一致するキーを削除
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

---

## 2. セキュリティ上の問題や脆弱性

### 2.1 現在のセキュリティ対策（良好）

✅ **SupabaseのRLS（Row Level Security）が有効**
- ユーザーは自分のデータのみアクセス可能
- SQLインジェクションのリスクは低い（パラメータ化クエリ）

✅ **認証・認可**
- Supabase Authを使用
- パスワードはbcryptでハッシュ化

### 2.2 潜在的なセキュリティ問題

#### 問題1: エラーメッセージからの情報漏洩

**場所:** `repositories/practiceSessionRepository.ts`

```typescript
// ❌ 問題: エラーメッセージに詳細情報が含まれる可能性
if (error) {
  logger.error(`[${REPOSITORY_CONTEXT}] createPracticeSession:error`, {
    error,
    error_code: error.code,
    error_message: error.message, // データベース構造が漏洩する可能性
    insertPayload: { ...insertPayload } // 機密情報が含まれる可能性
  });
}
```

**改善案:**
```typescript
// ✅ 改善: 本番環境では詳細情報をログに記録しない
if (error) {
  if (__DEV__) {
    logger.error(`[${REPOSITORY_CONTEXT}] createPracticeSession:error`, {
      error_code: error.code,
      // 本番環境では詳細なエラーメッセージを記録しない
    });
  } else {
    logger.error(`[${REPOSITORY_CONTEXT}] createPracticeSession:error`, {
      error_code: error.code,
      // ユーザー向けの汎用的なメッセージのみ
    });
  }
}
```

#### 問題2: 入力値の検証不足

**場所:** `services/practiceService.ts`

```typescript
// ⚠️ 問題: 数値の範囲チェックはあるが、型チェックが不十分
if (params.minutes <= 0) {
  return { success: false, error: '練習時間は1分以上で入力してください' };
}
```

**改善案:**
```typescript
// ✅ 改善: より厳密なバリデーション
if (typeof params.minutes !== 'number' || isNaN(params.minutes) || !isFinite(params.minutes)) {
  return { success: false, error: '無効な練習時間です', code: 'VALIDATION_ERROR' };
}

if (params.minutes <= 0 || params.minutes > 1440) {
  return { success: false, error: '練習時間は1分以上1440分以内で入力してください', code: 'VALIDATION_ERROR' };
}
```

#### 問題3: 日付の検証不足

**場所:** `repositories/practiceSessionRepository.ts`

```typescript
// ⚠️ 問題: practice_dateの形式検証がない
const targetDate = practiceDate || formatLocalDate(new Date());
```

**改善案:**
```typescript
// ✅ 改善: 日付形式の検証
function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

if (practiceDate && !validateDate(practiceDate)) {
  throw new Error('無効な日付形式です');
}
```

#### 問題4: ファイルアップロードの検証不足

**場所:** `lib/database.ts` (録音ファイルのアップロード)

**推奨改善:**
- ファイルサイズの制限
- ファイルタイプの検証
- ウイルススキャン（可能であれば）

```typescript
// ✅ 改善案
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];

if (file.size > MAX_FILE_SIZE) {
  throw new Error('ファイルサイズが大きすぎます');
}

if (!ALLOWED_MIME_TYPES.includes(file.type)) {
  throw new Error('許可されていないファイル形式です');
}
```

---

## 3. クラッシュの原因になりそうな箇所

### 3.1 Null/Undefinedチェックの不足

#### 問題箇所1: `repositories/practiceSessionRepository.ts`

```typescript
// ❌ 問題: existing.idがundefinedの可能性がある
const { error: updateError } = await updatePracticeSession(existing.id!, updateData);
```

**改善案:**
```typescript
// ✅ 改善: nullチェックを追加
if (!existing.id) {
  logger.error('既存レコードにIDがありません');
  return { success: false, error: { message: 'レコードIDが見つかりません' } };
}

const { error: updateError } = await updatePracticeSession(existing.id, updateData);
```

#### 問題箇所2: `app/(tabs)/statistics.tsx`

```typescript
// ❌ 問題: userがnullの可能性がある
const result = await getPracticeSessionsByDateRange(
  user.id, // userがnullの場合にクラッシュ
  startDate,
  undefined,
  currentInstrumentId,
  DATA.MAX_PRACTICE_RECORDS
);
```

**改善案:**
```typescript
// ✅ 改善: 早期リターンでnullチェック
if (!user?.id) {
  logger.warn('ユーザーがログインしていません');
  setPracticeRecords([]);
  setLoading(false);
  return;
}

const result = await getPracticeSessionsByDateRange(
  user.id,
  startDate,
  undefined,
  currentInstrumentId,
  DATA.MAX_PRACTICE_RECORDS
);
```

#### 問題箇所3: `hooks/tabs/useCalendarData.ts`

```typescript
// ❌ 問題: sessionsがnullの場合にクラッシュ
if (sessions) {
  const practiceDataMap: Record<string, number> = {};
  sessions.forEach(session => {
    // session.practice_dateがundefinedの可能性
    practiceDataMap[session.practice_date] = (practiceDataMap[session.practice_date] || 0) + (session.duration_minutes || 0);
  });
}
```

**改善案:**
```typescript
// ✅ 改善: オプショナルチェーンとデフォルト値
if (sessions && Array.isArray(sessions)) {
  const practiceDataMap: Record<string, number> = {};
  sessions.forEach(session => {
    const date = session?.practice_date;
    const minutes = session?.duration_minutes ?? 0;
    
    if (date && typeof minutes === 'number' && minutes >= 0) {
      practiceDataMap[date] = (practiceDataMap[date] || 0) + minutes;
    }
  });
}
```

### 3.2 配列操作でのクラッシュ

#### 問題箇所: `repositories/practiceSessionRepository.ts`

```typescript
// ❌ 問題: otherRecordIdsが空配列の場合でも処理が続行される
const otherRecordIds = timeRecords.slice(1).map(record => record.id!).filter(Boolean);
if (otherRecordIds.length > 0) {
  // 削除処理
}
```

**改善案:**
```typescript
// ✅ 改善: より安全な配列操作
const otherRecordIds = timeRecords
  .slice(1)
  .map(record => record?.id)
  .filter((id): id is string => Boolean(id)); // 型ガードを使用

if (otherRecordIds.length > 0) {
  // 削除処理
}
```

### 3.3 非同期処理のエラーハンドリング不足

#### 問題箇所: `components/AudioRecorder.tsx`

```typescript
// ❌ 問題: エラーがキャッチされていない可能性
mediaRecorderRef.current.start();
```

**改善案:**
```typescript
// ✅ 改善: try-catchでエラーハンドリング
try {
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
    mediaRecorderRef.current.start();
  }
} catch (error) {
  logger.error('MediaRecorder start error:', error);
  ErrorHandler.handle(error, '録音開始', true);
  setIsRecording(false);
  Alert.alert('エラー', '録音の開始に失敗しました');
}
```

### 3.4 型アサーションの多用

#### 問題箇所: 複数ファイル

```typescript
// ❌ 問題: 型アサーションが多用されている
const error = error as SupabaseError;
const data = (profile as any).career_data;
```

**改善案:**
```typescript
// ✅ 改善: 型ガード関数を使用
function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'message' in error)
  );
}

if (isSupabaseError(error)) {
  // 安全にSupabaseErrorとして扱える
}
```

---

## 4. 型安全性を改善できる箇所

### 4.1 `any`型の使用

#### 問題箇所1: `services/practiceService.ts`

```typescript
// ❌ 問題: any型が使用されている
async getTodaySessions(
  userId: string,
  instrumentId?: string | null
): Promise<ServiceResult<any[]>> {
```

**改善案:**
```typescript
// ✅ 改善: 具体的な型を指定
async getTodaySessions(
  userId: string,
  instrumentId?: string | null
): Promise<ServiceResult<PracticeSession[]>> {
```

#### 問題箇所2: `lib/errorHandler.ts`

```typescript
// ❌ 問題: AppError型が緩い
export type AppError = Error | { message?: string; code?: string; [key: string]: unknown } | string | unknown;
```

**改善案:**
```typescript
// ✅ 改善: より厳密な型定義
export type AppError = 
  | Error
  | { message: string; code?: string }
  | { message?: string; code: string }
  | string;

// unknown型は最後の手段として使用
export function normalizeError(error: unknown): AppError {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    return {
      message: String(obj.message ?? 'Unknown error'),
      code: obj.code ? String(obj.code) : undefined,
    };
  }
  return new Error('Unknown error');
}
```

#### 問題箇所3: `components/PostureCameraModal.tsx`

```typescript
// ❌ 問題: any型が使用されている
let CameraView: any = null;
let CameraType: any = null;
```

**改善案:**
```typescript
// ✅ 改善: 型定義を作成
type CameraViewType = typeof import('expo-camera').CameraView;
type CameraTypeType = typeof import('expo-camera').CameraType;
type UseCameraPermissionsType = typeof import('expo-camera').useCameraPermissions;

let CameraView: CameraViewType | null = null;
let CameraType: CameraTypeType | null = null;
let useCameraPermissions: UseCameraPermissionsType | null = null;
```

### 4.2 型アサーションの改善

#### 問題箇所: `app/(tabs)/profile-settings.tsx`

```typescript
// ❌ 問題: 型アサーションが多用されている
if ((profile as any).career_data) {
  const careerData = (profile as any).career_data;
```

**改善案:**
```typescript
// ✅ 改善: 型定義を追加
interface UserProfileWithCareer {
  career_data?: {
    pastOrganizationsUi?: Array<{ id?: string; name: string; startYm: string; endYm: string }>;
    awardsUi?: Array<{ id?: string; title: string; dateYm: string; result: string }>;
    performancesUi?: Array<{ id?: string; title: string }>;
  };
}

function hasCareerData(profile: unknown): profile is UserProfileWithCareer {
  return (
    typeof profile === 'object' &&
    profile !== null &&
    'career_data' in profile
  );
}

if (hasCareerData(profile) && profile.career_data) {
  const careerData = profile.career_data;
  // 型安全にアクセス可能
}
```

### 4.3 オプショナルチェーンの活用

#### 問題箇所: 複数ファイル

```typescript
// ❌ 問題: オプショナルチェーンが使用されていない
if (user && user.id) {
  const result = await getPracticeSessions(user.id);
}
```

**改善案:**
```typescript
// ✅ 改善: オプショナルチェーンを使用
const userId = user?.id;
if (userId) {
  const result = await getPracticeSessions(userId);
}
```

### 4.4 型ガード関数の追加

**推奨: 共通の型ガード関数を作成**

```typescript
// lib/typeGuards.ts
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isPracticeSession(value: unknown): value is PracticeSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'user_id' in value &&
    'practice_date' in value &&
    'duration_minutes' in value &&
    'input_method' in value
  );
}
```

---

## 優先度別改善リスト

### 高優先度（即座に修正すべき）

1. **Null/Undefinedチェックの追加**
   - `repositories/practiceSessionRepository.ts`: `existing.id`のnullチェック
   - `app/(tabs)/statistics.tsx`: `user`のnullチェック

2. **データベースインデックスの追加**
   - `practice_sessions`テーブルにインデックスを追加

3. **エラーハンドリングの改善**
   - 非同期処理にtry-catchを追加

### 中優先度（次回リリースまでに修正）

1. **型安全性の改善**
   - `any`型の削減
   - 型ガード関数の追加

2. **セキュリティの強化**
   - エラーメッセージからの情報漏洩防止
   - 入力値検証の強化

3. **パフォーマンス最適化**
   - データベース側での集計
   - ページネーションの実装

### 低優先度（継続的改善）

1. **キャッシュ戦略の改善**
   - TTL付きキャッシュ
   - キャッシュ無効化の実装

2. **コード品質の向上**
   - 型アサーションの削減
   - オプショナルチェーンの活用

---

## まとめ

現在のコードベースは全体的に良好ですが、以下の点で改善の余地があります：

1. **パフォーマンス**: データベースインデックスと集計クエリの最適化で大幅な改善が期待できる
2. **セキュリティ**: 基本的な対策は取られているが、エラーメッセージと入力検証の強化が必要
3. **クラッシュ防止**: Null/Undefinedチェックとエラーハンドリングの追加が重要
4. **型安全性**: `any`型の削減と型ガード関数の活用で改善可能

優先度の高い項目から順に実装することを推奨します。
