#!/usr/bin/env node
/**
 * 堅牢な404.htmlを作成するスクリプト
 * GitHub PagesでSPAルーティングが確実に動作するように
 */

const fs = require('fs');
const path = require('path');

const BASE_PATH = process.env.GITHUB_PAGES_BASE || process.env.EXPO_PUBLIC_WEB_BASE || '/music-practice-apuri';
const DIST_DIR = path.join(__dirname, '..', 'dist');
const indexPath = path.join(DIST_DIR, 'index.html');
const html404Path = path.join(DIST_DIR, '404.html');

if (!fs.existsSync(indexPath)) {
  console.error('❌ index.htmlが見つかりません');
  process.exit(1);
}

// index.htmlを読み込む
let content = fs.readFileSync(indexPath, 'utf8');

// 404.html用の完全なリダイレクトスクリプト
const redirectScript = `
<script>
(function() {
  const basePath = '${BASE_PATH}';
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const currentHash = window.location.hash;
  
  // 静的ファイルはスキップ
  if (currentPath.match(/\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/i)) {
    return;
  }
  
  // 内部パスはスキップ
  if (currentPath.startsWith('/_') || currentPath.startsWith('/assets')) {
    return;
  }
  
  // index.htmlはスキップ
  if (currentPath.endsWith('/index.html') || currentPath.endsWith('/index')) {
    return;
  }
  
  // 無限ループ防止
  if (sessionStorage.getItem('github-pages-redirecting') === 'true') {
    sessionStorage.removeItem('github-pages-redirecting');
    return;
  }
  
  // リダイレクト先を決定
  let targetPath;
  let originalPath = null;
  
  if (currentPath.startsWith(basePath)) {
    originalPath = currentPath;
    const pathWithoutBase = currentPath.replace(basePath, '') || '/';
    const queryParams = new URLSearchParams(currentSearch);
    queryParams.set('_redirect', pathWithoutBase);
    targetPath = basePath + '/index.html?' + queryParams.toString() + currentHash;
  } else if (currentPath === '/' || currentPath === '') {
    targetPath = basePath + '/index.html' + currentSearch + currentHash;
  } else {
    originalPath = basePath + (currentPath.startsWith('/') ? currentPath : '/' + currentPath);
    const queryParams = new URLSearchParams(currentSearch);
    queryParams.set('_redirect', currentPath);
    targetPath = basePath + '/index.html?' + queryParams.toString() + currentHash;
  }
  
  // リダイレクトフラグを設定
  sessionStorage.setItem('github-pages-redirecting', 'true');
  
  // 元のパスを保存
  if (originalPath) {
    sessionStorage.setItem('expo-router-original-path', originalPath);
  }
  
  // リダイレクト実行
  window.location.replace(targetPath);
})();
</script>
`;

// </head>の前にスクリプトを挿入
if (content.includes('</head>')) {
  content = content.replace('</head>', redirectScript + '</head>');
} else if (content.includes('<head>')) {
  content = content.replace('<head>', '<head>' + redirectScript);
} else {
  content = redirectScript + content;
}

// 404.htmlとして保存
fs.writeFileSync(html404Path, content, 'utf8');
console.log(`✅ ${html404Path} を作成しました`);

