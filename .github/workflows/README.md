# CI/CD パイプライン

## 🚀 概要

このプロジェクトは GitHub Actions を使用して自動化されたCI/CDパイプラインを実装しています。

---

## 📋 ワークフロー一覧

### 1. CI パイプライン (`ci.yml`)

**トリガー:**
- `main` または `develop` ブランチへのpush
- `main` または `develop` ブランチへのPull Request

**ジョブ:**

#### 🧪 Test (テスト実行)
```bash
- npm ci                # 依存関係インストール
- npm run test:ci       # テスト実行（並列）
- カバレッジアップロード  # Codecovへアップロード
```

**要件:**
- ✅ 全テストが通ること
- ✅ カバレッジが閾値以上（15%）

#### 📝 Lint (コード品質チェック)
```bash
- npm ci
- npx tsc --noEmit      # TypeScript型チェック
```

**要件:**
- ✅ 型エラーが無いこと

#### 🏗️ Build (ビルド確認)
```bash
- npm ci
- npm run build:web     # Webビルド
- アーティファクトアップロード
```

**要件:**
- ✅ ビルドが成功すること
- ✅ バンドルサイズが800KB以下

#### 🔒 Security (セキュリティ監査)
```bash
- npm audit --production        # 脆弱性チェック
- テストデータ漏洩チェック       # seed_users検出
- ハードコード認証情報チェック   # パスワード検出
```

**要件:**
- ✅ 脆弱性が無いこと
- ✅ テストデータが本番に含まれないこと
- ✅ ハードコードされた認証情報が無いこと

---

### 2. Release パイプライン (`release.yml`)

**トリガー:**
- タグのpush (`v*` 形式、例: `v1.0.0`)

**ジョブ:**

#### 📦 Build & Deploy (Web)
```bash
- テスト実行（必須）
- 本番ビルド
- デプロイ（Vercel等）
```

#### 📱 Build Android
```bash
- EAS Build (Android)
- APK生成
```

#### 🍎 Build iOS  
```bash
- EAS Build (iOS)
- IPA生成
```

#### 📝 Create Release
```bash
- リリースノート自動生成
- GitHub Release 作成
```

---

## 🔧 セットアップ

### 必要なSecrets設定

GitHub リポジトリの Settings → Secrets and variables → Actions で設定:

```bash
# Expo関連
EXPO_TOKEN=<your-expo-token>

# Vercel（オプション）
VERCEL_TOKEN=<your-vercel-token>

# その他のシークレット
# GitHub ActionsのGITHUB_TOKENは自動設定される
```

### Expo Token の取得

```bash
# Expoにログイン
npx expo login

# トークンを生成
npx expo whoami
eas whoami
```

---

## 📊 ワークフロー実行状況の確認

### GitHub UI で確認

1. リポジトリページの "Actions" タブを開く
2. 実行中/完了したワークフローを確認
3. 失敗した場合はログを確認

### バッジをREADMEに追加

```markdown
![CI](https://github.com/your-username/music-practice/workflows/CI/CD%20Pipeline/badge.svg)
![Tests](https://img.shields.io/codecov/c/github/your-username/music-practice)
```

---

## 🐛 トラブルシューティング

### テストが失敗する

```bash
# ローカルで再現
npm run test:ci

# カバレッジ不足の場合
npm run test:coverage
```

### ビルドが失敗する

```bash
# ローカルでビルド確認
npm run build:web

# 型エラーの確認
npx tsc --noEmit
```

### セキュリティチェックが失敗する

```bash
# テストデータの確認
grep -r "test@example.com" supabase/migrations/

# 脆弱性の確認
npm audit

# 修正
npm audit fix
```

---

## 🔄 デプロイフロー

### 開発環境

```bash
# 機能開発
git checkout -b feature/new-feature
# コード変更
git commit -m "Add new feature"
git push origin feature/new-feature

# Pull Request作成
# → CI自動実行（テスト、Lint、Build、Security）
# → レビュー
# → マージ
```

### ステージング環境

```bash
# developブランチにマージ
git checkout develop
git merge feature/new-feature
git push origin develop

# → CI自動実行
# → 自動デプロイ（ステージング）
```

### 本番環境

```bash
# mainブランチにマージ
git checkout main
git merge develop
git push origin main

# リリースタグを作成
git tag v1.0.0
git push origin v1.0.0

# → Release ワークフロー実行
# → 本番ビルド
# → 本番デプロイ
# → GitHub Release 作成
```

---

## 📈 今後の改善

### Phase 2
- [ ] E2Eテストの追加（Detox / Playwright）
- [ ] パフォーマンステスト
- [ ] ビジュアルリグレッションテスト

### Phase 3
- [ ] 自動デプロイ（Vercel / Netlify）
- [ ] Slack通知
- [ ] 自動バージョニング

---

## 🔗 参考リンク

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Codecov Documentation](https://docs.codecov.com/)

