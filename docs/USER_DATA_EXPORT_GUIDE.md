# ユーザーデータエクスポートガイド

## 概要

このガイドでは、楽器練習アプリから取得できるユーザーデータの範囲と、統計分析に必要なツールについて説明します。

## 取得可能なデータの範囲

RLS（Row Level Security）により、**自分のデータのみ**が取得できます。他のユーザーのデータにはアクセスできません。

### 1. ユーザープロフィール情報（user_profiles）

- 表示名、アバターURL
- 練習レベル
- 選択中の楽器ID
- 所属団体情報
- ニックネーム、自己紹介
- 生年月日、年齢
- 音楽開始年齢、経験年数
- 総練習時間（分）
- 作成日時、更新日時

### 2. 練習記録（practice_sessions）

- 練習日付
- 練習時間（分）
- 練習内容（テキスト）
- 楽器ID
- 入力方法（手動/プリセット/音声/タイマー）
- 録音URL（ある場合）
- 作成日時、更新日時

### 3. 目標（goals）

- タイトル、説明
- 目標日付
- 目標タイプ（個人短期/個人長期/グループ）
- 進捗率（0-100%）
- 達成状況
- カレンダー表示設定
- 楽器ID
- 作成日時、更新日時

### 4. イベント（events）

- タイトル、説明
- イベント日付
- 練習日程との連携ID
- 作成日時、更新日時

### 5. 録音データ（recordings）

- タイトル、メモ
- ファイルパス
- 録音時間（秒）
- お気に入りフラグ
- 楽器ID
- 録音日時
- 作成日時

### 6. マイソング（my_songs）

- タイトル、アーティスト
- ジャンル
- 難易度（初級/中級/上級）
- ステータス（やりたい/学習中/演奏済み/マスター済み）
- メモ
- 目標日付
- 作成日時、更新日時

### 7. ユーザー設定（user_settings）

- 言語設定
- テーマ設定
- 通知設定
- メトロノーム設定（JSON）
- チューナー設定（JSON）
- 作成日時、更新日時

### 8. チュートリアル進捗（tutorial_progress）

- 完了状況
- 完了日時
- 現在のステップ
- 作成日時、更新日時

### 9. その他のデータ（オプション）

- 休止期間（user_break_periods）
- 過去の所属団体（user_past_organizations）
- 受賞（user_awards）
- 演奏経験（user_performances）

## データエクスポート方法

### 方法1: Supabaseダッシュボードからエクスポート

1. Supabaseダッシュボードにログイン
2. SQL Editorを開く
3. `scripts/export_user_data.sql` のクエリを実行
4. 結果をJSON形式でコピーまたはダウンロード

### 方法2: 個別テーブルからエクスポート

各テーブルごとに個別にエクスポートする場合：

```sql
-- 例: 練習記録をCSV形式でエクスポート
SELECT 
  practice_date,
  duration_minutes,
  content,
  input_method
FROM practice_sessions
WHERE user_id = auth.uid()
ORDER BY practice_date DESC;
```

### 方法3: アプリケーションからエクスポート（将来実装予定）

アプリ内にデータエクスポート機能を追加する予定です。

## 統計分析に必要なアプリケーション

### 1. データ分析ツール

#### Excel / Google Sheets
- **用途**: 基本的な統計分析、グラフ作成
- **メリット**: 無料、使いやすい、CSVインポート対応
- **推奨用途**: 
  - 練習時間の推移グラフ
  - 月別/週別の練習時間集計
  - 目標達成率の計算

#### Python + Jupyter Notebook
- **用途**: 高度なデータ分析、機械学習
- **必要なライブラリ**:
  - `pandas`: データ操作
  - `matplotlib` / `seaborn`: グラフ作成
  - `numpy`: 数値計算
- **推奨用途**:
  - 練習パターンの分析
  - 目標達成予測
  - 練習時間と上達度の相関分析

#### R
- **用途**: 統計分析、データ可視化
- **推奨用途**: 統計的検定、回帰分析

### 2. データ可視化ツール

#### Tableau Public（無料版あり）
- **用途**: インタラクティブなダッシュボード作成
- **メリット**: ドラッグ&ドロップで簡単に可視化

#### Power BI（無料版あり）
- **用途**: ビジネスインテリジェンス、ダッシュボード作成
- **メリット**: Microsoft製品との統合

#### Google Data Studio（無料）
- **用途**: ダッシュボード作成、共有
- **メリット**: 無料、クラウドベース

### 3. データベース接続ツール

#### DBeaver（無料）
- **用途**: データベース接続、クエリ実行、データエクスポート
- **メリット**: 複数のデータベースに対応

#### pgAdmin（無料）
- **用途**: PostgreSQL専用の管理ツール
- **メリット**: Supabase（PostgreSQL）に最適

### 4. 推奨ワークフロー

#### 初心者向け
1. SupabaseダッシュボードでSQLクエリを実行
2. 結果をCSV形式でエクスポート
3. Excel/Google Sheetsでインポート
4. グラフやピボットテーブルで分析

#### 中級者向け
1. Python + Jupyter Notebookでデータ分析
2. `pandas`でデータ読み込み・加工
3. `matplotlib`/`seaborn`で可視化
4. 分析結果をレポート化

#### 上級者向け
1. データベースに直接接続（DBeaver等）
2. 複雑なSQLクエリで集計
3. Python/Rで統計分析
4. Tableau/Power BIでダッシュボード作成

## 統計分析の例

### 1. 練習時間の分析

```sql
-- 月別練習時間
SELECT 
  DATE_TRUNC('month', practice_date) AS month,
  SUM(duration_minutes) AS total_minutes,
  COUNT(*) AS session_count
FROM practice_sessions
WHERE user_id = auth.uid()
GROUP BY month
ORDER BY month DESC;
```

### 2. 目標達成率の分析

```sql
-- 目標タイプ別の達成率
SELECT 
  goal_type,
  COUNT(*) AS total_goals,
  COUNT(*) FILTER (WHERE is_completed = true) AS completed_goals,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_completed = true) / COUNT(*), 2) AS completion_rate
FROM goals
WHERE user_id = auth.uid()
GROUP BY goal_type;
```

### 3. 楽器別の練習時間

```sql
-- 楽器別の練習時間集計
SELECT 
  i.name AS instrument_name,
  COUNT(*) AS session_count,
  SUM(ps.duration_minutes) AS total_minutes,
  AVG(ps.duration_minutes) AS avg_minutes_per_session
FROM practice_sessions ps
LEFT JOIN instruments i ON ps.instrument_id = i.id
WHERE ps.user_id = auth.uid()
GROUP BY i.name
ORDER BY total_minutes DESC;
```

## 注意事項

1. **プライバシー**: エクスポートしたデータは適切に管理してください
2. **データ形式**: JSON形式でエクスポートした場合、必要に応じてCSVに変換してください
3. **データ量**: 大量のデータをエクスポートする場合は、期間を指定して分割してください
4. **更新頻度**: データはリアルタイムで更新されるため、エクスポート時点のスナップショットです

## サポート

データエクスポートに関する質問や問題がある場合は、開発者にお問い合わせください。



