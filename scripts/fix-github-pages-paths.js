#!/usr/bin/env node
/**
 * GitHub Pages用のパス修正スクリプト
 * 
 * ビルド後のHTMLとメタデータファイル内の絶対パスを
 * GitHub Pagesのベースパスに合わせて修正します。
 */

const fs = require('fs');
const path = require('path');

try {
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
      console.warn(`⚠️  package.jsonの読み込みに失敗しました: ${e.message}`);
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
  console.log(`   現在のディレクトリ: ${process.cwd()}`);
  console.log(`   スクリプトの場所: ${__dirname}`);

  // distディレクトリの存在確認
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`❌ 出力ディレクトリが存在しません: ${DIST_DIR}`);
    console.error(`📁 親ディレクトリの内容:`);
    try {
      const parentDir = path.dirname(DIST_DIR);
      if (fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        files.forEach(file => {
          console.error(`   - ${file}`);
        });
      } else {
        console.error(`   親ディレクトリも存在しません: ${parentDir}`);
      }
    } catch (err) {
      console.error(`   ディレクトリの読み込みに失敗: ${err.message}`);
    }
    process.exit(1);
  }

  console.log(`✅ distディレクトリが存在します`);

  // index.htmlの修正
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ ${indexPath} が見つかりません`);
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

  let content;
  try {
    content = fs.readFileSync(indexPath, 'utf8');
    console.log(`✅ index.htmlを読み込みました`);
    
    if (!content || content.trim().length === 0) {
      console.error(`❌ index.htmlの内容が空です`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ index.htmlの読み込みに失敗しました: ${err.message}`);
    process.exit(1);
  }
  
  // baseタグを追加（すべての相対パスを正しく解決するため）
  // 注意: baseタグはheadタグの最初に配置する必要がある
  const baseTag = `<base href="${BASE_PATH}/">`;
  if (!content.includes('<base')) {
    // headタグの直後にbaseタグを追加（他のメタタグより前に）
    content = content.replace(
      /(<head[^>]*>)/i,
      `$1\n  ${baseTag}`
    );
    console.log(`✅ baseタグを追加しました: ${BASE_PATH}/`);
  } else {
    // 既存のbaseタグを更新
    content = content.replace(
      /<base[^>]*>/i,
      baseTag
    );
    console.log(`✅ baseタグを更新しました: ${BASE_PATH}/`);
  }
  
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
  
  // baseタグを追加したので、相対パスは自動的に解決される
  // ただし、絶対パス（/で始まる）はbaseタグの影響を受けないため、修正が必要
  // baseタグがある場合でも、絶対パスは明示的に修正する
  
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
  
  // metadata.jsonから読み込まれるパスも確認
  // scriptタグのsrc属性で相対パスを使用している場合、baseタグで解決されるが、
  // 念のため絶対パスも修正
  content = content.replace(/<script[^>]*src="([^"]+)"/g, (match, src) => {
    // 相対パス（./ や ../ で始まる、または / で始まらない）はそのまま
    if (src.startsWith('./') || src.startsWith('../') || !src.startsWith('/')) {
      return match;
    }
    // 絶対パスで、ベースパスが含まれていない場合は修正
    if (!src.startsWith(BASE_PATH)) {
      return match.replace(src, BASE_PATH + src);
    }
    return match;
  });
  
  try {
    fs.writeFileSync(indexPath, content, 'utf8');
    const stats = fs.statSync(indexPath);
    console.log(`✅ ${indexPath} を修正しました (${stats.size} bytes)`);
    
    // 修正後の内容を確認（デバッグ用）
    const scriptTags = content.match(/<script[^>]*src="([^"]+)"/g) || [];
    const linkTags = content.match(/<link[^>]*href="([^"]+)"/g) || [];
    const baseTagExists = content.includes('<base');
    
    console.log(`   - baseタグ: ${baseTagExists ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   - スクリプトタグ: ${scriptTags.length}個`);
    scriptTags.slice(0, 5).forEach((tag, index) => {
      const srcMatch = tag.match(/src="([^"]+)"/);
      if (srcMatch) {
        const src = srcMatch[1];
        const isCorrect = src.startsWith(BASE_PATH) || src.startsWith('./') || src.startsWith('../') || !src.startsWith('/');
        console.log(`     ${index + 1}. ${src.substring(0, 60)}... ${isCorrect ? '✅' : '❌ 修正が必要'}`);
      }
    });
    if (scriptTags.length > 5) {
      console.log(`     ... 他 ${scriptTags.length - 5}個`);
    }
    console.log(`   - リンクタグ: ${linkTags.length}個`);
  } catch (err) {
    console.error(`❌ index.htmlの書き込みに失敗しました: ${err.message}`);
    process.exit(1);
  }

  // metadata.jsonの修正
  const metadataPath = path.join(DIST_DIR, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    try {
      let metadataContent;
      try {
        metadataContent = fs.readFileSync(metadataPath, 'utf8');
      } catch (err) {
        console.error(`❌ metadata.jsonの読み込みに失敗しました: ${err.message}`);
        throw err;
      }
      
      let metadata;
      try {
        metadata = JSON.parse(metadataContent);
      } catch (err) {
        console.error(`❌ metadata.jsonのパースに失敗しました: ${err.message}`);
        throw err;
      }
      
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
      
      try {
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
        console.log(`✅ ${metadataPath} を修正しました`);
      } catch (err) {
        console.error(`❌ metadata.jsonの書き込みに失敗しました: ${err.message}`);
        throw err;
      }
    } catch (error) {
      console.error(`❌ ${metadataPath} の処理中にエラーが発生しました: ${error.message}`);
      console.error(`   エラースタック: ${error.stack}`);
      // metadata.jsonのエラーは致命的ではないため、続行
    }
  } else {
    console.warn(`⚠️  ${metadataPath} が見つかりません（オプショナルファイル）`);
  }

  // _expo/static ディレクトリ内のJSファイルも修正（必要な場合）
  const expoStaticDir = path.join(DIST_DIR, '_expo', 'static');
  if (fs.existsSync(expoStaticDir)) {
    console.log(`📁 ${expoStaticDir} を確認中...`);
    // 必要に応じて、JSファイル内のパスも修正できます
  }

  // 404.htmlは別のスクリプト（create-robust-404.js）で作成されるため、
  // ここでは作成しない（重複防止）
  
  console.log(`✨ パス修正が完了しました！`);
} catch (error) {
  console.error('❌ 予期しないエラーが発生しました:');
  console.error(`   エラーメッセージ: ${error.message}`);
  console.error(`   エラースタック: ${error.stack}`);
  process.exit(1);
}

