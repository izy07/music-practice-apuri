# CSVファイルの見方・分析方法ガイド

## ステップ1: SupabaseダッシュボードでSQLを実行

### 1. Supabaseダッシュボードにアクセス
- https://supabase.com/dashboard にログイン
- プロジェクトを選択

### 2. SQL Editorを開く
- 左メニューから「SQL Editor」をクリック
- 「New query」をクリック

### 3. SQLスクリプトを実行
- `scripts/export_all_users_data_admin.sql` を開く
- 以下のクエリをコピー＆ペースト（練習記録を取得する例）：

```sql
-- 練習記録をCSV形式で取得
SELECT 
  ps.id,
  ps.user_id,
  up.display_name,
  ps.practice_date,
  ps.duration_minutes,
  ps.content,
  ps.input_method,
  i.name AS instrument_name,
  ps.created_at
FROM practice_sessions ps
LEFT JOIN user_profiles up ON ps.user_id = up.user_id
LEFT JOIN instruments i ON ps.instrument_id = i.id
ORDER BY ps.practice_date DESC, ps.created_at DESC;
```

### 4. 実行とダウンロード
- 「Run」ボタンをクリック（または Cmd+Enter / Ctrl+Enter）
- 結果が表示されたら、テーブルの右上にある「Download CSV」ボタンをクリック
- CSVファイルがダウンロードされます

## ステップ2: CSVファイルを開く

### 方法1: Excel（Mac/Windows）

1. **ダウンロードしたCSVファイルをダブルクリック**
   - Excelが自動的に開きます

2. **文字化けする場合**
   - Excelで「データ」→「テキスト/CSVから」を選択
   - ファイルを選択
   - 「文字コード」を「UTF-8」に設定
   - 「読み込み」をクリック

3. **データの確認**
   - 各列が正しく表示されているか確認
   - 列名（ヘッダー）が1行目にあることを確認

### 方法2: Google Sheets（無料・推奨）

1. **Google Sheetsを開く**
   - https://sheets.google.com にアクセス
   - 「空白」をクリック

2. **CSVファイルをインポート**
   - 「ファイル」→「インポート」を選択
   - 「アップロード」タブを選択
   - CSVファイルをドラッグ＆ドロップ
   - 「文字コード」を「UTF-8」に設定
   - 「データをインポート」をクリック

3. **メリット**
   - 無料で使用可能
   - クラウドに保存される
   - 複数のデバイスからアクセス可能
   - 共有が簡単

### 方法3: テキストエディタ（簡単な確認用）

- **Mac**: テキストエディット、VS Code
- **Windows**: メモ帳、VS Code
- ただし、データ分析には不向きです

## ステップ3: データの見方・分析

### 基本的な見方

CSVファイルには以下のような列があります：

| 列名 | 説明 |
|------|------|
| `id` | レコードのID |
| `user_id` | ユーザーID |
| `display_name` | ユーザー名 |
| `practice_date` | 練習日 |
| `duration_minutes` | 練習時間（分） |
| `content` | 練習内容 |
| `input_method` | 入力方法（manual/preset/voice/timer） |
| `instrument_name` | 楽器名 |
| `created_at` | 作成日時 |

### Excel/Google Sheetsでの分析

#### 1. 練習時間の合計を計算

**Excel:**
```
=SUM(E:E)  // E列がduration_minutesの場合
```

**Google Sheets:**
```
=SUM(E:E)
```

#### 2. ユーザー別の練習時間を集計

1. データ範囲を選択
2. 「データ」→「ピボットテーブル」を選択
3. 行：`display_name`（または`user_id`）
4. 値：`duration_minutes`（合計）
5. 「作成」をクリック

#### 3. 日付別の練習時間を集計

1. ピボットテーブルを作成
2. 行：`practice_date`
3. 値：`duration_minutes`（合計）
4. 日付で並べ替え

#### 4. グラフを作成

