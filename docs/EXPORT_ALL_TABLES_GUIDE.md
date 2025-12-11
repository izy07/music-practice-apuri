# 全テーブル一括エクスポートガイド

## 概要

全てのユーザーデータテーブルを一度にエクスポートする方法です。

## 実行手順

### ステップ1: Supabaseダッシュボードを開く

1. https://supabase.com/dashboard にアクセス
2. ログインしてプロジェクトを選択

### ステップ2: SQL Editorを開く

1. 左メニューから「SQL Editor」をクリック
2. 「New query」をクリック

### ステップ3: スクリプトを開く

1. `scripts/export_all_tables_at_once.sql` を開く
2. 全てのクエリをコピー＆ペースト

### ステップ4: 各クエリを個別に実行

SupabaseのSQL Editorでは、複数のSELECT文を一度に実行できますが、**最後のSELECT文の結果のみが表示されます**。

そのため、以下の2つの方法があります：

#### 方法A: 各クエリを個別に実行（推奨）

1. **1つ目のクエリを選択**（例：ユーザープロフィール）
2. 「Run」ボタンをクリック
3. 結果が表示されたら「Download CSV」でダウンロード
4. ファイル名を変更（例：`user_profiles.csv`）
5. **2つ目のクエリを選択**（例：練習記録）
6. 同様に実行・ダウンロード
7. 全てのクエリ（1〜12）を繰り返す

#### 方法B: 全てのクエリを一度に実行（結果は最後のクエリのみ）

1. 全てのクエリをコピー＆ペースト
2. 「Run」ボタンをクリック
3. 最後のクエリ（月別統計）の結果が表示されます
4. 他のクエリの結果は表示されませんが、実行はされています

**注意**: 方法Bでは、最後のクエリの結果しか見えません。各テーブルのデータを取得するには、方法Aを使用してください。

## エクスポートされるテーブル一覧

| No | テーブル名 | ファイル名の推奨 | 説明 |
|----|-----------|----------------|------|
| 1 | user_profiles | `user_profiles.csv` | ユーザープロフィール情報 |
| 2 | practice_sessions | `practice_sessions.csv` | 練習記録（詳細） |
| 3 | goals | `goals.csv` | 目標設定 |
| 4 | events | `events.csv` | イベント情報 |
| 5 | recordings | `recordings.csv` | 録音データ |
| 6 | my_songs | `my_songs.csv` | マイソング |
| 7 | user_settings | `user_settings.csv` | ユーザー設定 |
| 8 | tutorial_progress | `tutorial_progress.csv` | チュートリアル進捗 |
| 9 | auth.users | `auth_users.csv` | 認証ユーザー情報（メール含む） |
| 10 | 統計サマリー | `user_summary.csv` | ユーザー別練習時間集計 |
| 11 | 楽器別統計 | `instrument_stats.csv` | 楽器別の統計 |
| 12 | 月別統計 | `monthly_stats.csv` | 月別の統計 |

## 効率的な実行方法

### 方法1: 必要なテーブルのみ実行

全てのテーブルではなく、必要なテーブルのみを実行することもできます：

```sql
-- 例: 練習記録とユーザー集計のみ
-- 2. 練習記録のクエリを実行
-- 10. 統計サマリーのクエリを実行
```

### 方法2: 期間を指定して実行

大量のデータがある場合、期間を指定してエクスポートできます：

```sql
-- 練習記録を2024年以降のみ取得
SELECT ... 
FROM practice_sessions ps
WHERE ps.practice_date >= '2024-01-01'
...
```

### 方法3: バッチ実行スクリプト（上級者向け）

Pythonスクリプトを作成して、全てのクエリを自動実行することもできます：

```python
import requests
import csv

# Supabaseのサービスロールキーを使用
SUPABASE_URL = "https://your-project.supabase.co"
SERVICE_ROLE_KEY = "your-service-role-key"

queries = [
    ("user_profiles", "SELECT ... FROM user_profiles ..."),
    ("practice_sessions", "SELECT ... FROM practice_sessions ..."),
    # ... 他のクエリ
]

for table_name, query in queries:
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        },
        json={"query": query}
    )
    
    data = response.json()
    
    # CSVに保存
    with open(f"{table_name}.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
    
    print(f"✅ {table_name}.csv を保存しました")
```

## ファイルの整理

ダウンロードしたCSVファイルを整理する方法：

### フォルダ構成の例

```
exports/
├── 2024-01-15/
│   ├── user_profiles.csv
│   ├── practice_sessions.csv
│   ├── goals.csv
│   ├── events.csv
│   ├── recordings.csv
│   ├── my_songs.csv
│   ├── user_settings.csv
│   ├── tutorial_progress.csv
│   ├── auth_users.csv
│   ├── user_summary.csv
│   ├── instrument_stats.csv
│   └── monthly_stats.csv
```

### ファイル名の命名規則

- 日付を含める: `user_profiles_2024-01-15.csv`
- バージョンを含める: `practice_sessions_v1.csv`
- 説明を含める: `user_summary_all_users.csv`

## データの確認

各CSVファイルを開いて、以下の点を確認してください：

1. **データが正しく取得されているか**
   - 行数が期待通りか
   - 列が正しく表示されているか

2. **文字化けがないか**
   - 日本語が正しく表示されているか
   - 特殊文字が正しく表示されているか

3. **データの整合性**
   - user_idが正しく関連付けられているか
   - 日付が正しい形式か

## トラブルシューティング

### エラー: "relation does not exist"

テーブルが存在しない可能性があります。Supabaseダッシュボードの「Table Editor」でテーブルの存在を確認してください。

### エラー: "permission denied"

RLS（Row Level Security）の設定を確認してください。SupabaseダッシュボードのSQL Editorでは自動的にバイパスされますが、プログラムから実行する場合はサービスロールキーが必要です。

### データが空の場合

- テーブルにデータが存在するか確認
- WHERE句の条件を確認
- 日付範囲を確認

## 次のステップ

データをエクスポートしたら：

1. **データの分析**
   - Excel/Google Sheetsで分析
   - グラフを作成
   - 統計を計算

2. **レポートの作成**
   - ユーザーエンゲージメント分析
   - 機能使用状況分析
   - パフォーマンス分析

3. **データの保管**
   - 暗号化して保管
   - アクセスログを記録
   - 定期的にバックアップ

## 関連ファイル

- `scripts/export_all_tables_at_once.sql` - 全テーブルエクスポートスクリプト
- `scripts/quick_export_practice_sessions.sql` - 練習記録のみ
- `scripts/quick_export_user_summary.sql` - ユーザー集計のみ
- `docs/HOW_TO_VIEW_CSV.md` - CSVファイルの見方




