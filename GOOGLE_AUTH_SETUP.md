# Google OAuth 認証の設定方法

このドキュメントでは、Music Practice アプリでGoogle認証を有効にする方法を説明します。

## 📋 概要

- **開発環境**: モック認証が自動的に使用されます（設定不要）
- **本番環境**: 実際のGoogle OAuthが使用されます（以下の設定が必要）

## 🔧 開発環境での動作

開発環境（`localhost`または`127.0.0.1`）では、Google OAuthの設定がなくても自動的にモック認証が使用されます。

**モック認証の詳細:**
- ユーザーID: `google_user_[タイムスタンプ]`
- メールアドレス: `google.user@gmail.com`
- 名前: `Google User`
- 認証完了後、通常通りチュートリアル→楽器選択→メイン画面に遷移

## 🌐 本番環境での設定手順

### 1. Google Cloud Console でプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. プロジェクト名: `Music Practice` など

### 2. OAuth 同意画面の設定

1. 左メニューから「APIとサービス」→「OAuth同意画面」を選択
2. ユーザータイプ: **外部** を選択
3. 必須項目を入力:
   - アプリ名: `Music Practice`
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先情報: あなたのメールアドレス
4. スコープは設定不要（デフォルトで`email`と`profile`が含まれる）
5. テストユーザーを追加（開発中のみ）

### 3. 認証情報（OAuth クライアント ID）の作成

1. 左メニューから「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuth クライアント ID」をクリック
3. アプリケーションの種類: **ウェブアプリケーション** を選択
4. 名前: `Music Practice Web Client`
5. **承認済みのリダイレクト URI** を追加:
   ```
   http://localhost:8081/auth/callback
   http://127.0.0.1:8081/auth/callback
   https://<your-project-ref>.supabase.co/auth/v1/callback
   https://your-production-domain.com/auth/callback
   ```
6. 「作成」をクリック
7. **クライアント ID** と **クライアント シークレット** をコピー

### 4. ローカル環境変数の設定（オプション）

ローカル開発環境で実際のGoogle OAuthをテストしたい場合:

1. プロジェクトルートに `.env.local` ファイルを作成:
   ```bash
   GOOGLE_CLIENT_ID=あなたのクライアントID.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=あなたのクライアントシークレット
   ```

2. Supabaseを再起動:
   ```bash
   npx supabase stop
   npx supabase start
   ```

3. アプリを再起動:
   ```bash
   npx expo start -c
   ```

**注意**: `.env.local`は`.gitignore`に含まれているため、Gitにコミットされません。

### 5. Supabase ダッシュボードでの設定（本番環境）

1. [Supabase ダッシュボード](https://app.supabase.com/) にログイン
2. プロジェクトを選択
3. 左メニューから「Authentication」→「Providers」を選択
4. 「Google」を選択
5. 以下を入力:
   - **Enabled**: ON
   - **Client ID**: Google Cloud Consoleで取得したクライアントID
   - **Client Secret**: Google Cloud Consoleで取得したクライアントシークレット
6. 「Save」をクリック

### 6. リダイレクト URL の追加

Supabaseダッシュボードで:
1. 「Authentication」→「URL Configuration」
2. 「Redirect URLs」に以下を追加:
   ```
   http://localhost:8081/auth/callback
   https://your-production-domain.com/auth/callback
   ```

### 7. アプリのデプロイ設定

本番環境にデプロイする際:

1. **環境変数の設定** (Vercel/Netlify/等):
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Google Cloud Consoleでリダイレクト URIを更新**:
   - 本番環境のドメインを追加
   - 例: `https://your-app.com/auth/callback`

## 🧪 テスト方法

### 開発環境でのテスト

1. アプリを起動: `npm start`
2. ログイン画面で「Googleでログイン (開発版)」をクリック
3. モック認証が自動的に実行される
4. チュートリアル画面に遷移することを確認

### 本番環境でのテスト

1. 本番環境にデプロイ
2. ログイン画面で「Googleでログイン」をクリック
3. Googleのログイン画面にリダイレクトされる
4. Googleアカウントでログイン
5. アプリに戻ってチュートリアル画面に遷移することを確認

## 🔍 トラブルシューティング

### エラー: "redirect_uri_mismatch"

**原因**: Google Cloud Consoleに登録されたリダイレクトURIと実際のURIが一致しない

**解決策**:
1. エラーメッセージに表示されているURIをコピー
2. Google Cloud Console → 認証情報 → OAuth クライアント ID
3. 承認済みのリダイレクトURIに追加

### エラー: "invalid_request"

**原因**: Google Cloud Consoleの設定が不完全

**解決策**:
1. OAuth同意画面が正しく設定されているか確認
2. OAuth クライアント IDが作成されているか確認
3. リダイレクトURIが正しく設定されているか確認

### エラー: "access_denied"

**原因**: ユーザーがGoogleログインを拒否した、またはテストユーザーに追加されていない

**解決策**:
1. OAuth同意画面が「公開」状態でない場合、テストユーザーに追加
2. ユーザーがログインを許可することを確認

### モック認証が動作しない

**原因**: 環境判定が正しく動作していない

**解決策**:
1. ブラウザのコンソールで以下を確認:
   ```javascript
   console.log(window.location.hostname);
   console.log(process.env.NODE_ENV);
   ```
2. `localhost`または`127.0.0.1`であることを確認

## 📚 参考リンク

- [Google OAuth 2.0 設定](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google OAuth ガイド](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console](https://console.cloud.google.com/)

## 🎯 チェックリスト

**開発環境:**
- [x] Supabase config.tomlにGoogle設定を追加
- [x] モック認証が動作することを確認
- [x] ログイン→チュートリアル→楽器選択→メイン画面の遷移を確認

**本番環境:**
- [ ] Google Cloud Consoleでプロジェクトを作成
- [ ] OAuth同意画面を設定
- [ ] OAuth クライアント IDを作成
- [ ] リダイレクトURIを設定
- [ ] Supabaseダッシュボードでプロバイダーを有効化
- [ ] 環境変数を設定
- [ ] 実際のGoogleアカウントでログインをテスト

## 💡 ヒント

- ローカル開発では、実際のGoogle OAuthを設定しなくてもモック認証で十分です
- 本番環境でのみGoogle OAuthを設定すれば、開発効率が向上します
- モック認証と実際の認証は、コードの変更なしで自動的に切り替わります

