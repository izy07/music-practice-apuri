# 環境変数設定ガイド

このファイルは、アプリケーションで使用する環境変数の設定方法を説明します。

## 必須環境変数

以下の環境変数は、アプリケーションを動作させるために**必須**です。

### Supabase設定

```bash
# 本番環境のSupabase URL（必須）
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# 本番環境のSupabase匿名キー（必須）
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**注意**: これらの値は`.env`ファイルに設定してください。`.env`ファイルは`.gitignore`に含まれているため、コミットされません。

## オプション環境変数

### ローカルSupabase設定（開発環境用）

ローカルSupabaseを使用する場合のみ設定してください。

```bash
# ローカルSupabaseを使用するかどうか（ネイティブ）
EXPO_PUBLIC_USE_LOCAL_SUPABASE=false

# ローカルSupabaseを使用するかどうか（Web）
EXPO_PUBLIC_USE_LOCAL_SUPABASE_WEB=false

# ローカルSupabaseのLAN IP（実機でローカルに接続する場合）
EXPO_PUBLIC_SUPABASE_LAN_IP=192.168.1.10

# ローカルSupabaseのポート番号
EXPO_PUBLIC_SUPABASE_PORT=54321

# ローカルSupabase用の匿名キー（通常はデフォルト値を使用）
EXPO_PUBLIC_SUPABASE_LOCAL_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Google OAuth認証（本番環境用）

本番環境でGoogle認証を使用する場合のみ設定してください。

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Whisper音声認識（オプション）

クイック記録の音声入力を使用する場合に設定してください。

**オプション1: OpenAI APIを直接利用**
```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-***
```

**オプション2: 自前のプロキシを利用**
```bash
EXPO_PUBLIC_WHISPER_API_URL=https://your-proxy.example.com/transcriptions
EXPO_PUBLIC_WHISPER_API_KEY=xxxxx
```

### Web環境設定

```bash
# Web環境用のリダイレクトURI
EXPO_PUBLIC_WEB_REDIRECT_URL=http://localhost:8081/auth/callback

# Web環境用のベースパス（GitHub Pagesなどの場合）
EXPO_PUBLIC_WEB_BASE=
```

### その他

```bash
# ログレベル（開発環境用）
# 設定可能な値: debug, info, warn, error
LOG_LEVEL=debug
```

## 環境変数の設定方法

### 1. `.env`ファイルの作成

プロジェクトルートに`.env`ファイルを作成し、必要な環境変数を設定してください。

```bash
# プロジェクトルートで実行
touch .env
```

### 2. 環境変数の記述

`.env`ファイルに以下のように記述します：

```bash
# 必須設定
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# オプション設定（必要に応じて）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. アプリケーションの再起動

環境変数を変更した場合は、アプリケーションを再起動してください。

```bash
# Expo開発サーバーを再起動（キャッシュをクリア）
npx expo start -c
```

## 環境変数の取得方法

### Supabase URLとキー

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. Settings → API に移動
4. `Project URL`を`EXPO_PUBLIC_SUPABASE_URL`に設定
5. `anon/public`キーを`EXPO_PUBLIC_SUPABASE_ANON_KEY`に設定

### Google OAuth認証情報

詳細は`README.md`の「Google OAuth の設定方法」セクションを参照してください。

## セキュリティに関する注意事項

⚠️ **重要**:
- `.env`ファイルは**絶対に**コミットしないでください
- `.gitignore`に`.env`が含まれていることを確認してください
- 機密情報は環境変数として管理し、コードにハードコードしないでください
- 本番環境では、環境変数が適切に設定されていることを確認してください

## トラブルシューティング

### 環境変数が読み込まれない

- Expo は `EXPO_PUBLIC_` で始まる変数のみクライアントに注入されます
- 環境変数を変更した場合は、`npx expo start -c`でキャッシュをクリアして再起動してください
- `.env`ファイルがプロジェクトルートにあることを確認してください

### 本番環境でのエラー

本番環境でSupabase認証情報が未設定の場合、アプリケーションは起動時にエラーを投げます。
環境変数が適切に設定されていることを確認してください。

## 参考資料

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Supabase Documentation](https://supabase.com/docs)
- `README.md` - アプリケーションのセットアップ手順
