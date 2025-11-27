# 新しいシンプルな認証システム

## 概要

既存の`useAuthAdvanced.ts`（1700行以上）が複雑になりすぎていたため、新しいシンプルな認証システムを作成しました。

## ファイル構成

### `lib/authService.ts`（約200行）
- 認証のビジネスロジックのみを提供
- 複雑なエラーハンドリングやリトライロジックは含めない
- シンプルで明確な実装

**提供する関数:**
- `signUp(email, password)` - 新規登録
- `signIn(email, password)` - ログイン
- `signOut()` - ログアウト
- `getCurrentUser()` - 現在のユーザーを取得
- `getSession()` - セッションを取得
- `getUserProfile(userId)` - プロフィールを取得
- `createUserProfile(userId, email)` - プロフィールを作成

### `hooks/useAuthSimple.ts`（約260行）
- 認証状態の管理のみを行う
- `authService.ts`を使用して認証処理を実行
- 複雑な状態管理やエラーハンドリングは含めない

### 更新した画面
- `app/gakki-renshu/signup.tsx` - 新しい`authService.signUp`を使用
- `app/gakki-renshu/login.tsx` - 新しい`authService.signIn`を使用
- `app/(tabs)/settings.tsx` - 新しい`authService.signOut`を使用

## 使い方

### 新規登録画面で使用

```typescript
import { signUp } from '@/lib/authService';

const result = await signUp(email, password);
if (result.success) {
  // 新規登録成功 → チュートリアル画面へ
  router.replace('/(tabs)/tutorial');
} else {
  // エラー表示
  setError(result.error);
}
```

### ログイン画面で使用

```typescript
import { signIn } from '@/lib/authService';

const result = await signIn(email, password);
if (result.success) {
  // ログイン成功 → カレンダー画面へ
  router.replace('/(tabs)/');
} else {
  // エラー表示
  setError(result.error);
}
```

### ログアウト処理で使用

```typescript
import { signOut } from '@/lib/authService';

const result = await signOut();
if (result.success) {
  // ログアウト成功 → ログイン画面へ
  router.replace('/gakki-renshu/login');
} else {
  // エラー表示
  Alert.alert('エラー', result.error);
}
```

## 主な改善点

1. **シンプルな実装**
   - 複雑なエラーハンドリングやリトライロジックを削除
   - 必要最小限の機能のみを提供

2. **明確な責任分離**
   - `authService.ts`: ビジネスロジック
   - `useAuthSimple.ts`: 状態管理
   - 画面コンポーネント: UI

3. **エラーハンドリングの簡素化**
   - 400エラーは無視して処理を続行（プロフィールが存在する可能性があるため）
   - 403エラーはセッション無効として処理
   - 409エラーは既存レコードとして処理

4. **プロフィール作成の確実化**
   - プロフィール作成時に存在確認を実行
   - 409エラーが発生した場合は既に存在するものとして処理
   - 400エラーが発生しても処理を続行

## 既存コードとの互換性

現在、既存の`useAuthAdvanced`は残してあり、段階的に移行できます。

- 新規登録・ログイン・ログアウト画面は新しいサービスを使用
- 他の画面は既存の`useAuthAdvanced`を使用
- 将来的に全ての画面を新しいシステムに移行可能

