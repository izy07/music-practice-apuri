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

// 404.html用の完全なリダイレクトスクリプト（即座に実行）
const redirectScript = `
<script>
// 即座に実行（DOM読み込み前）
(function() {
  const basePath = '${BASE_PATH}';
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const currentHash = window.location.hash;
  
  // 静的ファイルはスキップ
  if (currentPath.match(/\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/i)) {
    return;
  }
  
  // 内部パスはスキップ（ただし、ベースパス付きの場合は処理）
  if (currentPath.startsWith('/_') || currentPath.startsWith('/assets')) {
    // ベースパス付きの内部パスは処理しない
    if (!currentPath.startsWith(basePath + '/_') && !currentPath.startsWith(basePath + '/assets')) {
      return;
    }
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
  let redirectPath = null;
  
  // ベースパスを正規化（末尾のスラッシュを削除）
  const normalizedBasePath = basePath.replace(/\/$/, '');
  
  if (currentPath.startsWith(normalizedBasePath)) {
    // ベースパスで始まる場合: /music-practice-apuri/tutorial
    originalPath = currentPath;
    redirectPath = currentPath.replace(normalizedBasePath, '') || '/';
    const queryParams = new URLSearchParams(currentSearch);
    queryParams.set('_redirect', redirectPath);
    targetPath = normalizedBasePath + '/index.html?' + queryParams.toString() + currentHash;
  } else if (currentPath === '/' || currentPath === '') {
    // ルートパスの場合: /
    targetPath = normalizedBasePath + '/index.html' + currentSearch + currentHash;
  } else {
    // ベースパスがない場合: /tutorial -> /music-practice-apuri/tutorial
    // 現在のパスを正規化（先頭のスラッシュを確保）
    const normalizedPath = currentPath.startsWith('/') ? currentPath : '/' + currentPath;
    originalPath = normalizedBasePath + normalizedPath;
    redirectPath = normalizedPath;
    const queryParams = new URLSearchParams(currentSearch);
    queryParams.set('_redirect', redirectPath);
    targetPath = normalizedBasePath + '/index.html?' + queryParams.toString() + currentHash;
  }
  
  // リダイレクトフラグを設定
  sessionStorage.setItem('github-pages-redirecting', 'true');
  
  // 元のパスを保存
  if (originalPath) {
    sessionStorage.setItem('expo-router-original-path', originalPath);
  }
  if (redirectPath) {
    sessionStorage.setItem('expo-router-redirect-path', redirectPath);
  }
  
  // 即座にリダイレクト実行
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

