#!/usr/bin/env node
/**
 * web-buildディレクトリをdistディレクトリにコピーするスクリプト
 * expo exportのデフォルト出力先がweb-buildの場合の対応
 */

const fs = require('fs');
const path = require('path');

try {
  const WEB_BUILD_DIR = path.join(__dirname, '..', 'web-build');
  const DIST_DIR = path.join(__dirname, '..', 'dist');

  console.log('🔧 web-buildをdistにコピーするスクリプトを開始します...');
  console.log(`   web-build: ${WEB_BUILD_DIR}`);
  console.log(`   dist: ${DIST_DIR}`);

  // web-buildディレクトリの存在確認
  if (!fs.existsSync(WEB_BUILD_DIR)) {
    console.warn(`⚠️  web-buildディレクトリが存在しません: ${WEB_BUILD_DIR}`);
    console.warn(`   これは正常な場合があります（既にdistに出力されている場合）`);
    
    // distディレクトリが存在するか確認
    if (fs.existsSync(DIST_DIR)) {
      console.log(`✅ distディレクトリが既に存在します`);
      process.exit(0);
    } else {
      console.error(`❌ distディレクトリも存在しません`);
      console.error(`   ビルドが失敗している可能性があります`);
      process.exit(1);
    }
  }

  console.log(`✅ web-buildディレクトリが存在します`);

  // distディレクトリが既に存在する場合は削除
  if (fs.existsSync(DIST_DIR)) {
    console.log(`🧹 既存のdistディレクトリを削除します...`);
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }

  // web-buildをdistにコピー
  console.log(`📋 web-buildをdistにコピー中...`);
  
  // ディレクトリを再帰的にコピーする関数
  const copyRecursiveSync = (src, dest) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach(childItemName => {
        copyRecursiveSync(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  copyRecursiveSync(WEB_BUILD_DIR, DIST_DIR);

  // コピー後の確認
  if (fs.existsSync(DIST_DIR)) {
    const files = fs.readdirSync(DIST_DIR);
    console.log(`✅ distディレクトリにコピーしました (${files.length}個のアイテム)`);
    
    // 主要ファイルの確認
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      const stats = fs.statSync(indexPath);
      console.log(`   ✅ index.html が存在します (${stats.size} bytes)`);
    } else {
      console.warn(`   ⚠️  index.html が見つかりません`);
    }
  } else {
    console.error(`❌ distディレクトリのコピーに失敗しました`);
    process.exit(1);
  }

  console.log('✨ コピーが完了しました！');
} catch (error) {
  console.error('❌ 予期しないエラーが発生しました:');
  console.error(`   エラーメッセージ: ${error.message}`);
  console.error(`   エラースタック: ${error.stack}`);
  process.exit(1);
}


