#!/usr/bin/env node
/**
 * 画像アセットをWebP形式に変換するNode.jsスクリプト
 * 
 * 使用方法:
 *   node scripts/optimize-images-node.js
 * 
 * 必要なパッケージ:
 *   npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

// sharpパッケージの確認
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('エラー: sharpパッケージが見つかりません');
  console.error('以下のコマンドでインストールしてください:');
  console.error('  npm install sharp --save-dev');
  process.exit(1);
}

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'images');

// 画像をWebP形式に変換する関数
async function convertToWebP(inputPath, outputPath) {
  try {
    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;
    
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);
    
    const webpStats = fs.statSync(outputPath);
    const webpSize = webpStats.size;
    const reduction = ((originalSize - webpSize) / originalSize * 100).toFixed(1);
    
    return {
      success: true,
      originalSize,
      webpSize,
      reduction: parseFloat(reduction)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// メイン処理
async function main() {
  console.log('画像アセットの最適化を開始します...\n');
  
  // icon.pngの変換
  const iconPath = path.join(ASSETS_DIR, 'icon.png');
  const iconWebpPath = path.join(ASSETS_DIR, 'icon.webp');
  
  if (fs.existsSync(iconPath)) {
    console.log('icon.pngを変換中...');
    const result = await convertToWebP(iconPath, iconWebpPath);
    if (result.success) {
      console.log(`✓ icon.webpを作成しました`);
      console.log(`  サイズ削減: ${result.reduction}% (${result.originalSize} bytes → ${result.webpSize} bytes)`);
    } else {
      console.error(`✗ icon.pngの変換に失敗: ${result.error}`);
    }
  } else {
    console.warn(`警告: ${iconPath}が見つかりません`);
  }
  
  console.log('');
  
  // favicon.pngの変換
  const faviconPath = path.join(ASSETS_DIR, 'favicon.png');
  const faviconWebpPath = path.join(ASSETS_DIR, 'favicon.webp');
  
  if (fs.existsSync(faviconPath)) {
    console.log('favicon.pngを変換中...');
    const result = await convertToWebP(faviconPath, faviconWebpPath);
    if (result.success) {
      console.log(`✓ favicon.webpを作成しました`);
      console.log(`  サイズ削減: ${result.reduction}% (${result.originalSize} bytes → ${result.webpSize} bytes)`);
    } else {
      console.error(`✗ favicon.pngの変換に失敗: ${result.error}`);
    }
  } else {
    console.warn(`警告: ${faviconPath}が見つかりません`);
  }
  
  console.log('');
  console.log('画像アセットの最適化が完了しました！');
  console.log('');
  console.log('注意: app.config.tsとweb/index.htmlでWebP形式への参照を更新する必要があります。');
}

main().catch(error => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});

