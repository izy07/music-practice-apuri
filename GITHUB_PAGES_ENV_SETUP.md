# GitHub Pages 環境変数セットアップガイド

## 概要

このドキュメントは、GitHub PagesでデプロイされるWebアプリケーション用の環境変数設定手順を説明します。

## GitHub Secrets設定

### 設定手順

1. GitHubリポジトリにアクセス
2. **Settings** → **Secrets and variables** → **Actions** を開く
3. **New repository secret** をクリック
4. 以下のSecretsを追加：

### 必要なSecrets

| Secret名 | 説明 | 必須 | 例 |
|---------|------|------|-----|
| `EXPO_PUBLIC_SUPABASE_URL` | 本番SupabaseプロジェクトのURL | ✅ | `https://your-project.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 本番Supabaseプロジェクトの匿名キー | ✅ | `eyJhbGci...` |

### Supabase情報の取得方法

1. **Supabase Dashboard**にアクセス: https://supabase.com/dashboard
2. プロジェクトを選択
3. **Settings** → **API** を開く
4. **Project URL** をコピー → `EXPO_PUBLIC_SUPABASE_URL`に設定
5. **anon public** キーをコピー → `EXPO_PUBLIC_SUPABASE_ANON_KEY`に設定

## デフォルト値

Secretsが設定されていない場合、以下のデフォルト値が使用されます：

- `EXPO_PUBLIC_SUPABASE_URL`: `https://uteeqkpsezbabdmritkn.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: （空文字列）

**⚠️ 警告**: デフォルト値に依存せず、必ずGitHub Secretsを設定してください。

## 環境変数の動作確認

### ビルド時の確認

GitHub Actionsのログで以下を確認：

```yaml
env:
  EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL || 'https://uteeqkpsezbabdmritkn.supabase.co' }}
  EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY || '' }}
```

### デプロイ後の確認

1. GitHub PagesのURLにアクセス
2. ブラウザの開発者ツール（F12）を開く
3. Consoleタブで環境変数が正しく設定されているか確認

## セキュリティ注意事項

### ✅ 推奨

- GitHub Secretsを使用して機密情報を管理
- SupabaseのAnon Keyは公開されても問題ないが、Secretsとして管理
- 定期的にSecretsをローテーション

### ❌ 非推奨

- 環境変数をコードに直接記述しない
- 公開リポジトリに機密情報をコミットしない
- Secretsをスクリーンショットに含めない

## トラブルシューティング

### 環境変数が設定されていない

**症状**: アプリがSupabaseに接続できない

**解決方法**:
1. GitHub Secretsが正しく設定されているか確認
2. ワークフローファイル（`.github/workflows/deploy-pages.yml`）で環境変数が参照されているか確認
3. デプロイを再実行

### デフォルト値が使用されている

**症状**: 開発環境のSupabaseに接続されている

**解決方法**:
1. GitHub Secretsが設定されているか確認
2. Secret名が正しいか確認（大文字・小文字を区別）
3. デプロイを再実行

## 参考リンク

- [GitHub Secrets公式ドキュメント](https://docs.github.com/actions/security-guides/encrypted-secrets)
- [Supabase環境変数設定](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [GitHub Pagesテストガイド](./GITHUB_PAGES_TEST_GUIDE.md)

