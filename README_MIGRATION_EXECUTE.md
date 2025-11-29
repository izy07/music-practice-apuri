# データベースマイグレーション実行手順

## 問題
`user_profiles`テーブルに`tutorial_completed`と`onboarding_completed`カラムが存在しないため、400エラーが発生しています。

## 解決方法

### 方法1: Supabaseダッシュボードで実行（推奨・最も簡単）

1. **Supabaseダッシュボードにアクセス:**
   - https://supabase.com/dashboard/project/uteeqkpsezbabdmritkn/sql/new

2. **SQL Editorを開く:**
   - 左側のメニューから「SQL Editor」を選択
   - 「New query」をクリック

3. **以下のSQLをコピー&ペーストして実行:**

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
    ADD COLUMN tutorial_completed boolean DEFAULT false NOT NULL;
    RAISE NOTICE 'tutorial_completedカラムを追加しました';
  ELSE
    RAISE NOTICE 'tutorial_completedカラムは既に存在します';
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
    RAISE NOTICE 'tutorial_completed_atカラムを追加しました';
  ELSE
    RAISE NOTICE 'tutorial_completed_atカラムは既に存在します';
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
    ADD COLUMN onboarding_completed boolean DEFAULT false NOT NULL;
    RAISE NOTICE 'onboarding_completedカラムを追加しました';
  ELSE
    RAISE NOTICE 'onboarding_completedカラムは既に存在します';
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
    RAISE NOTICE 'onboarding_completed_atカラムを追加しました';
  ELSE
    RAISE NOTICE 'onboarding_completed_atカラムは既に存在します';
  END IF;
END $$;

-- 既存のレコードにデフォルト値を設定
UPDATE public.user_profiles
SET 
  tutorial_completed = COALESCE(tutorial_completed, false),
  onboarding_completed = COALESCE(onboarding_completed, false)
WHERE tutorial_completed IS NULL OR onboarding_completed IS NULL;
```

4. **「Run」ボタンをクリックして実行**

5. **実行結果を確認:**
   - 成功メッセージが表示されることを確認
   - エラーが発生した場合は、エラーメッセージを確認

### 方法2: ファイルから直接コピー

以下のファイルの内容をコピー&ペーストして実行:
- `scripts/create_missing_columns.sql`

### 方法3: Supabase CLIで実行

```bash
# 1. Supabase CLIにログイン
supabase login

# 2. プロジェクトにリンク
supabase link --project-ref uteeqkpsezbabdmritkn

# 3. マイグレーションを実行
supabase db push
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

## 注意事項

- このSQLは安全に再実行できます（カラムが既に存在する場合はスキップされます）
- 既存のレコードには自動的にデフォルト値（`false`）が設定されます
- マイグレーション実行後、アプリケーションを再読み込みしてください

