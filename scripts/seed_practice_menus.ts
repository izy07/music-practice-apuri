/**
 * 基礎練メニューをデータベースに登録するスクリプト
 * フォールバックデータ（_instrumentSpecificMenus.ts）から楽器別メニューを読み込んで登録
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { instrumentSpecificMenus } from '../lib/tabs/basic-practice/data/_instrumentSpecificMenus';
import { getInstrumentIdFromKey } from '../lib/instrumentUtils';
import logger from '../lib/logger';

// 環境変数を読み込む
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 楽器キー（'piano', 'violin'など）からデータベースの楽器ID（UUID）を取得
 * アプリケーション側の固定UUIDを使用
 */
function getInstrumentUuidFromKey(instrumentKey: string): string | null {
  return getInstrumentIdFromKey(instrumentKey);
}

/**
 * メニューをデータベースに登録
 */
async function seedPracticeMenus() {
  console.log('基礎練メニューの登録を開始します...');

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // 各楽器のメニューを処理
  for (const [instrumentKey, menus] of Object.entries(instrumentSpecificMenus)) {
    const instrumentUuid = getInstrumentUuidFromKey(instrumentKey);
    
    if (!instrumentUuid) {
      console.warn(`楽器キー "${instrumentKey}" に対応するUUIDが見つかりません。スキップします。`);
      totalSkipped += menus.length;
      continue;
    }

    console.log(`\n楽器: ${instrumentKey} (UUID: ${instrumentUuid}) - ${menus.length}件のメニューを処理中...`);

    for (let i = 0; i < menus.length; i++) {
      const menu = menus[i];
      
      try {
        // 既存のメニューをチェック（idで）
        const { data: existing } = await supabase
          .from('practice_menus')
          .select('id')
          .eq('id', menu.id)
          .maybeSingle();

        if (existing) {
          // 既存のメニューを更新
          const { error: updateError } = await supabase
            .from('practice_menus')
            .update({
              instrument_id: instrumentUuid,
              title: menu.title,
              description: menu.description || null,
              difficulty: menu.difficulty,
              points: menu.points || [],
              how_to_practice: menu.howToPractice || [],
              recommended_tempo: menu.recommendedTempo || null,
              duration: menu.duration || null,
              tips: menu.tips || [],
              video_url: menu.videoUrl || null,
              display_order: i,
              updated_at: new Date().toISOString(),
            })
            .eq('id', menu.id);

          if (updateError) {
            console.error(`  メニュー "${menu.title}" の更新に失敗:`, updateError.message);
            totalErrors++;
          } else {
            console.log(`  ✓ 更新: ${menu.title}`);
            totalInserted++;
          }
        } else {
          // 新規メニューを挿入
          const { error: insertError } = await supabase
            .from('practice_menus')
            .insert({
              id: menu.id,
              instrument_id: instrumentUuid,
              title: menu.title,
              description: menu.description || null,
              difficulty: menu.difficulty,
              points: menu.points || [],
              how_to_practice: menu.howToPractice || [],
              recommended_tempo: menu.recommendedTempo || null,
              duration: menu.duration || null,
              tips: menu.tips || [],
              video_url: menu.videoUrl || null,
              display_order: i,
            });

          if (insertError) {
            console.error(`  メニュー "${menu.title}" の挿入に失敗:`, insertError.message);
            totalErrors++;
          } else {
            console.log(`  ✓ 挿入: ${menu.title}`);
            totalInserted++;
          }
        }
      } catch (error: any) {
        console.error(`  メニュー "${menu.title}" の処理中にエラー:`, error.message);
        totalErrors++;
      }
    }
  }

  console.log('\n=== 登録完了 ===');
  console.log(`挿入/更新: ${totalInserted}件`);
  console.log(`スキップ: ${totalSkipped}件`);
  console.log(`エラー: ${totalErrors}件`);
}

// スクリプトを実行
seedPracticeMenus()
  .then(() => {
    console.log('\n基礎練メニューの登録が完了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });

