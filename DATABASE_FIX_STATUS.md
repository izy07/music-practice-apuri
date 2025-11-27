# データベース修正状況

## ⚠️ 重要な確認事項

### 現在の状態

✅ **コードの変更**: GitHubにプッシュ済み
- `instrument-selection.tsx` のリトライロジック
- マイグレーションファイルの追加
- GitHub Actionsワークフローの追加

❌ **本番データベースの修正**: **まだ実行されていません**

### なぜデータベースの修正が必要か

コードの変更だけでは、以下のエラーは解決しません：

1. **外部キー制約違反エラー**
   ```
   Key is not present in table "instruments"
   ```
   - 原因: `instruments`テーブルに「その他」楽器ID (`550e8400-e29b-41d4-a716-446655440016`) が存在しない
   - 解決方法: Supabase DashboardでSQLを実行する必要がある

2. **409 Conflictエラー**
   - コード側でリトライロジックを追加したが、根本原因（存在しないinstrument_id）が解決されない限り、エラーは続く

## 🔧 修正が必要な作業

### ステップ1: Supabase DashboardでSQLを実行

1. **Supabase Dashboardにアクセス**
   - https://supabase.com/dashboard
   - プロジェクト `uteeqkpsezbabdmritkn` を選択

2. **SQL Editorを開く**
   - 左メニュー → SQL Editor
   - New query をクリック

3. **以下のSQLを実行**

```sql
-- 「その他」楽器のIDを追加（最重要）
INSERT INTO instruments (id, name, name_en, color_primary, color_secondary, color_accent, starting_note, tuning_notes) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440016', 'その他', 'Other', '#9E9E9E', '#BDBDBD', '#757575', 'C4', ARRAY['C4'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  color_primary = EXCLUDED.color_primary,
  color_secondary = EXCLUDED.color_secondary,
  color_accent = EXCLUDED.color_accent,
  starting_note = EXCLUDED.starting_note,
  tuning_notes = EXCLUDED.tuning_notes;

-- 無効なinstrument_idをNULLに設定
UPDATE user_profiles
SET selected_instrument_id = NULL
WHERE selected_instrument_id IS NOT NULL
  AND selected_instrument_id NOT IN (SELECT id FROM instruments);

-- 外部キー制約の修正
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_selected_instrument_id_fkey'
  ) THEN
    ALTER TABLE user_profiles 
    DROP CONSTRAINT user_profiles_selected_instrument_id_fkey;
  END IF;

  ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_selected_instrument_id_fkey
  FOREIGN KEY (selected_instrument_id)
  REFERENCES instruments(id)
  ON DELETE SET NULL;
END $$;

-- 確認
SELECT 
  '✅ 修正完了' AS status,
  (SELECT COUNT(*) FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440016') AS other_instrument_exists,
  (SELECT COUNT(*) FROM user_profiles WHERE selected_instrument_id IS NOT NULL 
   AND selected_instrument_id NOT IN (SELECT id FROM instruments)) AS invalid_profiles_count;
```

4. **結果を確認**
   - `other_instrument_exists`: **1** であること
   - `invalid_profiles_count`: **0** であること

### ステップ2: 修正の確認

SQL実行後、以下のクエリで確認できます：

```sql
-- 「その他」楽器が存在するか確認
SELECT * FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440016';

-- 無効なinstrument_idがないか確認
SELECT COUNT(*) FROM user_profiles 
WHERE selected_instrument_id IS NOT NULL 
  AND selected_instrument_id NOT IN (SELECT id FROM instruments);
-- 結果が 0 であること
```

## 📊 修正前後の比較

### 修正前
- ❌ `instruments`テーブルにID `550e8400-e29b-41d4-a716-446655440016` が存在しない
- ❌ 外部キー制約違反エラーが発生
- ❌ 楽器選択が保存できない

### 修正後
- ✅ `instruments`テーブルにID `550e8400-e29b-41d4-a716-446655440016` が存在
- ✅ 外部キー制約違反エラーが解消
- ✅ 楽器選択が正常に保存できる

## ⚡ クイックチェック

データベースが修正されているか確認する方法：

```sql
-- このクエリで確認
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440016')
    THEN '✅ 修正済み'
    ELSE '❌ 未修正 - SQLを実行してください'
  END AS fix_status;
```

## 🎯 まとめ

- **コードの変更**: ✅ 完了（GitHubにプッシュ済み）
- **データベースの修正**: ❌ **まだ必要**（Supabase Dashboardで実行）

**データベースの修正を実行しない限り、エラーは解決しません。**

