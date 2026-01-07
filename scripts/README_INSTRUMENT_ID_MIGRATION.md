# instrument_idカラム追加マイグレーション

## 概要

`goals`テーブルに`instrument_id`カラムを追加して、各楽器ごとに目標データを分けて管理できるようにします。

## 方法1: Supabaseダッシュボードから実行（推奨）

最も簡単で確実な方法です。

1. Supabaseダッシュボードにアクセス: https://supabase.com/dashboard
2. プロジェクトを選択（`uteeqkpsezbabdmritkn`）
3. 左メニューから「SQL Editor」を開く
4. 以下のSQLをコピーして実行:

```sql
-- ============================================
-- goalsテーブルにinstrument_idカラムを追加
-- ============================================
-- 日付: 2025-12-26
-- 目的: 目標を楽器ごとに分けて管理できるようにする

-- instrument_idカラムを追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'goals' 
    AND column_name = 'instrument_id'
  ) THEN
    ALTER TABLE public.goals 
    ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.goals.instrument_id IS '楽器ID（楽器ごとに目標を分けて管理）';
  END IF;
END $$;

-- インデックスを追加（既に存在する場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_goals_instrument_id ON public.goals(instrument_id);
```

5. 「Run」ボタンをクリックして実行
6. 成功メッセージが表示されれば完了

## 方法2: スクリプトを使用（Supabase CLIが設定されている場合）

```bash
cd music-practice
chmod +x scripts/apply_instrument_id_migration.sh
./scripts/apply_instrument_id_migration.sh
```

## 注意事項

- このマイグレーションは既存のデータを削除しません
- `instrument_id`カラムはNULL許可なので、既存の目標データは`instrument_id = NULL`のまま残ります
- 新しい目標を作成する際に、選択した楽器のIDが自動的に設定されます

## 確認方法

マイグレーション後、以下のSQLで確認できます:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'goals' AND column_name = 'instrument_id';
```

`instrument_id`カラムが表示されれば成功です。

