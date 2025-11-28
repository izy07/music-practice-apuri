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
// 即座に実行（DOM読み込み前）- GitHub Pages SPAルーティング用
(function() {
  try {
    const basePath = '${BASE_PATH}';
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;
    const currentUrl = window.location.href;
    
    // 静的ファイルはスキップ（.js, .css, 画像ファイルなど）
    if (currentPath.match(/\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/i)) {
      return;
    }
    
    // 内部パス（_expo, assets）はスキップ
    if (currentPath.startsWith('/_') || currentPath.startsWith('/assets')) {
      // ベースパス付きの内部パスの場合は処理する
      const normalizedBasePath = basePath.replace(/\/$/, '');
      if (!currentPath.startsWith(normalizedBasePath + '/_') && !currentPath.startsWith(normalizedBasePath + '/assets')) {
        return;
      }
    }
    
    // index.htmlへのリダイレクトを防ぐ（無限ループ防止）
    if (currentPath.endsWith('/index.html') || currentPath.endsWith('/index')) {
      return;
    }
    
    // 無限ループ防止：既にリダイレクト中の場合
    if (sessionStorage.getItem('github-pages-redirecting') === 'true') {
      sessionStorage.removeItem('github-pages-redirecting');
      return;
    }
    
    // ベースパスを正規化（末尾のスラッシュを削除）
    const normalizedBasePath = basePath.replace(/\/$/, '');
    
    // リダイレクト先を決定
    let targetPath;
    let originalPath = null;
    let redirectPath = null;
    
    if (currentPath.startsWith(normalizedBasePath)) {
      // ケース1: ベースパスで始まる場合
      // 例: /music-practice-apuri/auth/login
      originalPath = currentPath;
      redirectPath = currentPath.replace(normalizedBasePath, '') || '/';
    } else if (currentPath === '/' || currentPath === '') {
      // ケース2: ルートパスの場合
      // 例: /
      redirectPath = '/';
    } else {
      // ケース3: ベースパスがない場合（最も重要）
      // 例: /auth/login
      const normalizedPath = currentPath.startsWith('/') ? currentPath : '/' + currentPath;
      originalPath = normalizedBasePath + normalizedPath;
      redirectPath = normalizedPath;
    }
    
    // クエリパラメータにリダイレクトパスを追加
    const queryParams = new URLSearchParams(currentSearch);
    queryParams.set('_redirect', redirectPath);
    
    // リダイレクト先URLを構築
    targetPath = normalizedBasePath + '/index.html?' + queryParams.toString() + currentHash;
    
    // リダイレクトフラグを設定（無限ループ防止）
    sessionStorage.setItem('github-pages-redirecting', 'true');
    
    // 元のパス情報を保存（Expo Routerが認識できるように）
    if (originalPath) {
      sessionStorage.setItem('expo-router-original-path', originalPath);
    }
    if (redirectPath) {
      sessionStorage.setItem('expo-router-redirect-path', redirectPath);
    }
    
    // 即座にリダイレクト実行（replaceを使用して履歴に残さない）
    window.location.replace(targetPath);
  } catch (error) {
    // エラーが発生した場合は、ベースパスのindex.htmlにリダイレクト
    console.error('404.html リダイレクトエラー:', error);
    const basePath = '${BASE_PATH}';
    const normalizedBasePath = basePath.replace(/\/$/, '');
    window.location.replace(normalizedBasePath + '/index.html');
  }
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

