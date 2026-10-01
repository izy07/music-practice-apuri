# Music Practice App

**個人向け**の楽器練習記録アプリ（React Native / Expo + Supabase）。

## ドキュメント（製品説明は次の3ファイルのみ）

| ファイル | 用途 |
|----------|------|
| **README.md**（本ファイル） |  clone 後のセットアップ・環境変数・テスト・CI |
| **[docs/PRODUCT_OVERVIEW.md](docs/PRODUCT_OVERVIEW.md)** | ユーザー・ストア向けの短い概要 |
| **[APP_FEATURES_LIST.md](APP_FEATURES_LIST.md)** | 画面・機能・DB の **詳細仕様（正本）** |

機能を変えたら **APP_FEATURES_LIST → PRODUCT_OVERVIEW** の順で更新。  
競合分析・本番評価など他 MD は参考用（製品の正本ではない）。

## 🚀 読み込み速度向上のためのヒント

### 1. Supabaseの起動
```bash
# Docker Desktopを起動
# その後、Supabaseを起動
npx supabase start
```

### 2. 開発環境での最適化
- ブラウザの開発者ツールでネットワークタブを確認
- 不要なリクエストを特定
- キャッシュを有効化

### 3. パフォーマンス監視
- コンソールでエラー数を確認
- エラー制限機能で無限ループを防止
- タイムアウト設定で応答しない処理を制限

### 4. トラブルシューティング
- 読み込みが遅い場合：Supabaseの状態を確認
- エラーが大量発生：エラー制限アラートでリセット
- 認証が遅い：ネットワーク接続を確認

## 開発環境のセットアップ

1. 依存関係のインストール
```bash
npm install
```

2. Supabaseの起動
```bash
npx supabase start
```

3. アプリの起動
```bash
npm start
```

### Android SHA-1の取得（Play Console・クローズドテスト用）

Android ビルドの SHA-1 フィンガープリント取得（**Google ログインは未使用**。Play 署名確認等で必要な場合）：

#### 方法1: スクリプトを使用（推奨）

```bash
./scripts/get_sha1.sh
```

#### 方法2: 手動で取得

**デバッグキーストアから取得（開発用）:**

```bash
# デバッグキーストアが存在しない場合は作成
mkdir -p ~/.android
keytool -genkeypair -v \
  -keystore ~/.android/debug.keystore \
  -storepass android \
  -alias androiddebugkey \
  -keypass android \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"

# SHA-1を取得
keytool -keystore ~/.android/debug.keystore \
  -list -v \
  -alias androiddebugkey \
  -storepass android | grep -E "(SHA1:|SHA-1:)"
```

**EAS Buildを使用している場合（本番用）:**

1. **Google Play Consoleから取得（最も簡単）:**
   - Google Play Console → アプリ → リリース → 設定 → アプリの署名
   - 「アプリの署名証明書」セクションにSHA-1が表示されます

2. **EAS Buildのビルドログから取得:**
   ```bash
   eas build --platform android
   ```
   ビルドログにSHA-1が表示されます

**ローカルキーストアから取得:**

```bash
keytool -keystore /path/to/keystore.jks \
  -list -v \
  -alias your-key-alias
```

**注意**: Java JDKが必要です。macOSの場合：
```bash
brew install openjdk
```

### 必要な環境変数

`.env`（または `.env.local`）に以下を設定してください。

```
# EAS / Expo
EAS_PROJECT_ID=your-eas-project-id

# Supabase（URLが未設定ならローカルにフォールバック）
# iOS/Web(ローカル): http://127.0.0.1:54321
# Androidエミュ(ローカル): http://10.0.2.2:54321
# 実機(ローカル): http://<LAN_IP>:54321 → 例: http://192.168.1.10:54321
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 実機でローカルに繋ぐときの補助（省略可）
# 指定すると 127.0.0.1 の代わりに LAN IP を使います
EXPO_PUBLIC_SUPABASE_LAN_IP=192.168.1.10
EXPO_PUBLIC_SUPABASE_PORT=54321
```

Expo は `EXPO_PUBLIC_` で始まる変数のみクライアントへ注入します。変更後は `npx expo start -c` でキャッシュクリア起動。

**認証:** メール/パスワードのみ（Google ログインは提供しません）。Supabase Dashboard の Google プロバイダは無効のままにしてください。

## 環境変数（Whisper 音声認識）

クイック記録の音声入力を使うには、以下のどちらかを設定してください（Expo は `EXPO_PUBLIC_` で始まる変数のみクライアントへ注入します）。ローカルでは `.env.local` に保存して `expo start` してください。

1) OpenAI API を直接利用（推奨）

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-***
```

2) 自前のプロキシを利用

```
EXPO_PUBLIC_WHISPER_API_URL=https://your-proxy.example.com/transcriptions
EXPO_PUBLIC_WHISPER_API_KEY=xxxxx
```

## テスト

### テストの実行

```bash
# 全テストを実行
npm test

