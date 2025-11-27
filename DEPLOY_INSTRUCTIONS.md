# デプロイ手順

## 🚀 本番データベースの修正（最優先）

### ステップ1: Supabase DashboardでSQLを実行

1. **Supabase Dashboardにアクセス**
   - https://supabase.com/dashboard にログイン
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック
   - 「New query」をクリック

3. **修正スクリプトを実行**
   - `scripts/fix-production-db-now.sql` の内容をコピー
   - SQL Editorに貼り付け
   - 「Run」ボタンをクリック

4. **結果を確認**
   - 実行結果で以下を確認：
     - `other_instrument_exists`: 1 であること
     - `invalid_profiles_count`: 0 であること
     - `total_instruments`: 20以上であること

### ステップ2: 動作確認

1. **アプリで楽器選択を試す**
   - 楽器選択画面を開く
   - 「その他」を選択
   - 保存が成功することを確認

2. **エラーの確認**
   - ブラウザの開発者ツール（F12）を開く
   - コンソールタブでエラーがないか確認
   - 409エラーや外部キー制約違反が発生しないことを確認

## 📦 GitHubへのデプロイ

### ステップ1: 変更をコミット

```bash
cd "/Users/izuru/music-practice/music puracice2/music-practice"

# すべての変更をステージング
git add .

# コミット
git commit -m "Fix: データベースエラー修正とGitHub Actions対応

- instrumentsテーブルの完全性確保
- 「その他」楽器ID (016) の追加
- 409 Conflictエラーのリトライロジック追加
- aria-hidden警告の修正
- GitHub Pages自動デプロイ設定
- GitHub Actionsデータベース対応"
```

### ステップ2: GitHubにプッシュ

```bash
git push origin main
```

### ステップ3: GitHub Actionsの確認

1. **GitHubリポジトリにアクセス**
   - https://github.com/izy07/[リポジトリ名]
   - 「Actions」タブをクリック

2. **ワークフローの実行を確認**
   - `CI/CD Pipeline` が実行される
   - `Database Migration Check` が実行される（マイグレーションファイル変更時）
   - `Deploy to GitHub Pages` が実行される（mainブランチへのpush時）

3. **エラーがないか確認**
   - すべてのジョブが緑色（成功）であることを確認
   - エラーがある場合はログを確認

## ✅ デプロイ後の確認

### 1. GitHub Pagesの確認
- https://izy07.github.io/[リポジトリ名]/ にアクセス
- アプリが正常に読み込まれることを確認
- 404エラーが発生しないことを確認

### 2. データベースの確認
- Supabase Dashboardで以下を確認：
  ```sql
  SELECT COUNT(*) FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440016';
  -- 結果: 1 であること
  
  SELECT COUNT(*) FROM user_profiles 
  WHERE selected_instrument_id IS NOT NULL 
    AND selected_instrument_id NOT IN (SELECT id FROM instruments);
  -- 結果: 0 であること
  ```

### 3. アプリの動作確認
- 楽器選択機能が正常に動作する
- エラーが発生しない
- パフォーマンスに問題がない

## 🔧 トラブルシューティング

### データベース修正が失敗する場合

1. **エラーメッセージを確認**
   - Supabase DashboardのSQL Editorでエラーメッセージを確認

2. **段階的に実行**
   - スクリプトを分割して実行
   - 各ステップの結果を確認

3. **手動で確認**
   ```sql
   -- instrumentsテーブルが存在するか確認
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_name = 'instruments'
   );
   
   -- 「その他」楽器が存在するか確認
   SELECT * FROM instruments WHERE id = '550e8400-e29b-41d4-a716-446655440016';
   ```

### GitHub Actionsが失敗する場合

1. **ログを確認**
   - Actionsタブで失敗したジョブをクリック
   - エラーメッセージを確認

2. **ローカルでテスト**
   ```bash
   npm run test:ci
   npm run build:web
   ```

3. **環境変数の確認**
   - GitHub Secretsに必要な環境変数が設定されているか確認

## 📝 チェックリスト

- [ ] 本番データベースの修正スクリプトを実行
- [ ] データベース修正の結果を確認
- [ ] アプリで楽器選択をテスト
- [ ] 変更をコミット
- [ ] GitHubにプッシュ
- [ ] GitHub Actionsの実行を確認
- [ ] GitHub Pagesのデプロイを確認
- [ ] アプリの動作確認

