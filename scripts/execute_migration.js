/**
 * Supabaseマイグレーション実行スクリプト
 * 
 * このスクリプトは、Supabaseの管理APIを使ってSQLを実行します。
 * サービスロールキーが必要です。
 * 
 * 使用方法:
 * SUPABASE_URL=https://your-project.supabase.co \
 * SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 * node scripts/execute_migration.js
 */

const fs = require('fs');
const path = require('path');

// 環境変数から設定を取得
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uteeqkpsezbabdmritkn.supabase.co';

// SQLファイルを読み込む
const sqlFile = path.join(__dirname, 'fix_events_and_user_profiles.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Supabaseの管理APIを使ってSQLを実行
async function executeSQL() {
  try {
    console.log('🚀 マイグレーションを実行中...');
    console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
    
    // SupabaseのREST APIを使ってSQLを実行
    // 注意: SupabaseのREST APIには直接SQLを実行するエンドポイントはありません
    // 代わりに、PostgRESTのRPCエンドポイントを使用するか、
    // SupabaseダッシュボードのSQL Editorを使用する必要があります
    
    console.log('⚠️  注意: SupabaseのREST APIから直接SQLを実行することはできません');
    console.log('📝 以下の方法でマイグレーションを実行してください:');
    console.log('');
    console.log('方法1: Supabaseダッシュボードで実行（推奨）');
    console.log('  1. https://supabase.com/dashboard にログイン');
    console.log('  2. プロジェクトを選択');
    console.log('  3. SQL Editorを開く');
    console.log(`  4. 以下のSQLをコピー＆ペーストして実行`);
    console.log('');
    console.log('─'.repeat(80));
    console.log('📋 SQL内容:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('');
    console.log('方法2: Supabase CLIで実行');
    console.log('  1. supabase login でログイン');
    console.log('  2. supabase link --project-ref your-project-ref でプロジェクトをリンク');
    console.log('  3. supabase db push でマイグレーションを実行');
    console.log('');
    console.log('📄 SQLファイルの場所:');
    console.log(`   ${sqlFile}`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

executeSQL();

