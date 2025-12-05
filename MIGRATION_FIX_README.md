# マイグレーション実行ガイド

## 🚨 現在のエラー

以下のエラーが発生しています：

1. **eventsテーブルのdateカラムが存在しない** (400エラー)
2. **user_profilesテーブルへのPATCHリクエストが400エラー**

## ✅ 解決方法

### 方法1: 自動スクリプトを使用（推奨）

```bash
cd music-practice
bash scripts/execute_migration_now.sh
```

このスクリプトは：
- SQLをクリップボードにコピー
- Supabaseダッシュボードを開く（オプション）
- 実行手順を表示

### 方法2: 手動で実行

1. **Supabaseダッシュボードを開く**
   - https://supabase.com/dashboard/project/uteeqkpsezbabdmritkn/sql/new

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック

3. **SQLを実行**
   - `scripts/fix_events_and_user_profiles.sql` の内容をコピー＆ペースト
   - 「Run」ボタンをクリック

## 📋 実行するSQL

以下のファイルに含まれています：
- `scripts/fix_events_and_user_profiles.sql`
- `supabase/migrations/20251128000007_fix_events_and_user_profiles.sql`

## 🔧 このマイグレーションで解決される問題

1. **eventsテーブル**
   - `date`カラムを追加
   - 必要なインデックスを作成
   - RLSポリシーを再設定
   - 権限を付与

2. **user_profilesテーブル**
   - テーブル構造を確認・修正
   - RLSポリシーを再設定
   - 権限を付与
   - トリガーを設定

## ⚠️ 注意事項

- このマイグレーションは**冪等性**があります（何度実行しても安全）
- 既存のデータは保持されます
- 実行後、アプリケーションを再読み込みしてください

## 🐛 トラブルシューティング

### エラーが続く場合

1. **ブラウザのコンソールを確認**
   - エラーメッセージの詳細を確認

2. **Supabaseダッシュボードで確認**
   - Table Editorでテーブルが存在するか確認
   - SQL Editorでエラーメッセージを確認

3. **ログを確認**
   - アプリケーションのログで詳細なエラー情報を確認

## 📝 コード側の改善

以下の改善を行いました：

1. **エラーハンドリングの改善**
   - `useCalendarData.ts`: eventsテーブルのdateカラムエラーを適切に処理
   - `userRepository.ts`: user_profilesの更新エラーを詳細にログ出力

2. **エラーメッセージの改善**
   - 400エラーを検出して適切に処理
   - 詳細なエラー情報をログ出力

## ✅ 実行後の確認

マイグレーション実行後、以下を確認してください：

1. **アプリケーションを再読み込み**
2. **コンソールでエラーが消えているか確認**
3. **イベント機能が動作するか確認**
4. **プロフィール更新が動作するか確認**


