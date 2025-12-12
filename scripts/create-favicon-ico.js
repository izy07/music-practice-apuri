#!/usr/bin/env node
/**
 * favicon.icoファイルを生成するスクリプト
 * 
 * favicon.pngからfavicon.icoを作成します。
 * 注意: sharpはICO形式を直接サポートしていないため、
 * PNG形式のままweb/favicon.icoとして保存します。
 * 多くのブラウザはPNG形式のfavicon.icoも受け入れます。
 * 
 * 使用方法:
 *   npm run create-favicon
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'images');
const WEB_DIR = path.join(__dirname, '..', 'web');
const FAVICON_PNG = path.join(ASSETS_DIR, 'favicon.png');
const FAVICON_ICO = path.join(WEB_DIR, 'favicon.ico');

// favicon.pngが存在するか確認
if (!fs.existsSync(FAVICON_PNG)) {
  console.error(`エラー: ${FAVICON_PNG} が見つかりません`);
  process.exit(1);
}

// webディレクトリが存在しない場合は作成
if (!fs.existsSync(WEB_DIR)) {
  fs.mkdirSync(WEB_DIR, { recursive: true });
  console.log(`webディレクトリを作成しました: ${WEB_DIR}`);
}

// favicon.pngをfavicon.icoとしてコピー
// 多くのブラウザはPNG形式のfavicon.icoも受け入れます
try {
  fs.copyFileSync(FAVICON_PNG, FAVICON_ICO);
  const stats = fs.statSync(FAVICON_ICO);
  console.log(`✓ favicon.icoを作成しました: ${FAVICON_ICO}`);
  console.log(`  サイズ: ${stats.size} bytes`);
  console.log('');
  console.log('注意: PNG形式のfavicon.icoとして保存しました。');
  console.log('多くのブラウザはPNG形式のfavicon.icoも受け入れます。');
  console.log('もしICO形式が必要な場合は、オンラインツールやtoIcoライブラリを使用してください。');
} catch (error) {
  console.error(`エラー: favicon.icoの作成に失敗しました:`, error.message);
  process.exit(1);
}
