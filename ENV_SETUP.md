# 環境変数セットアップガイド

## 🔧 初期セットアップ

### 1. 環境変数ファイルの作成

開発環境用の `.env.local` を作成します：

```bash
# プロジェクトルートで実行
touch .env.local
```

### 2. 必要な環境変数

#### 🟢 開発環境（ローカル）

```.env
# Expo
EAS_PROJECT_ID=your-eas-project-id

# Supabase (ローカル)
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<npx supabase status で確認>

# 環境
NODE_ENV=development
```

#### 🔴 本番環境

```.env
# Expo
EAS_PROJECT_ID=your-production-eas-id

# Supabase (本番)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<Supabaseダッシュボードで取得>

# OpenAI（オプション）
EXPO_PUBLIC_OPENAI_API_KEY=sk-...

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# 環境
NODE_ENV=production
```

---

## 📝 環境変数の一覧

### Supabase関連

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | Supabase URL | `http://127.0.0.1:54321` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 匿名キー | `eyJ...` |
| `EXPO_PUBLIC_SUPABASE_LAN_IP` | ❌ | LAN IP（実機のみ） | `192.168.1.10` |
| `EXPO_PUBLIC_SUPABASE_PORT` | ❌ | ポート | `54321` |

### OpenAI関連

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `EXPO_PUBLIC_OPENAI_API_KEY` | ❌ | API キー | `sk-...` |

### Whisper関連（代替）

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `EXPO_PUBLIC_WHISPER_API_URL` | ❌ | Whisper API URL | `https://api.example.com` |
| `EXPO_PUBLIC_WHISPER_API_KEY` | ❌ | Whisper API Key | `xxx` |

### Google OAuth関連

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `GOOGLE_CLIENT_ID` | ❌ | クライアントID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ❌ | クライアントシークレット | `xxx` |

---

## 🚀 環境別のセットアップ

### ローカル開発環境

```bash
# 1. Supabaseを起動
npm run supabase:start

# 2. Supabaseのステータスを確認
npm run supabase:status

# 3. Anon Key をコピー
# 出力から "anon key" の値をコピー

# 4. .env.local に設定
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<コピーしたキー>

# 5. アプリを起動（キャッシュクリア）
npx expo start -c
```

### 実機テスト（iOS/Android）

```bash
# 1. Mac/PCのLAN IPを取得
# Mac:
ifconfig | grep "inet " | grep -v 127.0.0.1
# → 例: 192.168.1.10

# 2. .env.local に追加
EXPO_PUBLIC_SUPABASE_LAN_IP=192.168.1.10

# 3. アプリを再起動
npx expo start -c
```

### 本番環境（Vercel/Netlify）

Webダッシュボードで環境変数を設定：

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<本番のキー>
EXPO_PUBLIC_OPENAI_API_KEY=<本番のキー>
NODE_ENV=production
```

---

## ⚠️ セキュリティ注意事項

### DO ✅

- ✅ `.env.local` に機密情報を保存
- ✅ `.gitignore` に `.env.local` を追加済み
- ✅ 本番環境の認証情報は環境変数で管理
- ✅ チームメンバーと安全に共有（1Password等）

### DON'T ❌

- ❌ `.env` を Git にコミットしない
- ❌ ハードコードしない
- ❌ スクリーンショットに認証情報を含めない
- ❌ パブリックリポジトリに本番キーを載せない

---

## 🧪 環境変数のテスト

設定が正しいか確認：

```bash
# 開発環境
npm start

# コンソールで確認
# "🔧 環境変数設定:" というログが出力されます
# Supabase URL と Key（一部）が表示されます
```

---

## 🔄 環境変数の変更

環境変数を変更した場合：

```bash
# 1. .env.local を編集

# 2. キャッシュをクリアして再起動
npx expo start -c

# または
# アプリを完全に停止して再起動
```

---

## 📚 参考資料

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Supabase Setup](https://supabase.com/docs/guides/getting-started)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Google OAuth Setup](https://console.cloud.google.com/)

---

## 🆘 トラブルシューティング

### Supabaseに接続できない

```bash
# Supabaseの状態を確認
npm run supabase:status

# 停止している場合
npm run supabase:start

# URLとKeyが正しいか確認
npm run supabase:status | grep -E "API URL|anon key"
```

### OpenAI APIが動作しない

```bash
# API Keyが設定されているか確認
echo $EXPO_PUBLIC_OPENAI_API_KEY

# 未設定の場合は .env.local に追加
```

### 実機で接続できない

```bash
# 1. PCとスマホが同じWi-Fiか確認
# 2. LAN IPが正しいか確認
# 3. ファイアウォールを確認
# 4. Supabaseが起動しているか確認
```