# ウォッチモードで実行（開発時）
npm run test:watch

# カバレッジレポート付きで実行
npm run test:coverage

# クリティカルなテストのみ実行
npm run test:critical
```

### テストカバレッジ

**現在のカバレッジ: 30%達成！✅**

```
全体:           29.23% (ステートメント)
                31.41% (行)
                35.59% (関数)

重要ファイル:
- dateUtils.ts:       100% ✅
- offlineStorage.ts:   34% ✅
- database.ts:         29% ✅
- authSecurity.ts:     28% ✅
```

カバレッジレポートを生成:
```bash
npm run test:coverage
```

カバレッジレポートは `coverage/` ディレクトリに生成されます（HTMLレポートも含む）。

### テスト環境のセットアップ

開発環境用のテストデータを使用する場合:

```bash
# Supabaseを起動
npm run supabase:start

# テストユーザーを追加（開発環境のみ）
npm run supabase:seed-dev
```

**⚠️ 注意**: `seed_users_dev.sql` は開発環境専用です。本番環境では使用しないでください。

---

## 🏗️ アーキテクチャ

### プロジェクト構造

```
music-practice/
├── app/                    # 画面コンポーネント
│   ├── (tabs)/            # タブナビゲーション
│   └── auth/              # 認証画面
├── components/             # 再利用可能なコンポーネント
├── hooks/                  # カスタムフック
├── lib/                    # ユーティリティ・サービス
├── types/                  # 型定義 ✨ 新規
│   ├── models.ts          # データモデル
│   └── index.ts           # エクスポート
├── supabase/              # データベース
│   └── migrations/        # マイグレーションファイル
├── __tests__/             # テストファイル ✨ 新規
└── .github/workflows/     # CI/CD ✨ 新規
```

### 技術スタック

- **フレームワーク:** React Native (Expo)
- **言語:** TypeScript
- **データベース:** Supabase (PostgreSQL)
- **状態管理:** React Context + Hooks
- **テスト:** Jest + React Native Testing Library
- **CI/CD:** GitHub Actions

---

## 🚀 CI/CD パイプライン

### 自動テスト

全てのPRとマージで自動的に実行されます：

✅ **テスト実行** - 150個のテストケース  
✅ **型チェック** - TypeScript  
✅ **ビルド確認** - Web/iOS/Android  
✅ **セキュリティ監査** - 脆弱性チェック

詳細: [.github/workflows/README.md](.github/workflows/README.md)

### デプロイフロー

```bash
# 機能開発
git checkout -b feature/new-feature
# ... 開発 ...
git push origin feature/new-feature
# → PR作成 → CI実行 → レビュー → マージ

# リリース
git tag v1.0.0
git push origin v1.0.0
# → ビルド → デプロイ → リリースノート作成
```

---

## 📖 その他（開発・運用）

製品の機能説明は上記 **3 ファイル** のみ。以下は開発補助です。

- [テストガイド](__tests__/README.md)
- [フックガイド](hooks/README.md)
- [CI/CD](.github/workflows/README.md)
- [シードデータ](supabase/SEED_DATA_README.md)
- [ユーザーデータエクスポート](docs/USER_DATA_EXPORT_GUIDE.md)

### API参照

型定義は `types/models.ts` を参照してください：

```typescript
import { Goal, PracticeSession, Recording } from '@/types/models';
```

---

## 🎯 コード品質

### テストカバレッジ

**現在: 30%達成 ✅**

```
重要ファイル:
- lib/dateUtils.ts:      100% ✅
- lib/offlineStorage.ts:  34% ✅
- lib/database.ts:        29% ✅
- lib/authSecurity.ts:    28% ✅
```

### コード品質指標

```
総ファイル数:       100+
テストファイル:      13個
テストケース:       150個（139個成功）
型定義ファイル:      2個（統合済み）
CI/CDワークフロー:   2個
```

---

## 🔧 開発ワークフロー

### 1. 機能開発

```bash
# ブランチ作成
git checkout -b feature/new-feature

# 開発
npm start

# テスト（自動再実行）
npm run test:watch

# コミット前チェック
npm test
npx tsc --noEmit

# コミット
git commit -m "Add new feature"
git push
```

### 2. コードレビュー

Pull Request作成時に自動的にCI実行：
- ✅ テスト
- ✅ 型チェック
- ✅ ビルド
- ✅ セキュリティ

### 3. リリース

```bash
# バージョンアップ
npm version patch  # 1.0.0 → 1.0.1
# または
npm version minor  # 1.0.0 → 1.1.0

# タグをプッシュ
git push --tags

# → 自動的にビルド & リリース
```