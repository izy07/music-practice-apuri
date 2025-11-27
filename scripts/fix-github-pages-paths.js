#!/usr/bin/env node
/**
 * GitHub Pages用のパス修正スクリプト
 * 
 * ビルド後のHTMLとメタデータファイル内の絶対パスを
 * GitHub Pagesのベースパスに合わせて修正します。
 */

const fs = require('fs');
const path = require('path');

const BASE_PATH = process.env.GITHUB_PAGES_BASE || '/music-practice-apuri';
const DIST_DIR = path.join(__dirname, '..', 'dist');

console.log(`🔧 GitHub Pages用パス修正を開始します...`);
console.log(`   ベースパス: ${BASE_PATH}`);
console.log(`   出力ディレクトリ: ${DIST_DIR}`);

// index.htmlの修正
const indexPath = path.join(DIST_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // 絶対パスをベースパス付きパスに変更
  // /_expo/... -> /music-practice-apuri/_expo/...
  // /favicon.ico -> /music-practice-apuri/favicon.ico
  
  const basePathNoSlash = BASE_PATH.replace(/^\//, '');
  
  // すべての絶対パスを修正（ベースパスが既に含まれている場合はスキップ）
  content = content.replace(/(href|src)="\/([^"]+)"/g, (match, attr, path) => {
    // 既にベースパスが含まれている場合はスキップ
    if (path.startsWith(basePathNoSlash)) {
      return match;
    }
    // 絶対パスをベースパス付きに変更
    return `${attr}="${BASE_PATH}/${path}"`;
  });
  
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log(`✅ ${indexPath} を修正しました`);
} else {
  console.warn(`⚠️  ${indexPath} が見つかりません`);
}

// metadata.jsonの修正
const metadataPath = path.join(DIST_DIR, 'metadata.json');
if (fs.existsSync(metadataPath)) {
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    
    // metadata内のパスを修正
    if (metadata.bundles) {
      Object.keys(metadata.bundles).forEach(key => {
        if (metadata.bundles[key].file && metadata.bundles[key].file.startsWith('/')) {
          metadata.bundles[key].file = BASE_PATH + metadata.bundles[key].file;
        }
      });
    }
    
    if (metadata.assets) {
      metadata.assets.forEach(asset => {
        if (asset.file && asset.file.startsWith('/')) {
          asset.file = BASE_PATH + asset.file;
        }
      });
    }
    
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log(`✅ ${metadataPath} を修正しました`);
  } catch (error) {
    console.error(`❌ ${metadataPath} の処理中にエラーが発生しました:`, error.message);
  }
}

// _expo/static ディレクトリ内のJSファイルも修正（必要な場合）
const expoStaticDir = path.join(DIST_DIR, '_expo', 'static');
if (fs.existsSync(expoStaticDir)) {
  console.log(`📁 ${expoStaticDir} を確認中...`);
  // 必要に応じて、JSファイル内のパスも修正できます
}

console.log(`✨ パス修正が完了しました！`);

