# 代表曲画面エラー分析

## エラー概要

代表曲画面で以下のエラーが発生しています：

```
GET https://uteeqkpsezbabdmritkn.supabase.co/rest/v1/representative_songs?select=*&instrument_id=eq.550e8400-e29b-41d4-a716-446655440005&order=display_order.asc 404 (Not Found)

[代表曲画面] representative_songsテーブルが存在しません。フォールバックデータを使用します。
{code: 'PGRST205', details: null, hint: "Perhaps you meant the table 'public.target_songs'", 
message: "Could not find the table 'public.representative_songs' in the schema cache"}
```

## エラーの原因

1. **テーブルが存在しない**
   - `representative_songs`テーブルがデータベースに存在しない
   - Supabaseのスキーマキャッシュにテーブルが登録されていない（PGRST205エラー）

2. **マイグレーション未適用の可能性**
   - マイグレーションファイルは複数存在しているが、データベースに適用されていない可能性がある

3. **フォールバック動作**
   - エラー発生時に`instrumentGuides.ts`からフォールバックデータを使用
   - 全楽器共通の曲（きらきら星、メリーさんの羊など）が表示されていた

## 対応済みの修正

### 1. 全楽器共通の曲を削除 ✅

`instrumentGuides.ts`から以下の全楽器共通の曲を削除しました：

**初心者向け曲（削除済み）:**
- きらきら星
- メリーさんの羊
- かえるの歌
- チューリップ
- ロンドン橋
- むすんでひらいて
- ちょうちょう
- 春の小川

**中級者向け曲（削除済み）:**
- アニー・ローリー
- ロング・ロング・アゴー
- アマリリス

これにより、フォールバックデータ使用時も全楽器共通の曲は表示されなくなります。

## 推奨される対応

### 1. マイグレーションの確認と適用

以下のマイグレーションファイルが存在します。データベースに適用されているか確認してください：

- `supabase/migrations/20250122000003_ensure_representative_songs_table.sql`
- `supabase/migrations/20251205000000_create_and_populate_representative_songs.sql`
- `supabase/migrations/20250817000004_create_representative_songs.sql`

**確認方法:**
```sql
-- Supabase StudioのSQL Editorで実行
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'representative_songs';
```

### 2. テーブルが存在しない場合の対応

テーブルが存在しない場合は、最新のマイグレーションファイルを実行してください：

```bash
# 最新のマイグレーションファイルを使用
# supabase/migrations/20251205000000_create_and_populate_representative_songs.sql
```

または、Supabase StudioのSQL Editorで直接実行できます。

### 3. RLS（Row Level Security）ポリシーの確認

テーブルが存在してもアクセスできない場合は、RLSポリシーを確認してください：

```sql
-- ポリシーの確認
SELECT * FROM pg_policies WHERE tablename = 'representative_songs';

-- ポリシーの作成（読み取りのみ）
CREATE POLICY "Anyone can view representative songs" ON representative_songs
  FOR SELECT USING (true);
```

## 現在の動作

1. **データベースにテーブルがある場合**
   - データベースから代表曲を取得して表示

2. **データベースにテーブルがない場合**
   - フォールバックデータ（`instrumentGuides.ts`）を使用
   - 全楽器共通の曲は表示されない（削除済み）
   - 楽器固有の曲のみ表示される

## 今後の改善点

1. データベースに代表曲データを投入する
2. マイグレーションを確実に適用する
3. エラーハンドリングを改善して、ユーザーに分かりやすいメッセージを表示する

