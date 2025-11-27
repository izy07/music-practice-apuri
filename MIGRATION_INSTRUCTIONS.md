# データベースマイグレーション実行手順

## 問題の概要

新規登録後にメイン画面で以下のエラーが発生していました：
- `user_group_memberships`テーブルが存在しない（404エラー）
- `events`テーブルの`event_date`カラムが存在しない（400エラー）
- `basic_practice_completions`テーブルが存在しない（404エラー）
- `goals`テーブルの`instrument_id`カラムが存在しない（400エラー）
- `goals`テーブルの`show_on_calendar`カラムが存在しない（400エラー）

## 解決方法

マイグレーションファイル `20251119000000_fix_missing_tables_and_columns.sql` を作成しました。
このマイグレーションを実行することで、不足しているテーブルとカラムが作成されます。

## マイグレーションの実行方法

### 方法1: Supabase CLIを使用（推奨）

```bash
# プロジェクトルートに移動
cd music-practice

# マイグレーションを実行
npx supabase db push

# または
npx supabase migration up
```

### 方法2: Supabase Dashboardを使用

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. プロジェクトを選択
3. 「SQL Editor」を開く
4. `supabase/migrations/20251119000000_fix_missing_tables_and_columns.sql` の内容をコピー＆ペースト
5. 「Run」をクリックして実行

### 方法3: ローカルSupabaseを使用している場合

```bash
# ローカルSupabaseを起動
npx supabase start

# マイグレーションを実行
npx supabase db reset
```

## マイグレーションの内容

このマイグレーションは以下を実行します：

1. **eventsテーブルにevent_dateカラムを追加**
   - `date`カラムの値を`event_date`にコピー
   - `date`と`event_date`を同期するトリガーを作成

2. **basic_practice_completionsテーブルを作成**
   - テーブルが存在しない場合のみ作成
   - RLSポリシーを設定

3. **user_group_membershipsテーブルを作成**
   - テーブルが存在しない場合のみ作成
   - RLSポリシーを設定

4. **goalsテーブルにinstrument_idカラムを追加**
   - カラムが存在しない場合のみ追加
   - インデックスを作成

5. **goalsテーブルにshow_on_calendarカラムを追加**
   - カラムが存在しない場合のみ追加
   - インデックスを作成

## マイグレーション実行後の確認

マイグレーション実行後、以下のコマンドで確認できます：

```bash
# マイグレーションの状態を確認
npx supabase migration list
```

または、Supabase Dashboardの「Database」→「Tables」で、以下のテーブルとカラムが存在することを確認してください：

- ✅ `events`テーブルに`event_date`カラムが存在
- ✅ `basic_practice_completions`テーブルが存在
- ✅ `user_group_memberships`テーブルが存在
- ✅ `goals`テーブルに`instrument_id`カラムが存在
- ✅ `goals`テーブルに`show_on_calendar`カラムが存在

## 注意事項

- このマイグレーションは安全に実行できます（既存のテーブルやカラムが存在する場合はスキップされます）
- 本番環境で実行する前に、必ずバックアップを取得してください
- マイグレーション実行後、アプリを再起動してください





