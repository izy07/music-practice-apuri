#!/usr/bin/env node
/**
 * Web / 本番ビルド前に EXPO_PUBLIC_SUPABASE_* が注入されているか確認する。
 * Expo は EXPO_PUBLIC_* をビルド時にバンドルへ焼き込むため、
 * 未設定のまま export すると実行時にクラッシュする（ビルド自体は成功してしまう）。
 */
const fs = require('fs');
const path = require('path');

function loadDotEnvFiles() {
  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), envFile);
    if (!fs.existsSync(envPath)) continue;

    for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eq = line.indexOf('=');
      if (eq <= 0) continue;

      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function readRequiredPublicEnv(name) {
  return (process.env[name] || '').trim();
}

loadDotEnvFiles();

const required = [
  ['EXPO_PUBLIC_SUPABASE_URL', readRequiredPublicEnv('EXPO_PUBLIC_SUPABASE_URL')],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', readRequiredPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY')],
];

const missing = required.filter(([, value]) => !value).map(([name]) => name);

if (missing.length > 0) {
  console.error('\n❌ ビルドに必要な Supabase 環境変数が未設定です:\n');
  missing.forEach((name) => console.error(`  - ${name}`));
  console.error('\n対処方法:');
  console.error('  1. ローカル: cp .env.example .env して値を設定');
  console.error('  2. GitHub Actions: Repository Secrets に上記キーを登録');
  console.error('  3. EAS Build: eas secret:create で EXPO_PUBLIC_* を登録\n');
  process.exit(1);
}

console.log('✅ Supabase 公開環境変数を確認しました');
