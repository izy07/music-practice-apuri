# user_profilesテーブルのカラム追加マイグレーション

## 問題
`user_profiles`テーブルに`tutorial_completed`と`onboarding_completed`カラムが存在しないため、400エラーが発生しています。

## 解決方法

### 方法1: Supabaseダッシュボードで実行（推奨）

1. Supabaseダッシュボードにアクセス:
   - https://supabase.com/dashboard/project/uteeqkpsezbabdmritkn

2. SQL Editorを開く:
   - 左側のメニューから「SQL Editor」を選択

3. マイグレーションSQLを実行:
   - `scripts/apply_user_profiles_migration.sql`の内容をコピー&ペースト
   - 「Run」ボタンをクリックして実行

### 方法2: Supabase CLIで実行

```bash
# 1. Supabase CLIにログイン
supabase login

# 2. プロジェクトにリンク
supabase link --project-ref uteeqkpsezbabdmritkn

# 3. マイグレーションを実行
supabase db push
```

### 方法3: 直接SQLを実行

SupabaseダッシュボードのSQL Editorで以下のSQLを実行:

```sql
-- オンボーディング進捗管理カラムを確実に追加
DO $$
BEGIN
  -- tutorial_completedカラムの追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'tutorial_completed'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN tutorial_completed boolean DEFAULT false;
  END IF;

  -- tutorial_completed_atカラムの追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'tutorial_completed_at'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN tutorial_completed_at timestamptz;
  END IF;

  -- onboarding_completedカラムの追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  -- onboarding_completed_atカラムの追加
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN onboarding_completed_at timestamptz;
  END IF;
END $$;

-- 既存のレコードにデフォルト値を設定
UPDATE public.user_profiles
SET 
  tutorial_completed = COALESCE(tutorial_completed, false),
  onboarding_completed = COALESCE(onboarding_completed, false)
WHERE tutorial_completed IS NULL OR onboarding_completed IS NULL;
```

## 確認

マイグレーション実行後、以下のSQLでカラムが追加されたか確認できます:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
  AND column_name IN ('tutorial_completed', 'tutorial_completed_at', 'onboarding_completed', 'onboarding_completed_at')
ORDER BY column_name;
```

