#!/usr/bin/env node
/**
 * 堅牢な404.htmlを作成するスクリプト
 * GitHub PagesでSPAルーティングが確実に動作するように
 */

const fs = require('fs');
const path = require('path');

try {
  const BASE_PATH = process.env.GITHUB_PAGES_BASE || process.env.EXPO_PUBLIC_WEB_BASE || '/music-practice-apuri';
  const DIST_DIR = path.join(__dirname, '..', 'dist');
  const indexPath = path.join(DIST_DIR, 'index.html');
  const html404Path = path.join(DIST_DIR, '404.html');

  console.log('🔧 404.html作成スクリプトを開始します...');
  console.log(`   ベースパス: ${BASE_PATH}`);
  console.log(`   出力ディレクトリ: ${DIST_DIR}`);
  console.log(`   index.html: ${indexPath}`);
  console.log(`   404.html: ${html404Path}`);

  // distディレクトリの存在確認
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`❌ distディレクトリが存在しません: ${DIST_DIR}`);
    console.error(`   現在のディレクトリ: ${process.cwd()}`);
    console.error(`   スクリプトの場所: ${__dirname}`);
    process.exit(1);
  }

  // index.htmlの存在確認
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ index.htmlが見つかりません: ${indexPath}`);
    console.error(`📁 distディレクトリの内容:`);
    try {
      const files = fs.readdirSync(DIST_DIR);
      files.forEach(file => {
        console.error(`   - ${file}`);
      });
    } catch (err) {
      console.error(`   ディレクトリの読み込みに失敗: ${err.message}`);
    }
    process.exit(1);
  }

  // index.htmlを読み込む
  let content;
  try {
    content = fs.readFileSync(indexPath, 'utf8');
    console.log(`✅ index.htmlを読み込みました ($(wc -c < "${indexPath}") bytes)`);
  } catch (err) {
    console.error(`❌ index.htmlの読み込みに失敗しました: ${err.message}`);
    process.exit(1);
  }

  if (!content || content.trim().length === 0) {
    console.error('❌ index.htmlの内容が空です');
    process.exit(1);
  }

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
      // 例: /auth/login または /auth/signup
      // GitHub Pagesでは、ベースパスがないパスにアクセスした場合、404.htmlが呼ばれる
      const normalizedPath = currentPath.startsWith('/') ? currentPath : '/' + currentPath;
      originalPath = normalizedBasePath + normalizedPath;
      redirectPath = normalizedPath;
      
      // デバッグログ（開発環境のみ）
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('404.html: ベースパスがないパスを検出', {
          currentPath,
          normalizedPath,
          originalPath,
          redirectPath,
          normalizedBasePath
        });
      }
    }
    
    // クエリパラメータにリダイレクトパスを追加
    const queryParams = new URLSearchParams(currentSearch);
    queryParams.set('_redirect', redirectPath);
    
    // リダイレクト先URLを構築（必ずベースパス + /index.html）
    targetPath = normalizedBasePath + '/index.html?' + queryParams.toString() + currentHash;
    
    // デバッグログ（開発環境のみ）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('404.html: リダイレクト先', {
        targetPath,
        redirectPath,
        normalizedBasePath
      });
    }
    
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
  let updatedContent;
  if (content.includes('</head>')) {
    updatedContent = content.replace('</head>', redirectScript + '</head>');
  } else if (content.includes('<head>')) {
    updatedContent = content.replace('<head>', '<head>' + redirectScript);
  } else {
    updatedContent = redirectScript + content;
  }

  if (!updatedContent || updatedContent.trim().length === 0) {
    console.error('❌ 404.htmlのコンテンツ生成に失敗しました');
    process.exit(1);
  }

  // 404.htmlとして保存
  try {
    fs.writeFileSync(html404Path, updatedContent, 'utf8');
    const stats = fs.statSync(html404Path);
    console.log(`✅ 404.htmlを作成しました (${stats.size} bytes)`);
    console.log(`   ファイルパス: ${html404Path}`);
  } catch (err) {
    console.error(`❌ 404.htmlの書き込みに失敗しました: ${err.message}`);
    console.error(`   ファイルパス: ${html404Path}`);
    console.error(`   エラー詳細: ${err.stack}`);
    process.exit(1);
  }

  // 作成されたファイルの確認
  if (!fs.existsSync(html404Path)) {
    console.error('❌ 404.htmlが作成されていません');
    process.exit(1);
  }

  console.log('✅ 404.html作成スクリプトが正常に完了しました');
} catch (error) {
  console.error('❌ 予期しないエラーが発生しました:');
  console.error(`   エラーメッセージ: ${error.message}`);
  console.error(`   エラースタック: ${error.stack}`);
  process.exit(1);
}

