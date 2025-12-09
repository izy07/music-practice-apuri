# エラー分析と修正方法

## 🔍 エラー分析

### エラー1: `column goals.show_on_calendar does not exist`

**エラーメッセージ:**
```
GET https://uteeqkpsezbabdmritkn.supabase.co/rest/v1/goals?select=show_on_calendar&limit=1 400 (Bad Request)
column goals.show_on_calendar does not exist
```

**原因:**
- 本番環境のSupabaseデータベースの`goals`テーブルに`show_on_calendar`カラムが存在しない
- マイグレーションが本番環境に適用されていない

**影響:**
- 短期目標の読み込み時にエラーが発生
- カレンダーに目標を表示する機能が動作しない

### エラー2: `getAllInstruments:fallback to defaultInstruments`

**エラーメッセージ:**
```
[instrumentService] getAllInstruments:fallback to defaultInstruments
```

**原因:**
- 本番環境のSupabaseデータベースに`instruments`テーブルが存在しない、またはデータが登録されていない
- マイグレーションが本番環境に適用されていない

**影響:**
- 楽器一覧の取得に失敗し、ローカルのデフォルト楽器データにフォールバック
- データベースから楽器情報を取得できない

---

## ✅ 修正方法

### 方法1: Supabaseダッシュボードで手動実行（推奨）

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard/project/uteeqkpsezbabdmritkn

2. **SQL Editorを開く**
   - 左メニュー → "SQL Editor" → "New query"

3. **マイグレーションSQLを実行**
   - `supabase/migrations/20260202000000_fix_production_errors.sql`の内容をコピー&ペースト
   - "Run"ボタンをクリックして実行

4. **実行結果を確認**
   - エラーが表示されないことを確認
   - 成功メッセージが表示されることを確認

### 方法2: Supabase CLIで実行

```bash
# 1. Supabase CLIにログイン
supabase login

# 2. プロジェクトにリンク
supabase link --project-ref uteeqkpsezbabdmritkn

# 3. マイグレーションを実行
supabase db push
```

### 方法3: 個別に修正する場合

#### A. show_on_calendarカラムを追加

```sql
-- goalsテーブルにshow_on_calendarカラムを追加
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar') THEN
      ALTER TABLE goals ADD COLUMN show_on_calendar BOOLEAN DEFAULT false;
      UPDATE goals SET show_on_calendar = false WHERE show_on_calendar IS NULL;
      CREATE INDEX IF NOT EXISTS idx_goals_show_on_calendar ON goals(show_on_calendar) WHERE show_on_calendar = true;
    END IF;
  END IF;
END $$;
```

#### B. instrumentsテーブルを作成

```sql
-- instrumentsテーブルの作成
CREATE TABLE IF NOT EXISTS public.instruments (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  name_en text NOT NULL,
  color_primary text NOT NULL,
  color_secondary text NOT NULL,
  color_accent text NOT NULL,
  starting_note text,
  tuning_notes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLSの有効化
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Anyone can view instruments" ON public.instruments
  FOR SELECT USING (true);

-- 楽器データの投入（21種類）
-- （詳細は20260202000000_fix_production_errors.sqlを参照）
```

---

## 📋 実行後の確認

### 1. goalsテーブルの確認

```sql
-- show_on_calendarカラムが存在するか確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'goals' 
  AND column_name = 'show_on_calendar';
```

### 2. instrumentsテーブルの確認

```sql
-- instrumentsテーブルが存在し、データが登録されているか確認
SELECT COUNT(*) as total_instruments FROM public.instruments;
SELECT id, name, name_en FROM public.instruments ORDER BY name LIMIT 5;
```

### 3. アプリケーションでの確認

1. **ブラウザをリロード**
   - エラーが解消されているか確認

2. **短期目標の読み込み**
   - カレンダー画面で短期目標が正しく表示されるか確認

3. **楽器一覧の取得**
   - 楽器選択画面で楽器一覧が正しく表示されるか確認

---

## 🚨 注意事項

1. **データのバックアップ**
   - マイグレーション実行前に、重要なデータがある場合はバックアップを取得

2. **冪等性**
   - このマイグレーションは冪等性があります（何度実行しても安全）
   - `IF NOT EXISTS`や`ON CONFLICT`を使用しているため、既存データは保護されます

3. **PostgRESTキャッシュ**
   - マイグレーション実行後、PostgRESTのスキーマキャッシュが自動的にリロードされます
   - もしエラーが続く場合は、数秒待ってから再度試してください

---

## 📝 まとめ

**問題:**
- 本番環境のSupabaseデータベースにマイグレーションが適用されていない

**解決策:**
- `supabase/migrations/20260202000000_fix_production_errors.sql`を実行
- または、Supabaseダッシュボードで個別にSQLを実行

**実行後:**
- `goals.show_on_calendar`カラムが追加される
- `instruments`テーブルが作成され、21種類の楽器データが登録される
- エラーが解消され、アプリケーションが正常に動作する




