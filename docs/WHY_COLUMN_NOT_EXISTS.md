# なぜカラムが存在しない状態が起こるのか

## 原因

`instrument_id`カラムが存在しない状態が起こる主な原因は以下の通りです：

### 1. **初期スキーマが適用されていない**

`supabase/migrations/20251219000000_initial_schema.sql`には、`my_songs`テーブルに`instrument_id`カラムが既に含まれています（157行目）：

```sql
CREATE TABLE IF NOT EXISTS public.my_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL,  -- ← ここに含まれている
  ...
);
```

しかし、以下の場合にカラムが存在しない状態になります：

- **Supabaseの本番環境で初期スキーマが実行されていない**
- **ローカル環境でSupabaseを起動する前に、古いデータベースが存在していた**
- **マイグレーションファイルがSupabaseに適用されていない**

### 2. **初期スキーマ適用前にデータベースが作成されていた**

`20251226000000_add_instrument_id_to_my_songs.sql`は、初期スキーマ適用**前**の既存データベース用のマイグレーションファイルです。

このファイルのコメントにも記載されています：

```sql
-- 注意: 初期スキーマ（20251219000000_initial_schema.sql）には既に含まれています
--       このマイグレーションは、初期スキーマ適用前の既存データベース用です
```

つまり、以下のような状況が考えられます：

1. **データベースが初期スキーマ適用前に作成された**
2. **初期スキーマが実行されなかった（エラーなど）**
3. **手動でテーブルが作成された（初期スキーマを使わずに）**

### 3. **Supabaseの本番環境でマイグレーションが実行されていない**

Supabaseの本番環境（`uteeqkpsezbabdmritkn.supabase.co`）で、以下のマイグレーションファイルが実行されていない可能性があります：

- `20251219000000_initial_schema.sql`（初期スキーマ）
- `20251226000000_add_instrument_id_to_my_songs.sql`（既存DB用）

## 解決方法

### 方法1: Supabaseダッシュボードから実行（推奨）

1. Supabaseダッシュボードにアクセス: https://supabase.com/dashboard
2. プロジェクトを選択（`uteeqkpsezbabdmritkn`）
3. 左メニューから「SQL Editor」を開く
4. 以下のSQLをコピーして実行：

```sql
-- my_songsテーブルにinstrument_idカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'my_songs' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.my_songs 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.my_songs.instrument_id IS '楽器ID（楽器ごとに曲を分けて管理）';
  END IF;
END $$;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_my_songs_instrument_id ON public.my_songs(instrument_id);
```

5. 「Run」ボタンをクリックして実行
6. 成功メッセージが表示されれば完了

### 方法2: Supabase CLIを使用（ローカル環境）

```bash
cd music-practice
supabase db reset
```

### 方法3: マイグレーションファイルを確認

現在のマイグレーションファイルの状態を確認：

```bash
ls -la supabase/migrations/
```

期待される結果：
- `20251219000000_initial_schema.sql`（初期スキーマ）
- `20251226000000_add_instrument_id_to_my_songs.sql`（既存DB用）

## 確認方法

カラムが存在するかどうかを確認するSQL：

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'my_songs' 
  AND column_name = 'instrument_id';
```

結果が返ってこない場合、カラムが存在しません。

## まとめ

カラムが存在しない状態は、**データベースのマイグレーションが実行されていない**ことが原因です。上記の解決方法を実行することで、カラムが追加され、エラーが解消されます。

