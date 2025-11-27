#!/usr/bin/env node
/**
 * GitHub Pages用のパス修正スクリプト
 * 
 * ビルド後のHTMLとメタデータファイル内の絶対パスを
 * GitHub Pagesのベースパスに合わせて修正します。
 */

const fs = require('fs');
const path = require('path');

// リポジトリ名に応じてベースパスを自動設定
// 環境変数で指定されていない場合、リポジトリ名を推測
let BASE_PATH = process.env.GITHUB_PAGES_BASE || process.env.EXPO_PUBLIC_WEB_BASE;

if (!BASE_PATH) {
  // package.jsonからリポジトリ名を取得（存在する場合）
  try {
    const packageJson = require('../package.json');
    // リポジトリ名を推測（通常はGitHubのリポジトリ名）
    // デフォルトは /music-practice-apuri
    BASE_PATH = '/music-practice-apuri';
  } catch (e) {
    BASE_PATH = '/music-practice-apuri';
  }
}

// ベースパスが / で始まらない場合は追加
if (!BASE_PATH.startsWith('/')) {
  BASE_PATH = '/' + BASE_PATH;
}
const DIST_DIR = path.join(__dirname, '..', 'dist');

console.log(`🔧 GitHub Pages用パス修正を開始します...`);
console.log(`   ベースパス: ${BASE_PATH}`);
console.log(`   出力ディレクトリ: ${DIST_DIR}`);

// index.htmlの修正
const indexPath = path.join(DIST_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // CSPメタタグが存在しない場合は追加
  const cspMetaTag = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: https:; font-src \'self\' data:; connect-src \'self\' https:; frame-src \'self\' https:; object-src \'none\'; base-uri \'self\'; form-action \'self\';" />';
  if (!content.includes('Content-Security-Policy')) {
    // viewportメタタグの後にCSPメタタグを追加
    content = content.replace(
      /(<meta name="viewport"[^>]*>)/i,
      `$1\n  ${cspMetaTag}`
    );
    console.log(`✅ CSPメタタグを追加しました`);
  }
  
  // 絶対パスをベースパス付きパスに変更
  // /_expo/... -> /music-practice-apuri/_expo/...
  // /favicon.ico -> /music-practice-apuri/favicon.ico
  
  const basePathNoSlash = BASE_PATH.replace(/^\//, '');
  
  // すべての絶対パスを修正（ベースパスが既に含まれている場合はスキップ）
  // より厳密な正規表現で、ベースパスが既に含まれている場合を正確に検出
  content = content.replace(/(href|src)="\/([^"]+)"/g, (match, attr, path) => {
    // 既にベースパスが含まれている場合はスキップ
    if (path.startsWith(basePathNoSlash + '/') || path === basePathNoSlash) {
      return match;
    }
    // 絶対パスをベースパス付きに変更
    return `${attr}="${BASE_PATH}/${path}"`;
  });
  
  // 相対パスも確認（./ や ../ で始まるパスはそのまま）
  // ただし、/_expo/ や /assets/ などの絶対パスは確実に修正
  content = content.replace(/(href|src)="\/_expo\/([^"]+)"/g, (match, attr, path) => {
    if (!path.startsWith(basePathNoSlash)) {
      return `${attr}="${BASE_PATH}/_expo/${path}"`;
    }
    return match;
  });
  
  content = content.replace(/(href|src)="\/assets\/([^"]+)"/g, (match, attr, path) => {
    if (!path.startsWith(basePathNoSlash)) {
      return `${attr}="${BASE_PATH}/assets/${path}"`;
    }
    return match;
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

