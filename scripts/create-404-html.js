#!/usr/bin/env node
/**
 * GitHub Pages用の404.htmlを作成するスクリプト
 * すべてのリクエストをindex.htmlにリダイレクトして、SPAのクライアントサイドルーティングを有効化
 */

const fs = require('fs');
const path = require('path');

const BASE_PATH = process.env.GITHUB_PAGES_BASE || '/music-practice-apuri';
const DIST_DIR = path.join(__dirname, '..', 'dist');

console.log(`🔧 404.htmlを作成します...`);
console.log(`   ベースパス: ${BASE_PATH}`);
console.log(`   出力ディレクトリ: ${DIST_DIR}`);

const indexPath = path.join(DIST_DIR, 'index.html');
const html404Path = path.join(DIST_DIR, '404.html');

if (fs.existsSync(indexPath)) {
  // index.htmlを読み込んで404.htmlとしてコピー
  // ただし、パスを適切に修正する必要がある
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // 404.htmlにコピー
  fs.writeFileSync(html404Path, content, 'utf8');
  console.log(`✅ ${html404Path} を作成しました`);
} else {
  console.warn(`⚠️  ${indexPath} が見つかりません`);
}



