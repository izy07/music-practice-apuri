# representative_songsテーブル作成手順

## 問題
`representative_songs`テーブルがデータベースに存在しないため、バイオリンの代表曲が表示されません。

エラー: `Could not find the table 'public.representative_songs' in the schema cache`

## 解決方法

### 方法1: Supabase DashboardのSQL Editorを使用（推奨）

1. Supabase Dashboardを開く
   ```
   http://localhost:54323
   ```

2. 「SQL Editor」をクリック

3. 以下のSQLファイルの内容をコピー＆ペースト
   ```
   supabase/migrations/20250122000001_ensure_representative_songs_table.sql
   ```

4. 「Run」をクリックして実行

### 方法2: マイグレーションを実行

```bash
cd music-practice
npx supabase db reset
```

注意: このコマンドはすべてのマイグレーションを再実行するため、時間がかかる場合があります。

### 方法3: 直接SQLを実行（PostgreSQLクライアントがある場合）

```bash
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/20250122000001_ensure_representative_songs_table.sql
```

## マイグレーションの内容

このマイグレーションは以下を実行します：

1. **representative_songsテーブルの作成**
   - すべての必要なカラムを含む
   - インデックスの作成
   - RLS（Row Level Security）の有効化

2. **バイオリンの代表曲データの追加**
   - 13曲の代表曲を追加
   - instrument_id: `550e8400-e29b-41d4-a716-446655440003`

## 確認方法

マイグレーション実行後、以下で確認できます：

1. Supabase Dashboardの「Table Editor」で`representative_songs`テーブルを確認
2. アプリケーションで代表曲画面を開いて、バイオリンの代表曲が表示されることを確認

## トラブルシューティング

### テーブルが作成されない場合

1. Supabaseが起動しているか確認
   ```bash
   npx supabase status
   ```

2. マイグレーションファイルが正しい場所にあるか確認
   ```
   supabase/migrations/20250122000001_ensure_representative_songs_table.sql
   ```

3. SQL Editorで直接確認
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'representative_songs';
   ```

### 代表曲が表示されない場合

1. テーブルにデータが存在するか確認
   ```sql
   SELECT COUNT(*) FROM representative_songs WHERE instrument_id = '550e8400-e29b-41d4-a716-446655440003';
   ```

2. アプリケーションのコンソールログを確認
   - `[RepresentativeSongs]`で始まるログを確認

