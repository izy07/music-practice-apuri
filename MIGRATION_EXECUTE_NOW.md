# 新規登録エラー修正マイグレーション実行手順

## 🔴 緊急: 新規登録後のエラーを修正するためのマイグレーション

このマイグレーションは、新規登録ユーザーがメイン画面にアクセスした際に発生するエラーを修正します。

---

## 📋 エラー内容

1. **`column goals.show_on_calendar does not exist`**
   - `goals`テーブルに`show_on_calendar`カラムが存在しない

2. **`user_profiles`テーブルのPATCHエラー（400 Bad Request）**
   - RLSポリシーまたは権限の問題

---

## ✅ 修正内容

### 1. コード修正（完了）
- `hooks/tabs/useCalendarData.ts`: `show_on_calendar`カラムが存在しない場合の対応を追加

### 2. データベースマイグレーション（実行必要）
- `supabase/migrations/20251203000000_fix_new_user_errors.sql`

---

## 🚀 マイグレーション実行方法

### 方法1: Supabaseダッシュボードから実行（推奨）

1. **Supabaseダッシュボードにログイン**
   - https://supabase.com/dashboard
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック

3. **マイグレーションファイルの内容をコピー**
   - `supabase/migrations/20251203000000_fix_new_user_errors.sql`の内容をすべてコピー

4. **SQLを実行**
   - SQL Editorに貼り付け
   - 「RUN」ボタンをクリック
   - エラーが出ないことを確認

5. **結果を確認**
   - 以下のメッセージが表示されれば成功：
     ```
     NOTICE: goalsテーブルにshow_on_calendarカラムを追加しました
     NOTICE: user_profilesテーブルのUPDATEポリシーを作成しました
     NOTICE: instrumentsテーブルは既に存在します
     ```

### 方法2: Supabase CLIから実行

```bash
# プロジェクトディレクトリに移動
cd music-practice

# Supabaseにログイン（初回のみ）
supabase login

# マイグレーションを実行
supabase db push

# または、特定のマイグレーションファイルを実行
supabase migration up 20251203000000_fix_new_user_errors
```

### 方法3: 直接SQLを実行

1. **Supabaseダッシュボード → Database → SQL Editor**

2. **以下のSQLを実行**（`20251203000000_fix_new_user_errors.sql`の内容）

---

## 📝 マイグレーション内容の詳細

### 1. `goals.show_on_calendar`カラムの追加
```sql
ALTER TABLE goals ADD COLUMN show_on_calendar BOOLEAN DEFAULT false;
```
- カレンダーに目標を表示するかどうかを管理するカラム
- 既存レコードは`false`（非表示）に設定

### 2. `user_profiles`テーブルのRLSポリシー修正
- UPDATEポリシーの確認・作成
- SELECTポリシーの確認・作成
- INSERTポリシーの確認・作成
- 権限の付与

### 3. `instruments`テーブルの存在確認
- テーブルが存在しない場合は作成
- RLSポリシーの設定

---

## ✅ 実行後の確認

### 1. エラーが解消されたか確認
- 新規ユーザーで登録
- メイン画面に正常にアクセスできるか確認
- コンソールエラーが消えているか確認

### 2. データベースの状態確認

Supabaseダッシュボード → Database → Tables で以下を確認：

- ✅ `goals`テーブルに`show_on_calendar`カラムが存在
- ✅ `user_profiles`テーブルのRLSポリシーが正しく設定されている
- ✅ `instruments`テーブルが存在

### 3. テスト

```sql
-- goalsテーブルの確認
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'goals' AND column_name = 'show_on_calendar';

-- user_profilesテーブルのポリシー確認
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_profiles';
```

---

## 🔄 ロールバック方法（必要な場合）

もし問題が発生した場合は、以下のSQLでロールバック可能：

```sql
-- show_on_calendarカラムを削除（必要な場合のみ）
ALTER TABLE goals DROP COLUMN IF EXISTS show_on_calendar;
```

---

## 📞 サポート

マイグレーション実行時にエラーが発生した場合：
1. エラーメッセージを確認
2. Supabaseのログを確認
3. 必要に応じて手動でSQLを実行

---

**作成日**: 2025-12-03  
**優先度**: 🔴 高（新規登録ユーザーがエラーで使用できない状態）




