# 一般的なアプリの認証・セッション管理パターン

## 1. Supabase公式の標準的な実装方法

### ✅ **推奨される方法（最もシンプル）**

```typescript
// 新規登録
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
});

if (error) {
  // エラーハンドリング
  console.error(error);
  return;
}

// セッションは自動的に設定される
// Supabaseクライアントが自動的にストレージに保存
// 次回のgetSession()で自動的に読み込まれる
```

**特徴:**
- ✅ `supabase.auth.signUp()`を呼ぶだけ
- ✅ セッション管理は完全にSupabaseクライアントに任せる
- ✅ 手動でセッションを設定する必要がない
- ✅ 複雑な処理が不要

### セッション確認

```typescript
// 登録後、セッションが設定されるまで少し待つ（必要に応じて）
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  // セッションが設定されている
  // ユーザー情報を取得して、次の画面に遷移
}
```

## 2. 一般的なアプリの実装パターン

### パターンA: シンプルな実装（推奨）

```typescript
async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // セッションは自動的に設定される
    // 次の画面に遷移する前に、少し待ってセッションを確認
    await waitForSession();

    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function waitForSession(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}
```

### パターンB: イベントベースの実装

```typescript
// 認証状態の変化を監視
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_UP' && session) {
    // 新規登録成功、セッションが設定された
    // 次の画面に遷移
  }
});

// 新規登録
await supabase.auth.signUp({ email, password });
```

### パターンC: 直接API呼び出し（特殊な場合のみ）

一般的なアプリでは、以下の場合のみ直接APIを呼び出します：

1. **Supabaseクライアントが使えない環境**
2. **カスタムの認証フローが必要な場合**
3. **サーバーサイドでの実装**

```typescript
// 一般的には使わない（複雑になるため）
const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
  },
  body: JSON.stringify({ email, password }),
});

// その後、手動でセッションを設定する必要がある
// これは複雑で、推奨されない
```

## 3. 現在のコードベースの問題点

### ❌ **問題点**

1. **過度に複雑な処理**
   - 直接API呼び出し
   - 手動でのセッション設定
   - タイムアウト処理
   - リトライロジック
   - localStorageへの直接保存

2. **Supabaseの標準的な動作に従っていない**
   - `supabase.auth.signUp()`を直接使っていない
   - セッション管理を手動で行っている

3. **不必要な処理**
   - `setSession`のタイムアウト処理
   - localStorageへの直接保存（Supabaseクライアントが自動的に行う）

## 4. 推奨される実装（一般的なアプリの方法）

### ✅ **推奨実装**

```typescript
// lib/signUpNew.ts - シンプルな実装
export async function signUpNew(
  email: string,
  password: string,
  displayName?: string
): Promise<SignUpResult> {
  try {
    // Supabaseの標準的なメソッドを使用
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password: password,
      options: {
        data: {
          name: displayName || email.split('@')[0],
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: translateError(error),
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'ユーザー情報が取得できませんでした。',
      };
    }

    // セッションは自動的に設定される
    // プロフィールはデータベーストリガーで自動作成される

    return {
      success: true,
      userId: data.user.id,
      email: data.user.email,
    };
  } catch (error: any) {
    return {
      success: false,
      error: translateError(error),
    };
  }
}
```

### UI側での処理

```typescript
// signup.tsx
const handleSignup = async () => {
  const result = await authSignUp(email, password, displayName);

  if (!result.success) {
    setError(result.error);
    return;
  }

  // セッションが設定されるまで少し待つ
  let sessionConfirmed = false;
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      sessionConfirmed = true;
      break;
    }
  }

  if (sessionConfirmed) {
    // 次の画面に遷移
    router.replace('/(tabs)/tutorial');
  } else {
    // セッションが設定されていない場合でも、ユーザーは作成されている
    // 次回ログイン時にセッションが設定される
    setError('セッションの設定に時間がかかっています。ログイン画面から再度お試しください。');
  }
};
```

## 5. まとめ

### 一般的なアプリの特徴

1. **シンプルな実装**
   - `supabase.auth.signUp()`を直接使用
   - セッション管理はSupabaseクライアントに任せる

2. **最小限の処理**
   - 手動でのセッション設定は不要
   - タイムアウト処理は不要
   - リトライロジックは不要

3. **確実な動作**
   - Supabaseの標準的な動作に従う
   - 複雑な処理を避ける

### 現在のコードの問題

- 直接API呼び出し（不要）
- 手動でのセッション設定（不要）
- タイムアウト処理（不要）
- localStorageへの直接保存（Supabaseクライアントが自動的に行う）

### 推奨される改善

1. **`supabase.auth.signUp()`を直接使用**
2. **セッション管理はSupabaseクライアントに完全に任せる**
3. **UI側でセッション確認のみ行う**

これが一般的なアプリの実装方法です。

