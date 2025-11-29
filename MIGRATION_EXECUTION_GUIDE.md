# データベースマイグレーション実行ガイド

## ⚠️ 重要: このマイグレーションを実行しないとエラーが続きます

**現在、以下のエラーが発生しています：**

1. **eventsテーブルのGETリクエストが400エラー**
   - 原因: `date`カラムが存在しない
   - エラーメッセージ: `eventsテーブルのdateカラムが存在しません。マイグレーションを実行してください。`

2. **user_profilesテーブルのPATCHリクエストが400エラー**
   - 原因: RLSポリシーやテーブル構造の問題
   - エラーメッセージ: `400 (Bad Request)`

**これらのエラーを解決するには、以下のマイグレーションSQLを実行する必要があります。**

## 概要

このガイドでは、`events`テーブルと`user_profiles`テーブルの400エラーを解決するためのマイグレーションSQLの実行方法を説明します。

## 解決方法

以下のマイグレーションSQLをSupabaseダッシュボードで実行してください。

### 実行手順（必須）

**⚠️ この手順を実行しないと、アプリでエラーが続きます。**

1. **Supabaseダッシュボードにログイン**
   - https://supabase.com/dashboard にアクセス
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左側のメニューから「SQL Editor」をクリック
   - または、直接 https://supabase.com/dashboard/project/[プロジェクトID]/sql/new にアクセス

3. **マイグレーションSQLをコピー**
   - 以下のいずれかのファイルを開いて、内容をすべてコピー：
     - `supabase/migrations/20251128000007_fix_events_and_user_profiles.sql`
     - `scripts/fix_events_and_user_profiles.sql`
   - ファイルパス: `music-practice/supabase/migrations/20251128000007_fix_events_and_user_profiles.sql`

4. **SQL Editorに貼り付けて実行**
   - SQL Editorにコピーした内容を貼り付け
   - 「Run」ボタン（または Ctrl+Enter / Cmd+Enter）をクリックして実行
   - 実行には数秒かかる場合があります

5. **実行結果を確認**
   - 成功メッセージ（「✅ eventsテーブルとuser_profilesテーブルの修正が完了しました」など）が表示されることを確認
   - エラーが発生した場合は、エラーメッセージを確認して対応
   - エラーが表示されても、一部の処理（例: 既に存在するテーブルやカラム）は無視しても問題ありません

### マイグレーションの内容

このマイグレーションは以下の処理を実行します：

#### 1. eventsテーブルの修正
- `events`テーブルの作成（存在しない場合）
- `date`カラムの追加（存在しない場合）
- 既存レコードへのデフォルト値設定
- インデックスの作成
- RLSポリシーの設定
- 権限の付与

#### 2. user_profilesテーブルの修正
- `user_profiles`テーブルの作成（存在しない場合）
- インデックスの作成
- `updated_at`自動更新トリガーの設定
- RLSポリシーの再作成
- 権限の付与

### 注意事項

- このマイグレーションは**冪等性**を保証しています（同じSQLを複数回実行しても安全）
- 既存のデータは保持されます
- 既存のRLSポリシーは削除され、新しいポリシーが作成されます

### トラブルシューティング

#### エラー: "permission denied"
- Supabaseのプロジェクト管理者権限があることを確認してください

#### エラー: "relation already exists"
- このエラーは無視しても問題ありません（`IF NOT EXISTS`により安全に処理されます）

#### エラー: "column already exists"
- このエラーは無視しても問題ありません（既にカラムが存在する場合）

### 実行後の確認

マイグレーション実行後、以下のコマンドで確認できます：

```sql
-- eventsテーブルのdateカラムを確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'date';

-- user_profilesテーブルのRLSポリシーを確認
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles';
```

### サポート

問題が解決しない場合は、以下を確認してください：

1. Supabaseプロジェクトの設定
2. 認証状態（ログインしているか）
3. ネットワーク接続

