# デプロイガイド

## 実装した変更内容

1. **音楽用語辞典の再実装**
   - 記号ごとの分類表示
   - グローバル検索機能
   - ユーザーによる用語追加機能
   - 楽器区分に応じた用語の自動フィルタリング

2. **料金プラン画面の修正**
   - フリープランの制限を「各楽器ごとに」と明記

3. **共有機能の修正**
   - Facebook/Instagramの共有を削除し、Twitterのみに

4. **イベント機能の拡張**
   - イベントの色選択機能（赤：演奏会、緑：メンテナンスなど）
   - 色によるフィルタリング機能
   - 前回メンテナンス日の表示
   - カレンダー表示での色反映

## デプロイ手順

### 1. データベースマイグレーション（必須）

SupabaseダッシュボードのSQL Editorで以下のマイグレーションを実行してください：

```sql
-- ファイル: supabase/migrations/20250128000001_add_color_to_events.sql
-- eventsテーブルにcolorカラムを追加
```

または、Supabase CLIを使用：

```bash
cd music-practice
supabase db push
```

### 2. Webアプリのデプロイ

ビルドは完了しています（`dist/`フォルダ）。

**GitHub Pagesの場合:**
```bash
npm run build:web:github
# その後、distフォルダをGitHub Pagesにデプロイ
git add dist/
git commit -m "Deploy: イベント色機能、音楽用語辞典、料金プラン修正"
git push origin main
```

**その他のホスティング:**
- `dist/`フォルダの内容をホスティングサービスにアップロード

### 3. モバイルアプリのデプロイ（EAS Update）

EASプロジェクトを初期化する必要があります：

```bash
# EASプロジェクトの初期化（初回のみ）
eas init

# EAS Updateの実行（JavaScriptバンドルの更新）
eas update --branch production --message "イベント色機能、音楽用語辞典、料金プラン修正"
```

### 4. ネイティブビルド（必要に応じて）

ネイティブコードの変更がある場合のみ：

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

## 注意事項

- **データベースマイグレーションは本番環境で必ず実行してください**
- 既存のイベントにはデフォルトで`yellow`が設定されます
- EAS Updateは既存のアプリに自動的に配信されます（ユーザーはアプリを再起動する必要があります）

## 変更ファイル一覧

### 新規作成
- `lib/eventColors.ts` - イベント色定義
- `data/musicTermsData.ts` - 音楽用語データ
- `supabase/migrations/20250128000001_add_color_to_events.sql` - データベースマイグレーション

### 修正
- `components/EventModal.tsx` - 色選択機能追加
- `app/(tabs)/components/calendar/EventManagementSection.tsx` - 色フィルタリング機能追加
- `app/(tabs)/components/calendar/CalendarDayCell.tsx` - カレンダー表示での色反映
- `app/(tabs)/music-dictionary.tsx` - 音楽用語辞典の再実装
- `app/(tabs)/pricing-plans.tsx` - 料金プラン表示の修正
- `app/(tabs)/support.tsx` - 共有機能の修正
- `repositories/eventRepository.ts` - 色カラムのサポート追加
- `repositories/musicTermRepository.ts` - 用語追加・更新機能追加
- `lib/instrumentUtils.ts` - 楽器区分判定機能追加

