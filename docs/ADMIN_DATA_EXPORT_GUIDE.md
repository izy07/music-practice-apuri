# 管理者用データエクスポートガイド

## 概要

アプリ作成者として、全ユーザーのデータを集計・分析するためのガイドです。

## 重要な注意事項

⚠️ **プライバシーとセキュリティ**
- ユーザーデータは適切に管理し、プライバシー保護法（GDPR等）を遵守してください
- データエクスポートは必要最小限に留めてください
- エクスポートしたデータは適切に保管・削除してください

## データ取得方法

### 方法1: SupabaseダッシュボードのSQL Editor（推奨）

最も簡単で安全な方法です。

1. **Supabaseダッシュボードにログイン**
   - https://supabase.com/dashboard にアクセス
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」を選択

3. **管理者用スクリプトを実行**
   - `scripts/export_all_users_data_admin.sql` を開く
   - 必要なクエリをコピー＆ペースト
   - 「Run」ボタンをクリック

4. **結果をエクスポート**
   - 結果テーブルの右上にある「Download CSV」ボタンをクリック
   - または、JSON形式でコピー

**メリット:**
- RLS（Row Level Security）を自動的にバイパス
- 安全で簡単
- 結果を直接ダウンロード可能

### 方法2: サービスロールキーを使用（プログラムから）

より高度な方法で、自動化や定期実行が可能です。

#### ステップ1: サービスロールキーの取得

1. Supabaseダッシュボードにログイン
2. 「Settings」→「API」を開く
3. 「service_role」キーをコピー（⚠️ 絶対に公開しないでください）

#### ステップ2: サービスロールクライアントの作成

```typescript
import { createClient } from '@supabase/supabase-js';

// サービスロールキーを使用（RLSをバイパス）
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // サービスロールキー
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 全ユーザーのデータを取得
const { data, error } = await supabaseAdmin
  .from('practice_sessions')
  .select('*');
```

#### ステップ3: データエクスポートスクリプトの作成

```typescript
// scripts/export-all-users-data.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportAllUsersData() {
  // 全ユーザーの練習記録を取得
  const { data: practiceSessions, error } = await supabaseAdmin
    .from('practice_sessions')
    .select('*')
    .order('practice_date', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // CSV形式で保存
  const csv = convertToCSV(practiceSessions);
  fs.writeFileSync('all_practice_sessions.csv', csv);
  
  console.log(`Exported ${practiceSessions.length} records`);
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => 
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
}

exportAllUsersData();
```

### 方法3: Supabase Admin APIを使用

REST API経由でデータを取得する方法です。

```bash
# 全ユーザーの練習記録を取得
curl -X GET \
  'https://YOUR_PROJECT.supabase.co/rest/v1/practice_sessions?select=*' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 取得可能なデータ

### 主要テーブル

1. **user_profiles** - ユーザープロフィール情報
2. **practice_sessions** - 練習記録
3. **goals** - 目標
4. **events** - イベント
5. **recordings** - 録音データ
6. **my_songs** - マイソング
7. **user_settings** - ユーザー設定
8. **tutorial_progress** - チュートリアル進捗
9. **auth.users** - 認証ユーザー情報（メールアドレス含む）

### 統計分析用の集計クエリ

`scripts/export_all_users_data_admin.sql` には、以下の統計クエリが含まれています：

- 全ユーザーの練習統計
- 楽器別の練習時間
- 入力方法別の統計
- 目標達成率
- 録音データの統計
- トップユーザーランキング

## データ分析の例

### 1. ユーザー別の練習時間集計

```sql
SELECT 
  up.user_id,
  up.display_name,
  COUNT(DISTINCT ps.practice_date) AS days_practiced,
  COUNT(ps.id) AS total_sessions,
  SUM(ps.duration_minutes) AS total_minutes,
  ROUND(SUM(ps.duration_minutes) / 60.0, 2) AS total_hours,
  ROUND(AVG(ps.duration_minutes), 2) AS avg_minutes_per_session
FROM user_profiles up
LEFT JOIN practice_sessions ps ON up.user_id = ps.user_id
GROUP BY up.user_id, up.display_name
ORDER BY total_minutes DESC;
```

### 2. 月別のアクティブユーザー数

```sql
SELECT 
  DATE_TRUNC('month', practice_date) AS month,
  COUNT(DISTINCT user_id) AS active_users,
  COUNT(*) AS total_sessions,
  SUM(duration_minutes) AS total_minutes
FROM practice_sessions
GROUP BY month
ORDER BY month DESC;
```

### 3. 目標達成率の分析

```sql
SELECT 
  goal_type,
  COUNT(*) AS total_goals,
  COUNT(*) FILTER (WHERE is_completed = true) AS completed_goals,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_completed = true) / COUNT(*), 2) AS completion_rate,
  ROUND(AVG(progress_percentage), 2) AS avg_progress
FROM goals
GROUP BY goal_type;
```

## セキュリティベストプラクティス

1. **サービスロールキーの管理**
   - 環境変数に保存（`.env`ファイルに追加し、`.gitignore`に含める）
   - 絶対にGitHub等にコミットしない
   - 定期的にローテーション

2. **アクセス制限**
   - データエクスポートスクリプトは管理者のみが実行可能にする
   - ログを記録し、誰がいつデータにアクセスしたかを追跡

3. **データの保管**
   - エクスポートしたデータは暗号化して保管
   - 不要になったデータは適切に削除
   - アクセスログを保持

## トラブルシューティング

### RLSエラーが発生する場合

SupabaseダッシュボードのSQL Editorを使用している場合、RLSは自動的にバイパスされます。プログラムからアクセスする場合は、サービスロールキーを使用してください。

### 大量データのエクスポート

データ量が多い場合、以下の方法で分割してエクスポートしてください：

```sql
-- 期間を指定してエクスポート
SELECT * FROM practice_sessions
WHERE practice_date >= '2024-01-01'
AND practice_date < '2024-02-01'
ORDER BY practice_date DESC;
```

### メモリ不足エラー

大量のデータを一度に取得する場合、ページネーションを使用してください：

```typescript
let allData = [];
let page = 0;
const pageSize = 1000;

while (true) {
  const { data, error } = await supabaseAdmin
    .from('practice_sessions')
    .select('*')
    .range(page * pageSize, (page + 1) * pageSize - 1);
  
  if (error || !data || data.length === 0) break;
  
  allData = [...allData, ...data];
  page++;
}
```

## 関連ファイル

- `scripts/export_all_users_data_admin.sql` - 管理者用エクスポートスクリプト
- `scripts/export_user_data.sql` - 一般ユーザー用エクスポートスクリプト
- `docs/USER_DATA_EXPORT_GUIDE.md` - 一般ユーザー向けガイド




