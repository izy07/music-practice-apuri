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

// 404.html用のシンプルで確実なリダイレクトスクリプト
// GitHub Pagesでは、存在しないパスにアクセスすると404.htmlが呼ばれる
// このスクリプトは、すべてのリクエストをindex.htmlにリダイレクトしてSPAルーティングを有効化
const redirectScript = `
<script>
// 即座に実行（DOM読み込み前）- GitHub Pages SPAルーティング用
(function() {
  try {
    const basePath = '${BASE_PATH}';
    const normalizedBasePath = basePath.replace(/\/$/, '');
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;
    
    // 静的ファイルリクエストはスキップ（.js, .css, 画像など）
    if (currentPath.match(/\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json|html)$/i)) {
      return;
    }
    
    // 内部パス（_expo, assets）はスキップ
    if (currentPath.startsWith('/_') || currentPath.startsWith('/assets')) {
      return;
    }
    
    // 既にindex.htmlにいる場合はスキップ（無限ループ防止）
    if (currentPath.endsWith('/index.html') || currentPath.endsWith('/index')) {
      return;
    }
    
    // 無限ループ防止：既にリダイレクト済みの場合はスキップ
    if (sessionStorage.getItem('_404_redirected') === 'true') {
      sessionStorage.removeItem('_404_redirected');
      return;
    }
    
    // 現在のパスからベースパスを除去して実際のルートパスを取得
    let routePath = currentPath;
    if (currentPath.startsWith(normalizedBasePath)) {
      routePath = currentPath.replace(normalizedBasePath, '') || '/';
    }
    
    // リダイレクト先URLを構築（必ずベースパス + /index.html）
    const targetUrl = normalizedBasePath + '/index.html' + currentSearch + currentHash;
    
    // リダイレクトフラグを設定（無限ループ防止）
    sessionStorage.setItem('_404_redirected', 'true');
    
    // 元のパス情報を保存（Expo Routerが認識できるように）
    if (routePath && routePath !== '/') {
      sessionStorage.setItem('_original_path', routePath);
    }
    
    // 即座にリダイレクト実行（replaceを使用して履歴に残さない）
    window.location.replace(targetUrl);
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

