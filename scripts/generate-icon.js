/**
 * 音符アイコンをSVGからPNGに変換するスクリプト
 * 
 * 使用方法:
 * npm install sharp --save-dev
 * node scripts/generate-icon.js
 */

const fs = require('fs');
const path = require('path');

// sharpがインストールされているかチェック
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ sharpがインストールされていません。');
  console.log('以下のコマンドでインストールしてください:');
  console.log('npm install sharp --save-dev');
  process.exit(1);
}

const svgPath = path.join(__dirname, '../assets/images/icon-note-modern.svg');
const pngPath = path.join(__dirname, '../assets/images/icon.png');
const faviconPath = path.join(__dirname, '../assets/images/favicon.png');

async function generateIcons() {
  try {
    // SVGファイルの存在確認
    if (!fs.existsSync(svgPath)) {
      console.error(`❌ SVGファイルが見つかりません: ${svgPath}`);
      process.exit(1);
    }

    console.log('🎵 音符アイコンの生成を開始します...');

    // メインアイコン（1024x1024、白背景）
    await sharp(svgPath)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(pngPath);

    console.log(`✅ アイコンを生成しました: ${pngPath}`);

    // ファビコン（64x64、白背景）
    await sharp(svgPath)
      .resize(64, 64, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(faviconPath);

    console.log(`✅ ファビコンを生成しました: ${faviconPath}`);
    console.log('🎉 完了しました！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

generateIcons();

