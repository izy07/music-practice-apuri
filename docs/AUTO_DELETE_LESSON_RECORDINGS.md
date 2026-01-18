# レッスン録音の自動削除機能

## 概要

レッスン録音（`recording_type = 'lesson'`）は、容量対策のため30日後に自動削除されます。お気に入りに追加された録音は削除対象外です。

## 機能詳細

### 1. 自動削除の設定

- **対象**: `recording_type = 'lesson'` かつ `is_favorite = false`
- **削除タイミング**: 録音保存から30日後（`auto_delete_at`カラムに設定）
- **除外条件**: `is_favorite = true` の録音は削除されません

### 2. データベーススキーマ

`recordings`テーブルに`auto_delete_at`カラムを追加：

```sql
ALTER TABLE public.recordings 
ADD COLUMN auto_delete_at timestamptz NULL;
```

### 3. 自動削除の実行方法

#### オプションA: Supabase Edge Function（推奨）

1. Edge Functionをデプロイ:
   ```bash
   supabase functions deploy delete-old-lesson-recordings
   ```

2. 外部のcronサービス（GitHub Actions、Vercel Cron、など）から定期実行:
   ```bash
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/delete-old-lesson-recordings \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
   ```

#### オプションB: pg_cron（Supabaseで有効な場合）

```sql
-- 毎日午前3時（UTC）に実行
SELECT cron.schedule(
  'delete-old-lesson-recordings',
  '0 3 * * *',
  $$SELECT delete_old_lesson_recordings();$$
);
```

### 4. ユーザー通知

録音保存時にレッスン録音を選択した場合、以下のメッセージを表示：

```
レッスン録音を保存しました
この録音は30日後に自動削除されます。重要な録音はお気に入りに追加してください。
```

### 5. UI表示

録音ライブラリ画面で、レッスン録音（お気に入り以外）に削除予定日を表示：

```
削除予定: 2025年2月15日
```

## 実装ファイル

- **マイグレーション**: `supabase/migrations/20260130000001_add_auto_delete_at_to_recordings.sql`
- **データベース関数**: `lib/database.ts` の `saveRecording` 関数
- **UI通知**: `components/AudioRecorder.tsx`, `components/PracticeRecordModal.tsx`
- **削除予定日表示**: `app/(tabs)/recordings-library.tsx`
- **自動削除関数**: 
  - Edge Function: `supabase/functions/delete-old-lesson-recordings/index.ts`
  - SQL関数: `supabase/functions/delete-old-lesson-recordings.sql`

## 注意事項

- お気に入りに追加されたレッスン録音は削除されません
- パフォーマンス録音（`recording_type = 'performance'`）は削除対象外です
- Storageファイルとデータベースレコードの両方を削除する必要があります（Edge Function版が推奨）
