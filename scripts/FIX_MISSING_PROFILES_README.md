# プロフィールが存在しないユーザーの修復方法

## 問題
`auth.users`にユーザーが存在するが、`user_profiles`にプロフィールが存在しない場合、新規登録時に「既に登録されています」というエラーが表示されます。

## 解決方法

### 方法1: SupabaseダッシュボードでSQLを実行（推奨）

1. Supabaseダッシュボードを開く
   ```
   http://localhost:54323
   ```

2. SQL Editorを開く

3. 以下のSQLを実行して問題を確認
   ```sql
   SELECT 
     au.id,
     au.email,
     au.created_at as auth_created_at,
     up.user_id as profile_exists
   FROM auth.users au
   LEFT JOIN public.user_profiles up ON au.id = up.user_id
   WHERE up.user_id IS NULL
   ORDER BY au.created_at DESC;
   ```

4. プロフィールを作成
   ```sql
   INSERT INTO public.user_profiles (
     user_id,
     display_name,
     created_at,
     updated_at
   )
   SELECT 
     au.id,
     COALESCE(
       au.raw_user_meta_data->>'display_name',
       au.raw_user_meta_data->>'name',
       SPLIT_PART(au.email, '@', 1)
     ) as display_name,
     au.created_at,
     NOW()
   FROM auth.users au
   LEFT JOIN public.user_profiles up ON au.id = up.user_id
   WHERE up.user_id IS NULL
   ON CONFLICT (user_id) DO NOTHING;
   ```

5. 修復後の確認
   ```sql
   SELECT 
     COUNT(*) as total_auth_users,
     COUNT(up.user_id) as users_with_profiles,
     COUNT(*) - COUNT(up.user_id) as users_without_profiles
   FROM auth.users au
   LEFT JOIN public.user_profiles up ON au.id = up.user_id;
   ```

### 方法2: 特定のユーザーを削除して再登録

特定のメールアドレスのユーザーを削除したい場合：

1. SupabaseダッシュボードのSQL Editorで以下を実行
   ```sql
   -- 削除対象を確認
   SELECT 
     id,
     email,
     created_at,
     email_confirmed_at
   FROM auth.users
   WHERE email = 'izuru261512345@gmail.com';
   
   -- ユーザーを削除（CASCADEによりuser_profilesも自動削除）
   DELETE FROM auth.users WHERE email = 'izuru261512345@gmail.com';
   ```

2. その後、新規登録を再度試す

### 方法3: トリガーを適用して自動修復

既に作成したトリガー（`20251222000000_auto_create_user_profile_trigger.sql`）を適用すると、今後は自動的にプロフィールが作成されます。

```bash
# マイグレーションを適用
npx supabase db reset
# または
npx supabase migration up
```

## 注意事項

- ユーザーを削除すると、そのユーザーのすべてのデータが削除されます
- プロフィールを作成する場合は、`raw_user_meta_data`から`display_name`を取得します
- トリガーが適用されていれば、今後は自動的にプロフィールが作成されます

