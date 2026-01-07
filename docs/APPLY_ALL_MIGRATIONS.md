# すべてのマイグレーションを適用する方法

## 概要

このドキュメントでは、アプリケーションで使用されるすべてのカラムが確実に存在するように、必要なマイグレーションを適用する方法を説明します。

## 問題

以下のような状況で、カラムが存在しないエラーが発生する可能性があります：

- `instrument_id`カラムが存在しない
- `recording_type`カラムが存在しない
- `show_on_calendar`カラムが存在しない
- `is_completed`カラムが存在しない
- `event_date`カラムが存在しない

## 解決方法

### 方法1: 統合マイグレーションファイルを実行（推奨）

最も簡単で確実な方法は、`supabase/migrations/20251226000006_ensure_all_columns.sql`を実行することです。このファイルには、すべての必要なカラムが含まれています。

#### 手順

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard
   - プロジェクトを選択（`uteeqkpsezbabdmritkn`）

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」を選択

3. **マイグレーションファイルを実行**
   - `supabase/migrations/20251226000006_ensure_all_columns.sql`の内容をコピー
   - SQL Editorに貼り付けて「Run」ボタンをクリック

4. **実行結果を確認**
   - 成功メッセージが表示されれば完了
   - エラーが表示された場合は、エラーメッセージを確認

### 方法2: 不足しているカラムを確認してから実行

まず、不足しているカラムを確認してから、必要なマイグレーションのみを実行することもできます。

#### 手順

1. **不足しているカラムを確認**
   - `scripts/check-missing-columns.sql`の内容をSupabaseダッシュボードのSQL Editorで実行
   - 結果を確認して、❌マークが付いているカラムを特定

2. **必要なマイグレーションを実行**
   - 不足しているカラムに対応するマイグレーションファイルを実行
   - または、`20251226000006_ensure_all_columns.sql`を実行（すべてのカラムを一度に追加）

### 方法3: 個別のマイグレーションファイルを実行

以下のマイグレーションファイルを個別に実行することもできます：

- `20251226000000_add_instrument_id_to_my_songs.sql`
- `20251226000001_add_instrument_id_to_events.sql`
- `20251226000002_add_instrument_id_to_tasks.sql`
- `20251226000003_add_instrument_id_to_goals.sql`
- `20251226000004_add_instrument_id_to_recordings.sql`
- `20251226000005_add_instrument_id_to_practice_sessions.sql`
- `20251226000006_ensure_all_columns.sql`（すべてのカラムを含む）
- `20251227000001_ensure_tutorial_completed_columns.sql`

## マイグレーションファイルの内容

### `20251226000006_ensure_all_columns.sql`

このファイルには、以下のカラムが含まれています：

1. **my_songs.instrument_id** - 楽器ごとに曲を分けて管理
2. **recordings.instrument_id** - 楽器ごとに録音を分けて管理
3. **recordings.recording_type** - 録音種類（performance/lesson）
4. **practice_sessions.instrument_id** - 楽器ごとに練習記録を分けて管理
5. **goals.instrument_id** - 楽器ごとに目標を分けて管理
6. **goals.show_on_calendar** - カレンダーに表示するかどうか
7. **goals.is_completed** - 目標が完了したかどうか
8. **events.instrument_id** - 楽器ごとにイベントを分けて管理
9. **events.event_date** - イベント日付（dateカラムのエイリアス）
10. **tasks.instrument_id** - 楽器ごとにタスクを分けて管理

すべてのカラム追加は、既に存在する場合はスキップされるため、安全に実行できます。

## 確認方法

マイグレーション実行後、以下のSQLでカラムの存在を確認できます：

```sql
-- すべてのカラムの存在確認
SELECT 
  table_name,
  column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
      AND column_name = t.column_name
    ) THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END as status
FROM (
  VALUES 
    ('my_songs', 'instrument_id'),
    ('recordings', 'instrument_id'),
    ('recordings', 'recording_type'),
    ('practice_sessions', 'instrument_id'),
    ('goals', 'instrument_id'),
    ('goals', 'show_on_calendar'),
    ('goals', 'is_completed'),
    ('events', 'instrument_id'),
    ('events', 'event_date'),
    ('tasks', 'instrument_id')
) AS t(table_name, column_name)
ORDER BY table_name, column_name;
```

すべてのカラムが「✅ 存在する」と表示されれば、マイグレーションは成功しています。

## トラブルシューティング

### エラー: "relation does not exist"

テーブルが存在しない場合は、まず初期スキーマ（`20251219000000_initial_schema.sql`）を実行してください。

### エラー: "column already exists"

このエラーは無視して問題ありません。マイグレーションファイルは`IF NOT EXISTS`チェックを含んでいるため、既に存在するカラムはスキップされます。

### エラー: "permission denied"

RLS（Row Level Security）が有効になっている場合、適切な権限が必要です。Supabaseダッシュボードから実行する場合は、自動的に適切な権限で実行されます。

## まとめ

`supabase/migrations/20251226000006_ensure_all_columns.sql`を実行することで、アプリケーションで使用されるすべてのカラムが確実に存在するようになります。このマイグレーションは、既に存在するカラムをスキップするため、安全に実行できます。

