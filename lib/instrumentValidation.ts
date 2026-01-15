/**
 * 楽器検証用の共通ユーティリティ関数
 * 楽器データ取得・検証ロジックを1箇所に集約
 */

import { supabase } from '@/lib/supabase';
import { instrumentService } from '@/services';
import logger from '@/lib/logger';

const OTHER_INSTRUMENT_ID = '550e8400-e29b-41d4-a716-446655440016';

/**
 * 楽器IDが有効かどうかを検証
 * @param instrumentId 検証する楽器ID
 * @returns 有効な楽器IDかどうか
 */
export function isValidInstrumentId(instrumentId: string | null | undefined): boolean {
  if (!instrumentId) return false;
  // その他楽器のIDは常に有効
  if (instrumentId === OTHER_INSTRUMENT_ID) return true;
  // デフォルト楽器リストに含まれているか確認
  const defaultInstruments = instrumentService.getDefaultInstruments();
  return defaultInstruments.some(inst => inst.id === instrumentId);
}

/**
 * 楽器がデータベースに存在するか確認する
 * 注意: 楽器の作成は試みません（RLSポリシーにより通常ユーザーは作成不可）
 * @param instrumentId 確認する楽器ID
 * @returns 楽器が存在するかどうか
 */
export async function ensureInstrumentExists(instrumentId: string): Promise<boolean> {
  try {
    // データベースで楽器の存在確認
    const { data: instrumentExists, error: checkError } = await supabase
      .from('instruments')
      .select('id')
      .eq('id', instrumentId)
      .maybeSingle();

    if (checkError) {
      logger.error('楽器存在確認エラー:', checkError);
      throw checkError;
    }

    // 楽器が存在する場合は成功
    if (instrumentExists) {
      logger.debug('楽器が存在します', { instrumentId });
      return true;
    }

    // 楽器が存在しない場合は警告を出して続行
    // 楽器は管理者が事前に作成すべきマスターデータのため、通常ユーザーは作成できません
    logger.warn('楽器がデータベースに存在しません。管理者に連絡して楽器を作成してもらってください。', { 
      instrumentId,
      hint: '楽器は管理者が事前に作成すべきマスターデータです。RLSポリシーにより通常ユーザーは作成できません。'
    });
    
    // 楽器が存在しない場合でも、外部キー制約エラーが発生する可能性があるため、
    // 呼び出し元で適切に処理できるようにfalseを返す
    return false;
  } catch (error) {
    logger.error('ensureInstrumentExistsエラー:', error);
    throw error;
  }
}

