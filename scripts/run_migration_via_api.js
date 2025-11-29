/**
 * Supabaseマイグレーション実行スクリプト（API経由）
 * 
 * 注意: SupabaseのREST APIから直接SQLを実行することはできません。
 * このスクリプトは、Supabaseダッシュボードで実行するためのSQLを表示します。
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const sqlFile = path.join(__dirname, 'fix_events_and_user_profiles.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('='.repeat(80));
console.log('🚀 Supabaseマイグレーション実行');
console.log('='.repeat(80));
console.log('');
console.log('⚠️  重要: SupabaseのREST APIから直接SQLを実行することはできません');
console.log('   以下の方法でマイグレーションを実行してください:');
console.log('');
console.log('📝 方法1: Supabaseダッシュボードで実行（推奨）');
console.log('   1. ブラウザで https://supabase.com/dashboard を開く');
console.log('   2. プロジェクト「uteeqkpsezbabdmritkn」を選択');
console.log('   3. 左メニューから「SQL Editor」をクリック');
console.log('   4. 以下のSQLをコピー＆ペースト');
console.log('   5. 「Run」ボタンをクリック');
console.log('');
console.log('📝 方法2: このスクリプトでSQLをクリップボードにコピー');
console.log('   (macOSの場合) pbcopyコマンドを使用');
console.log('');

// SQLを表示
console.log('─'.repeat(80));
console.log('📋 実行するSQL:');
console.log('─'.repeat(80));
console.log(sql);
console.log('─'.repeat(80));
console.log('');

// macOSの場合、クリップボードにコピーを試みる
if (process.platform === 'darwin') {
  const { exec } = require('child_process');
  exec('which pbcopy', (error) => {
    if (!error) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('📋 SQLをクリップボードにコピーしますか？ (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          exec(`echo "${sql.replace(/"/g, '\\"')}" | pbcopy`, (err) => {
            if (err) {
              console.error('❌ クリップボードへのコピーに失敗しました:', err.message);
            } else {
              console.log('✅ SQLをクリップボードにコピーしました！');
              console.log('   SupabaseダッシュボードのSQL Editorに貼り付けて実行してください。');
            }
            rl.close();
          });
        } else {
          rl.close();
        }
      });
    }
  });
} else {
  console.log('💡 ヒント: 上記のSQLをコピーしてSupabaseダッシュボードで実行してください。');
}

console.log('');
console.log('='.repeat(80));

