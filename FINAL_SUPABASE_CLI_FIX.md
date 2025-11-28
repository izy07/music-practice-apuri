# Supabase CLIインストール修正 - 最終版

## 問題

GitHub Actionsで以下のエラーが発生していました：

```
npm error Installing Supabase CLI as a global module is not supported.
```

## 原因

`npm install -g supabase`は非推奨となり、グローバルインストールがサポートされていません。

## 修正したファイル

### ワークフローファイル
1. ✅ `.github/workflows/ci.yml`
2. ✅ `.github/workflows/test-with-db.yml`
3. ✅ `.github/workflows/database-migration.yml`

### スクリプトファイル
4. ✅ `scripts/setup-github-db.sh` - **重要：これが原因でした**

## 修正内容

### `scripts/setup-github-db.sh`の修正

**修正前:**
```bash
if ! command -v supabase &> /dev/null; then
  echo "📦 Supabase CLIをインストール中..."
  npm install -g supabase
fi
```

**修正後:**
```bash
if ! command -v supabase &> /dev/null; then
  echo "📦 Supabase CLIをインストール中..."
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
  sudo mv supabase /usr/local/bin/
  supabase --version || {
    echo "❌ Supabase CLIのインストールに失敗しました"
    exit 1
  }
  echo "✅ Supabase CLIのインストールが完了しました"
fi
```

## 次のステップ

**重要：変更をコミット・プッシュしてください**

```bash
cd "/Users/izuru/music-practice/music puracice2/music-practice"
git add .github/workflows/ scripts/setup-github-db.sh
git commit -m "Fix: Supabase CLIのインストール方法をバイナリダウンロードに変更（全ファイル対応）"
git push origin main
```

## 確認事項

- ✅ すべてのワークフローファイルを修正
- ✅ `scripts/setup-github-db.sh`を修正
- ✅ すべての`npx supabase`を`supabase`に変更
- ✅ エラーハンドリングを追加

これで、すべての`npm install -g supabase`が削除されました。

