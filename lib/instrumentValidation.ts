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
 * 楽器がデータベースに存在するか確認し、存在しない場合は作成を試みる
 * @param instrumentId 確認する楽器ID
 * @returns 楽器が存在する（または作成された）かどうか
 */
export async function ensureInstrumentExists(instrumentId: string): Promise<boolean> {
  // その他楽器の場合はスキップ
  if (instrumentId === OTHER_INSTRUMENT_ID) {
    return true;
  }

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
      return true;
    }

    // 楽器が存在しない場合は、デフォルト楽器データから作成を試みる
    logger.warn('楽器が存在しないため、作成を試みます', { instrumentId });

    const defaultInstruments = instrumentService.getDefaultInstruments();
    const defaultInstrument = defaultInstruments.find(inst => inst.id === instrumentId);

    if (!defaultInstrument) {
      // デフォルト楽器データにも存在しない場合はエラー
      const error = new Error(`楽器ID ${instrumentId} が存在しません`);
      logger.error('無効な楽器ID:', { instrumentId });
      throw error;
    }

    // 楽器をデータベースに作成
    const { error: createError } = await supabase
      .from('instruments')
      .upsert({
        id: defaultInstrument.id,
        name: defaultInstrument.name,
        name_en: defaultInstrument.nameEn,
        color_primary: defaultInstrument.primary,
        color_secondary: defaultInstrument.secondary,
        color_accent: defaultInstrument.accent,
      }, {
        onConflict: 'id'
      });

    if (createError) {
      logger.error('楽器作成エラー:', createError);
      const error = new Error(`楽器の作成に失敗しました: ${createError.message || 'Unknown error'}`);
      (error as any).code = createError.code;
      (error as any).status = createError.status;
      throw error;
    }

    logger.debug('楽器を作成しました', { instrumentId });
    return true;
  } catch (error) {
    logger.error('ensureInstrumentExistsエラー:', error);
    throw error;
  }
}

