# Supabase CLIインストール修正サマリー

## 問題

GitHub Actionsで以下のエラーが発生していました：

```
npm error Installing Supabase CLI as a global module is not supported.
npm error Please use one of the supported package managers: https://github.com/supabase/cli#install-the-cli
```

## 原因

`npm install -g supabase`は非推奨となり、グローバルインストールがサポートされていません。

## 解決方法

すべてのワークフローファイルで、Supabase CLIのインストール方法をバイナリ直接ダウンロード方式に変更しました。

## 修正したファイル

1. ✅ `.github/workflows/ci.yml`
2. ✅ `.github/workflows/test-with-db.yml`
3. ✅ `.github/workflows/database-migration.yml`

## 変更内容

### 修正前
```yaml
- name: Supabase CLI のインストール
  run: npm install -g supabase
```

### 修正後
```yaml
- name: Supabase CLI のインストール
  run: |
    echo "📦 Supabase CLIをインストールします..."
    curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
    sudo mv supabase /usr/local/bin/
    supabase --version || {
      echo "❌ Supabase CLIのインストールに失敗しました"
      exit 1
    }
    echo "✅ Supabase CLIのインストールが完了しました"
```

## 追加修正

バイナリをインストールした後は、`npx supabase`ではなく直接`supabase`コマンドを使用するように変更しました：

- `npx supabase stop` → `supabase stop`
- `npx supabase start` → `supabase start`
- `npx supabase status` → `supabase status`
- `npx supabase db reset` → `supabase db reset`
- `npx supabase db diff` → `supabase db diff`

## 次のステップ

1. **変更をコミット**
   ```bash
   git add .github/workflows/
   git commit -m "Fix: Supabase CLIのインストール方法をバイナリダウンロードに変更"
   ```

2. **GitHubにプッシュ**
   ```bash
   git push origin main
   ```

3. **CI/CDパイプラインの確認**
   - GitHub Actionsでワークフローが正常に実行されることを確認
   - Supabase CLIのインストールが成功することを確認

## 確認事項

- ✅ すべての`npm install -g supabase`を削除
- ✅ バイナリダウンロード方式に変更
- ✅ すべての`npx supabase`を`supabase`に変更
- ✅ エラーハンドリングを追加

