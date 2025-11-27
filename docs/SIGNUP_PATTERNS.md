# 新規登録の実装パターン比較

## 一般的なアプリの新規登録実装

### 1. **シンプルな実装（最も一般的）**

多くのアプリでは、新規登録を**1回だけ実行**し、エラーが発生した場合はユーザーにエラーメッセージを表示します。

```typescript
// シンプルな実装例
async function signUp(email: string, password: string, name: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) {
      // エラーメッセージをユーザーに表示
      alert(getErrorMessage(error));
      return false;
    }

    if (!data?.user) {
      alert('新規登録に失敗しました');
      return false;
    }

    // 成功時の処理
    return true;
  } catch (error) {
    alert('予期しないエラーが発生しました');
    return false;
  }
}
```

**特徴：**
- ✅ シンプルで理解しやすい
- ✅ デバッグが容易
- ✅ エラーが明確
- ❌ ネットワークエラー時にリトライしない

### 2. **リトライ付き実装（現在の実装）**

ネットワークエラーなどの一時的なエラーに対してリトライを行う実装。

```typescript
// リトライ付き実装例
async function signUpWithRetry(email: string, password: string, name: string) {
  const maxRetries = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });

      if (error) {
        // リトライ不可能なエラー（既に登録済みなど）
        if (error.code === 'user_already_exists') {
          throw error;
        }
        lastError = error;
        continue; // リトライ
      }

      return { success: true, data };
    } catch (error) {
      // リトライ不可能なエラー
      throw error;
    }
  }

  throw lastError;
}
```

**特徴：**
- ✅ ネットワークエラーに強い
- ✅ 一時的なエラーを自動的にリトライ
- ❌ 実装が複雑
- ❌ デバッグが困難
- ❌ ユーザーが作成されたがエラーが発生した場合の処理が複雑

### 3. **現在の実装の問題点**

現在の実装は以下の問題があります：

1. **複雑すぎる**
   - リトライ、タイムアウト、セッションクリアなどが複雑に絡み合っている
   - デバッグが困難

2. **ユーザー作成とエラーの競合**
   - 1回目の試行でユーザーが作成されたが、エラーが発生
   - リトライで「既に登録されています」エラーが発生
   - これを回避するために複雑な処理が必要

3. **タイムアウト処理が複数**
   - `signUpWithRetry`内のタイムアウト
   - `signUp`関数内のタイムアウト
   - `withRetry`内のタイムアウト
   - 3重のタイムアウト処理が競合する可能性

## 推奨される実装

### シンプルな実装（推奨）

```typescript
export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // シンプルに1回だけ実行
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name?.trim() || email.split('@')[0],
          display_name: name?.trim() || email.split('@')[0],
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error),
      };
    }

    if (!data?.user) {
      return {
        success: false,
        error: '新規登録に失敗しました。ユーザー情報が取得できませんでした。',
      };
    }

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: getAuthErrorMessage(error) || '新規登録に失敗しました',
    };
  }
}
```

**利点：**
- ✅ シンプルで理解しやすい
- ✅ デバッグが容易
- ✅ エラーが明確
- ✅ ユーザー作成とエラーの競合がない
- ✅ Supabaseの標準的な動作に従う

**欠点：**
- ❌ ネットワークエラー時にリトライしない（ただし、Supabaseは内部でリトライを行う）

## 結論

**一般的なアプリは、シンプルな実装（1回だけ実行）を使用しています。**

複雑なリトライ処理は、以下の場合にのみ必要です：
- ネットワークが非常に不安定な環境
- サーバー側でリトライができない場合
- 特別な要件がある場合

現在の実装は複雑すぎるため、シンプルな実装に変更することを推奨します。

