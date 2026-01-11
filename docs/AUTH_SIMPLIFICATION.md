# 認証システムのシンプル化

## 問題点

認証ができなくなる問題が多発していた原因：
1. **グローバル変数が多すぎる**：`isLoginInProgress`, `isSignupInProgress`, `globalProcessingPromises`など
2. **重複処理**：`onAuthStateChange`と`initializeAuth`が両方とも認証状態を処理
3. **複雑なフラグ管理**：フラグの設定・リセットタイミングが複雑で、問題が発生しやすい
4. **タイムアウト処理が複雑**：`globalProcessingPromises`で重複実行を防ごうとしているが、タイムアウト処理が複雑

## 修正内容

### 1. フラグ管理の削除
- `isLoginInProgress`と`isSignupInProgress`のグローバル変数を削除
- `onAuthStateChange`で全ての認証イベント（`SIGNED_IN`, `INITIAL_SESSION`）を処理するように変更
- フラグチェックを削除し、シンプルなフローに

### 2. 重複処理の削除
- `initializeAuth`でセッション処理を削除し、`onAuthStateChange`の`INITIAL_SESSION`イベントで処理
- これにより、認証状態の更新が一箇所に集約され、問題の原因が特定しやすくなった

### 3. タイムアウト処理の削除
- `globalProcessingPromises`のタイムアウト処理を削除し、シンプルな重複チェックのみに
- これにより、タイムアウトによる問題を回避

### 4. シンプルな認証フロー

**修正前（複雑）**:
```
ログイン → isLoginInProgress = true → signIn → onAuthStateChange (フラグチェック) → handleAuthenticatedUser → フラグリセット
```

**修正後（シンプル）**:
```
ログイン → signIn → onAuthStateChange (全てのイベントを処理) → handleAuthenticatedUser
```

## ファイル構成

### 主要ファイル
- `hooks/useAuthAdvanced.ts`: 認証フック（シンプル化済み）
- `app/auth/login.tsx`: ログイン画面（認証状態の監視をシンプルに）
- `app/_layout.tsx`: ルートレイアウト（認証保護ロジック）

### サービス層
- `services/authProfileService.ts`: プロフィール関連の処理
- `services/authService.ts`: Supabase認証APIのラッパー

## 認証フローの説明

### ログイン時
1. ユーザーがログインボタンを押す
2. `signIn`関数が`supabase.auth.signInWithPassword`を呼び出す
3. Supabaseが認証に成功すると、`onAuthStateChange`の`SIGNED_IN`イベントが発火
4. `onAuthStateChange`で`handleAuthenticatedUser`を呼び出し、認証状態を更新
5. ログイン画面の`useEffect`で認証状態を監視し、画面遷移を実行

### 初期化時
1. アプリ起動時に`initializeAuth`が実行される
2. セッションが有効な場合、`onAuthStateChange`の`INITIAL_SESSION`イベントが発火
3. `onAuthStateChange`で`handleAuthenticatedUser`を呼び出し、認証状態を更新

## 問題の原因が特定しやすくなった点

1. **単一の処理フロー**：認証状態の更新は`onAuthStateChange`で一箇所に集約
2. **フラグ管理の削除**：フラグの状態に依存しないため、問題が発生しにくい
3. **シンプルな重複チェック**：`globalProcessingPromises`で重複実行を防ぐだけで、タイムアウト処理なし
4. **明確なエラーハンドリング**：各関数でエラーを適切に処理

## 今後の改善点

1. `useAuthAdvanced.ts`がまだ大きい（1901行）ので、さらに分割を検討
2. 型エラーの修正
3. エラーハンドリングの統一
