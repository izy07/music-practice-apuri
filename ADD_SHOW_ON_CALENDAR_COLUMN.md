# show_on_calendarカラムを追加する手順

## 方法1: Supabase DashboardのSQL Editorを使用（推奨）

1. Supabase Dashboardを開く
   ```
   http://127.0.0.1:54323
   ```

2. 左側のメニューから「SQL Editor」をクリック

3. 以下のSQLをコピー＆ペーストして実行：

```sql
-- goalsテーブルにshow_on_calendar列を追加（存在しない場合のみ）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'goals' AND column_name = 'show_on_calendar') THEN
      ALTER TABLE goals ADD COLUMN show_on_calendar BOOLEAN DEFAULT false;
      COMMENT ON COLUMN goals.show_on_calendar IS 'カレンダーに表示するかどうか（true: 表示, false: 非表示）';
      
      -- 既存のレコードをfalseに設定
      UPDATE goals SET show_on_calendar = false WHERE show_on_calendar IS NULL;
    END IF;
  END IF;
END $$;

-- インデックスを作成（存在しない場合のみ）
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_goals_show_on_calendar') THEN
      CREATE INDEX idx_goals_show_on_calendar ON goals(show_on_calendar) WHERE show_on_calendar = true;
    END IF;
  END IF;
END $$;
```

4. 「Run」ボタンをクリックして実行

## 方法2: マイグレーションをリセット（すべてのマイグレーションを再実行）

```bash
npx supabase db reset
```

注意: このコマンドはすべてのマイグレーションを再実行するため、時間がかかる場合があります。

## 確認方法

マイグレーション実行後、以下で確認できます：

1. Supabase Dashboardの「Table Editor」で`goals`テーブルを開く
2. `show_on_calendar`カラムが存在することを確認
3. アプリケーションを再起動して、警告が消えることを確認

