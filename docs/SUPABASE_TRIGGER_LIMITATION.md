# Supabaseトリガーの制約について

## 問題

`auth.users`テーブルに直接トリガーを設定することはできません。これはSupabaseの制約です。

エラーメッセージ:
```
ERROR: 42501: must be owner of relation users
```

## 理由

`auth.users`テーブルはSupabaseの管理下にあるため、通常のユーザーでは直接トリガーを作成できません。

## 解決策

### 1. クライアント側で処理する（現在の実装 - 推奨）

既に以下の箇所でプロフィール自動作成が実装されています：

1. **`hooks/useAuthAdvanced.ts`** (957-974行目)
   - `handleAuthenticatedUser`関数内で、プロフィールが存在しない場合に自動的に作成
   - `upsert`を使用して確実に作成（既に存在する場合は更新）

2. **`lib/signUpNew.ts`** (396-413行目)
   - 新規登録時に明示的にプロフィール作成を試みる（非同期、エラーは無視）
   - トリガーが動作しない場合のフォールバック

この実装により、トリガーがなくてもプロフィールは確実に作成されます。

### 2. Supabase Database Webhooksを使用する（上級者向け）

Supabase DashboardでDatabase Webhooksを設定し、`auth.users`テーブルの変更を監視してプロフィールを作成する方法があります。

**設定手順**:
1. Supabase Dashboard → Database → Webhooks
2. 新しいWebhookを作成
3. イベント: `INSERT` on `auth.users`
4. HTTPリクエストで`user_profiles`テーブルにINSERT

**注意**: この方法は追加の設定が必要で、エッジ関数や外部APIが必要になる場合があります。

### 3. Edge Functionsを使用する（上級者向け）

Supabase Edge Functionsを使用して、認証イベントを監視し、プロフィールを作成する方法があります。

## 推奨事項

**現在のクライアント側の実装で十分です。** トリガーは不要です。

理由:
- 既に`useAuthAdvanced.ts`でプロフィール自動作成が実装されている
- `signUpNew.ts`でもフォールバック処理が実装されている
- 追加の設定やメンテナンスが不要
- エラー処理が適切に実装されている

## マイグレーションファイルの扱い

`supabase/migrations/20260113000000_create_user_profile_trigger.sql`は削除するか、コメントアウトしてください。

このファイルは実行できませんが、参考として残しておくことも可能です。
