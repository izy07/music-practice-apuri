# RLS無限再帰エラーの修正手順

## 問題
`user_group_memberships`テーブルのRLSポリシーで無限再帰エラー（`42P17`）が発生しています。

## 解決方法

### 方法1: Supabase DashboardでSQLを実行（推奨）

1. Supabase Dashboardを開く
   ```
   http://localhost:54323
   ```

2. SQL Editorを開く

3. 以下のSQLファイルの内容をコピー＆ペーストして実行
   ```
   music-practice/supabase/fix_infinite_recursion.sql
   ```

### 方法2: Supabase CLIを使用

```bash
cd music-practice
supabase db reset
```

または、マイグレーションファイルを適用：

```bash
cd music-practice
supabase migration up
```

## 修正内容

このSQLスクリプトは以下を実行します：

1. 既存のRLSポリシーと関数を削除
2. `SET LOCAL row_security = off`を使用した新しいセキュリティ関数を作成
3. 循環参照のない新しいRLSポリシーを作成

## 注意事項

- この修正はデータベースのRLSポリシーを変更します
- 本番環境に適用する前に、必ずバックアップを取得してください
- 修正後、アプリケーションを再起動してください

