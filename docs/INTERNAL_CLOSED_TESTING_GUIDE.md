# 内部テスト・クローズドテストガイド

## 概要

このドキュメントでは、Google Play（Android）と App Store（iOS）における内部テスト・クローズドテストの設定手順と、テスターをプレミアム（課金）状態にする方法を説明します。

---

## 1. 環境の準備状況

### EAS Build の設定（完了済み）

`eas.json` に以下のプロファイルが設定されています：

- **development**: 開発用クライアント（`distribution: internal`）
- **preview**: 内部配布用（`distribution: internal`、APK/AAB）
- **production**: 本番用

### 必要な環境

- [ ] Expo アカウント（[expo.dev](https://expo.dev)）
- [ ] EAS CLI インストール済み（`npm install -g eas-cli`）
- [ ] Google Play Console アカウント（Android の場合）
- [ ] Apple Developer アカウント（iOS の場合）

---

## 2. 内部テスト（Internal Testing）

### Android（Google Play）

1. **ビルド作成**
   ```bash
   cd music-practice
   eas build --profile preview --platform android
   ```
   ※ `preview` プロファイルは `distribution: internal` のため、内部テスト用に適しています。

2. **Google Play Console で設定**
   - [Google Play Console](https://play.google.com/console) にログイン
   - アプリを選択 → 左メニュー「テスト」→「内部テスト」
   - 「新しいリリースを作成」でビルドをアップロード（EAS Submit または手動アップロード）
   - **テスターの追加**:
     - 「テスター」タブ → 「メールアドレスリストを作成」
     - テスターのメールアドレスを1行1件で入力し、リストを作成
     - 作成したリストを内部テストに割り当て

3. **CSV でテスターを追加する場合**
   - 「ここに .CSV ファイルをドロップします」と表示される場合：
   - CSV の形式：1列目にメールアドレス、ヘッダー行は `Email` や `email` など
   - 例（testers.csv）:
     ```csv
     Email
     tester1@example.com
     tester2@example.com
     ```
   - 「0件のメールアドレスが置き換えられます」と出る場合：
     - CSV のエンコーディングを **UTF-8** にしてください
     - 列名が正しいか確認（`Email` や `email`）
     - ドラッグ＆ドロップではなく「ファイルを選択」からアップロードを試す

4. **招待リンク**
   - テスターに送る招待リンクが発行されます
   - テスターは Google アカウントでそのリンクにアクセスし、テストに参加

### iOS（TestFlight）

1. **ビルド作成**
   ```bash
   eas build --profile preview --platform ios
   ```

2. **App Store Connect で設定**
   - [App Store Connect](https://appstoreconnect.apple.com) にログイン
   - アプリ → TestFlight タブ
   - ビルドをアップロード後、内部テストグループに追加
   - **内部テスター**: App Store Connect ユーザー（最大100人）を追加

---

## 3. クローズドテスト（Closed Testing）

### Android

- 内部テストと同様に、左メニュー「テスト」→「クローズドテスト」を選択
- テスターリストの作成・割り当て手順は内部テストと同じ
- 招待リンクは Google グループまたはメールリストで管理

### iOS

- TestFlight の「外部テスト」がクローズドに相当
- 最大10,000人まで。Apple の審査が必要（初回のみ数日〜1週間）

---

## 4. テスターをプレミアム（課金済み）状態にする

このアプリは **Supabase の `user_subscriptions` テーブル** で課金状態を管理しています。テスターをプレミアムにするには、Supabase で該当ユーザーのレコードを更新します。

### 手順

1. **テスターにアプリで会員登録してもらう**
   - テスターのメールアドレスでサインアップ
   - これにより `auth.users` にレコードが作成されます

2. **Supabase で SQL を実行**
   - Supabase ダッシュボード → SQL Editor
   - 以下の SQL を実行（`tester@example.com` を実際のメールに置き換え）:

```sql
-- テスターをプレミアム（月額）に設定
UPDATE public.user_subscriptions
SET 
  plan = 'premium_monthly',
  is_active = true,
  current_period_end = (NOW() + INTERVAL '1 month')::timestamptz,
  canceled_at = NULL,
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'tester@example.com'
);

-- レコードが存在しない場合は作成
INSERT INTO public.user_subscriptions (
  user_id, plan, is_active, current_period_end, canceled_at, created_at, updated_at
)
SELECT 
  id, 'premium_monthly', true,
  (NOW() + INTERVAL '1 month')::timestamptz,
  NULL, NOW(), NOW()
FROM auth.users
WHERE email = 'tester@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.users.id
  );
```

3. **複数テスターを一括で設定する場合**

```sql
-- 複数メールをプレミアムに
UPDATE public.user_subscriptions
SET 
  plan = 'premium_monthly',
  is_active = true,
  current_period_end = (NOW() + INTERVAL '1 month')::timestamptz,
  canceled_at = NULL,
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN (
    'tester1@example.com',
    'tester2@example.com'
  )
);
```

4. **参考スクリプト**
   - `scripts/set_premium_for_izurutest5.sql` をコピーし、メールアドレスを変更して実行できます

### 注意事項

- テスターは **一度アプリにログイン（サインアップ）していること** が前提です
- アプリはログイン時に `user_subscriptions` を参照してプレミアム判定します
- 変更後、テスターがアプリを再起動または画面をリロードすると反映されます

---

## 5. チェックリスト

### ビルド・配布

- [ ] `eas build --profile preview --platform android` でビルド成功
- [ ] Google Play Console にビルドをアップロード
- [ ] 内部テスト or クローズドテストでリリース作成
- [ ] テスターリストを作成し、メールアドレスを追加
- [ ] 招待リンクをテスターに共有

### テスターのプレミアム化

- [ ] テスターがアプリで会員登録済み
- [ ] Supabase で `user_subscriptions` を更新
- [ ] アプリでプレミアム機能が利用できることを確認

### CSV が読み込まれない場合

- [ ] CSV の文字コードを UTF-8 に変換
- [ ] 1列目にメールアドレス、ヘッダーは `Email` または `email`
- [ ] 別のブラウザや「ファイルを選択」でアップロードを試す