1. 集計したデータを選択
2. 「挿入」→「グラフ」を選択
3. 折れ線グラフまたは棒グラフを選択
4. 練習時間の推移を可視化

### よくある分析例

#### 例1: 月別の練習時間推移

```sql
-- 月別集計クエリを実行
SELECT 
  DATE_TRUNC('month', practice_date) AS month,
  COUNT(DISTINCT user_id) AS active_users,
  COUNT(*) AS total_sessions,
  SUM(duration_minutes) AS total_minutes,
  ROUND(SUM(duration_minutes) / 60.0, 2) AS total_hours
FROM practice_sessions
GROUP BY month
ORDER BY month DESC;
```

結果をCSVでダウンロードして、グラフを作成。

#### 例2: トップユーザーランキング

```sql
-- ユーザー別の練習時間集計
SELECT 
  up.user_id,
  up.display_name,
  COUNT(DISTINCT ps.practice_date) AS days_practiced,
  COUNT(ps.id) AS total_sessions,
  SUM(ps.duration_minutes) AS total_minutes,
  ROUND(SUM(ps.duration_minutes) / 60.0, 2) AS total_hours
FROM user_profiles up
LEFT JOIN practice_sessions ps ON up.user_id = ps.user_id
GROUP BY up.user_id, up.display_name
ORDER BY total_minutes DESC
LIMIT 20;
```

#### 例3: 楽器別の統計

```sql
-- 楽器別の練習時間
SELECT 
  i.name AS instrument_name,
  COUNT(*) AS session_count,
  COUNT(DISTINCT ps.user_id) AS user_count,
  SUM(ps.duration_minutes) AS total_minutes,
  ROUND(AVG(ps.duration_minutes), 2) AS avg_minutes
FROM practice_sessions ps
LEFT JOIN instruments i ON ps.instrument_id = i.id
GROUP BY i.name
ORDER BY session_count DESC;
```

## ステップ4: データの整理と可視化

### Google Sheetsでの便利な機能

1. **条件付き書式**
   - 練習時間が長いセルを色分け
   - 「書式」→「条件付き書式」を選択

2. **フィルタ**
   - 特定のユーザーや期間でフィルタリング
   - ヘッダー行を選択して「データ」→「フィルタを作成」

3. **グラフの作成**
   - データを選択
   - 「挿入」→「グラフ」
   - 折れ線グラフ、棒グラフ、円グラフなど

### Excelでの便利な機能

1. **テーブル化**
   - データ範囲を選択
   - 「挿入」→「テーブル」
   - フィルタとソートが簡単に

2. **グラフの作成**
   - データを選択
   - 「挿入」→「グラフ」
   - 様々なグラフタイプから選択

## トラブルシューティング

### 文字化けする場合

**Excel:**
1. 「データ」→「テキスト/CSVから」を選択
2. ファイルを選択
3. 「文字コード」を「UTF-8」に変更

**Google Sheets:**
1. インポート時に「文字コード」を「UTF-8」に設定

### 日付が正しく表示されない場合

1. 日付列を選択
2. 「書式」→「数値」→「日付」を選択
3. または、手動で日付形式に変換

### 数値が文字列として認識される場合

1. 数値列を選択
2. 「書式」→「数値」を選択
3. または、`=VALUE(セル)` で変換

## 次のステップ

データを分析したら、以下のような分析が可能です：

1. **ユーザーエンゲージメント分析**
   - アクティブユーザー数
   - リテンション率
   - 練習頻度

2. **機能使用状況分析**
   - 入力方法の使用率
   - 楽器別の使用状況
   - 目標設定の利用状況

3. **パフォーマンス分析**
   - 平均練習時間
   - 練習の継続性
   - 目標達成率

## 参考リンク

- [Google Sheets ヘルプ](https://support.google.com/sheets)
- [Excel ヘルプ](https://support.microsoft.com/excel)
- [SQLクエリ例](scripts/export_all_users_data_admin.sql)

