#!/usr/bin/env node

/**
 * React.memo/memoでラップされたコンポーネントの閉じ括弧をチェックするスクリプト
 * 使用方法: node scripts/check-memo-closing.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// チェック対象のディレクトリ
const targetDirs = ['components', 'app'];

// チェック対象のファイル拡張子
const extensions = ['.tsx', '.ts'];

// エラーが見つかったファイル
const errors = [];

/**
 * ファイルを再帰的に検索
 */
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // node_modulesや.gitをスキップ
      if (file !== 'node_modules' && file !== '.git' && file !== '.expo') {
        findFiles(filePath, fileList);
      }
    } else if (extensions.some(ext => file.endsWith(ext))) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * ファイルの内容をチェック
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let hasError = false;
  const memoPattern = /(?:const\s+\w+\s*=\s*(?:React\.)?memo\s*\(function|const\s+\w+\s*=\s*(?:React\.)?memo\s*\(\(|export\s+const\s+\w+\s*=\s*(?:React\.)?memo\s*\(function|export\s+const\s+\w+\s*=\s*(?:React\.)?memo\s*\(\(|export\s+default\s+(?:React\.)?memo\s*\(function)/;
  
  let inMemoComponent = false;
  let memoStartLine = 0;
  let braceCount = 0;
  let parenCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // memoコンポーネントの開始を検出
    if (memoPattern.test(line) && !inMemoComponent) {
      inMemoComponent = true;
      memoStartLine = lineNum;
      // 開始行の括弧をカウント
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      parenCount = openParens - closeParens;
      braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    }
    
    if (inMemoComponent) {
      // 括弧と波括弧をカウント
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      parenCount += openParens - closeParens;
      braceCount += openBraces - closeBraces;
      
      // コンポーネント関数の終了を検出（braceCountが0になったとき）
      if (braceCount === 0 && parenCount > 0) {
        // 次の行をチェック
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          // }); または }); で終わっているかチェック
          if (!nextLine.startsWith('});') && !nextLine.startsWith(')')) {
            // ただし、コメントや空行の場合は次の行もチェック
            let foundClosing = false;
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const checkLine = lines[j].trim();
              if (checkLine.startsWith('});') || checkLine.startsWith(')')) {
                foundClosing = true;
                break;
              }
              if (checkLine && !checkLine.startsWith('//') && !checkLine.startsWith('*')) {
                break;
              }
            }
            if (!foundClosing) {
              errors.push({
                file: filePath,
                line: lineNum,
                message: `memoコンポーネントが正しく閉じられていません（${memoStartLine}行目で開始）`
              });
              hasError = true;
            }
        }
        }
        inMemoComponent = false;
        parenCount = 0;
        braceCount = 0;
      }
    }
  }
  
  return hasError;
}

// メイン処理
console.log('🔍 React.memo/memoコンポーネントの閉じ括弧をチェック中...\n');

let totalFiles = 0;
let errorFiles = 0;

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  ディレクトリが見つかりません: ${dir}`);
    return;
  }
  
  const files = findFiles(dir);
  totalFiles += files.length;
  
  files.forEach(file => {
    if (checkFile(file)) {
      errorFiles++;
    }
  });
});

console.log(`\n📊 チェック結果:`);
console.log(`   総ファイル数: ${totalFiles}`);
console.log(`   エラー数: ${errorFiles}`);

if (errors.length > 0) {
  console.log(`\n❌ 以下のファイルに問題があります:\n`);
  errors.forEach(err => {
    console.log(`   ${err.file}:${err.line}`);
    console.log(`   ${err.message}\n`);
  });
  process.exit(1);
} else {
  console.log(`\n✅ すべてのファイルが正常です！`);
  process.exit(0);
}