// 404.htmlを作成（GitHub PagesでSPAのクライアントサイドルーティングを有効化）
const html404Path = path.join(DIST_DIR, '404.html');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // より堅牢な404.htmlリダイレクトスクリプト（即座に実行）
  const redirectScript = `
<script>
  // GitHub Pages用: 404エラー時に現在のパスを保持してindex.htmlにリダイレクト
  // 即座に実行（DOM読み込み前）
  (function() {
    const basePath = '${BASE_PATH}';
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;
    
    // 静的ファイル（.js, .css, .pngなど）の場合は何もしない
    if (currentPath.match(/\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/i)) {
      return;
    }
    
    // _expoやassetsなどの内部パスはそのまま（ただし、ベースパス付きの場合は処理）
    if (currentPath.startsWith('/_') || currentPath.startsWith('/assets')) {
      // ベースパス付きの内部パスは処理しない
      if (!currentPath.startsWith(basePath + '/_') && !currentPath.startsWith(basePath + '/assets')) {
        return;
      }
    }
    
    // index.htmlへのリダイレクトを防ぐ（無限ループ防止）
    if (currentPath.endsWith('/index.html') || currentPath.endsWith('/index')) {
      return;
    }
    
    // すでにリダイレクト済みの場合はスキップ（無限ループ防止）
    if (sessionStorage.getItem('github-pages-redirecting') === 'true') {
      sessionStorage.removeItem('github-pages-redirecting');
      return;
    }
    
    // すべてのパスをindex.htmlにリダイレクト（Expo Routerがクライアントサイドでルーティング）
    let targetPath;
    let originalPathForRouter = null;
    let redirectPath = null;
    
    if (currentPath.startsWith(basePath)) {
      // ベースパスで始まる場合: /music-practice-apuri/tutorial -> /music-practice-apuri/index.html
      originalPathForRouter = currentPath;
      redirectPath = currentPath.replace(basePath, '') || '/';
      const queryParams = new URLSearchParams(currentSearch);
      queryParams.set('_redirect', redirectPath);
      targetPath = basePath + '/index.html?' + queryParams.toString() + currentHash;
    } else if (currentPath === '/' || currentPath === '') {
      // ルートパスの場合: / -> /music-practice-apuri/index.html
      targetPath = basePath + '/index.html' + currentSearch + currentHash;
    } else {
      // ベースパスがない場合: /tutorial -> /music-practice-apuri/index.html
      originalPathForRouter = basePath + (currentPath.startsWith('/') ? currentPath : '/' + currentPath);
      redirectPath = currentPath;
      const queryParams = new URLSearchParams(currentSearch);
      queryParams.set('_redirect', redirectPath);
      targetPath = basePath + '/index.html?' + queryParams.toString() + currentHash;
    }
    
    // リダイレクトフラグを設定
    sessionStorage.setItem('github-pages-redirecting', 'true');
    
    // 元のパス情報をsessionStorageに保存（Expo Routerが認識できるように）
    if (originalPathForRouter) {
      sessionStorage.setItem('expo-router-original-path', originalPathForRouter);
    }
    if (redirectPath) {
      sessionStorage.setItem('expo-router-redirect-path', redirectPath);
    }
    
    // 即座にリダイレクト実行
    window.location.replace(targetPath);
  })();
</script>
`;
  
  // </head>の前にリダイレクトスクリプトを挿入
  if (content.includes('</head>')) {
    content = content.replace('</head>', redirectScript + '</head>');
  } else if (content.includes('<head>')) {
    content = content.replace('<head>', '<head>' + redirectScript);
  } else {
    // headタグがない場合はbodyの前に追加
    content = content.replace('<body', redirectScript + '<body');
  }
  
  fs.writeFileSync(html404Path, content, 'utf8');
  console.log(`✅ ${html404Path} を作成しました（SPAルーティング用）`);
  
  // index.htmlにも同様のスクリプトを追加（リロード時の404エラーを防ぐ）
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  if (!indexContent.includes('github-pages-redirecting')) {
    const indexRedirectScript = `
<script>
  // GitHub Pages用: リロード時の404エラーを防ぐ
  (function() {
    const basePath = '${BASE_PATH}';
    const currentPath = window.location.pathname;
    
    // クエリパラメータからリダイレクトパスを取得
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('_redirect');
    
    // sessionStorageから元のパスを取得
    const originalPath = sessionStorage.getItem('expo-router-original-path');
    
    // リダイレクトが必要な場合
    if (redirectPath || (originalPath && currentPath.includes('/index.html'))) {
      const targetPath = redirectPath || originalPath.replace(basePath, '') || '/';
      if (targetPath !== currentPath.replace(basePath, '').replace('/index.html', '')) {
        // クエリパラメータを削除
        urlParams.delete('_redirect');
        const newSearch = urlParams.toString();
        const newUrl = basePath + targetPath + (newSearch ? '?' + newSearch : '') + window.location.hash;
        window.history.replaceState({}, '', newUrl);
        sessionStorage.removeItem('expo-router-original-path');
      }
    }
  })();
</script>
`;
    
    if (indexContent.includes('</head>')) {
      indexContent = indexContent.replace('</head>', indexRedirectScript + '</head>');
    } else if (indexContent.includes('<head>')) {
      indexContent = indexContent.replace('<head>', '<head>' + indexRedirectScript);
    }
    
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log(`✅ ${indexPath} にリダイレクトスクリプトを追加しました`);
  }
}

console.log(`✨ パス修正が完了しました！`);

