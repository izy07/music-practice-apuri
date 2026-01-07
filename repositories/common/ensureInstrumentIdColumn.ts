/**
 * instrument_idカラムの自動確保機能
 * 
 * 各テーブルにinstrument_idカラムが存在しない場合、自動的に作成します。
 */

import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';

/**
 * テーブルにinstrument_idカラムが存在するか確認
 */
async function checkColumnExists(tableName: string): Promise<boolean> {
  try {
    logger.debug(`[ensureInstrumentIdColumn] ${tableName}テーブルのinstrument_idカラム存在確認を開始`);
    const { error } = await supabase
      .from(tableName)
      .select('instrument_id')
      .limit(1);
    
    if (error) {
      logger.debug(`[ensureInstrumentIdColumn] ${tableName}テーブルのinstrument_idカラム確認結果:`, {
        errorCode: error.code,
        errorMessage: error.message,
        exists: !(error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('instrument_id'))
      });
      
      if (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('instrument_id')) {
        logger.debug(`[ensureInstrumentIdColumn] ❌ ${tableName}テーブルにinstrument_idカラムは存在しません`);
        return false;
      }
    }
    
    logger.debug(`[ensureInstrumentIdColumn] ✅ ${tableName}テーブルにinstrument_idカラムが存在します`);
    return true;
  } catch (error) {
    logger.error(`[ensureInstrumentIdColumn] ${tableName}テーブルのinstrument_idカラム確認中にエラー:`, error);
    return false;
  }
}

/**
 * テーブルにinstrument_idカラムを作成（RPC関数を使用）
 */
async function ensureColumnViaRPC(tableName: string): Promise<boolean> {
  try {
    logger.debug(`[ensureInstrumentIdColumn] ${tableName}テーブルへのinstrument_idカラム追加を開始（RPC関数を使用）`);
    
    // RPC関数が存在する場合は使用
    const { data, error: rpcError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}' AND column_name = 'instrument_id') THEN
              ALTER TABLE public.${tableName} 
              ADD COLUMN instrument_id uuid REFERENCES public.instruments(id) ON DELETE SET NULL;
              
              COMMENT ON COLUMN public.${tableName}.instrument_id IS '楽器ID（楽器ごとにデータを分けて管理）';
              
              CREATE INDEX IF NOT EXISTS idx_${tableName}_instrument_id ON public.${tableName}(instrument_id);
            END IF;
          END IF;
        END $$;
      `
    });

    if (rpcError) {
      logger.error(`[ensureInstrumentIdColumn] ❌ RPC関数を使用したカラム追加を試みましたが失敗:`, {
        tableName,
        errorCode: rpcError.code,
        errorMessage: rpcError.message,
        errorDetails: rpcError.details,
        errorHint: rpcError.hint
      });
      return false;
    }

    logger.debug(`[ensureInstrumentIdColumn] ✅ RPC関数によるカラム追加が成功しました`, {
      tableName,
      rpcResult: data
    });
    return true;
  } catch (error) {
    logger.error(`[ensureInstrumentIdColumn] ❌ カラム追加の試行中にエラーが発生しました:`, {
      tableName,
      error
    });
    return false;
  }
}

/**
 * テーブルにinstrument_idカラムが存在することを確認し、存在しない場合は作成を試みる
 */
export async function ensureInstrumentIdColumn(tableName: string): Promise<boolean> {
  logger.debug(`[ensureInstrumentIdColumn] ========== 開始: ${tableName}テーブル ==========`);
  try {
    // まずカラムが存在するか確認
    logger.debug(`[ensureInstrumentIdColumn] Step 1: ${tableName}テーブルのinstrument_idカラム存在確認`);
    const exists = await checkColumnExists(tableName);
    if (exists) {
      logger.debug(`[ensureInstrumentIdColumn] ✅ ${tableName}テーブルにinstrument_idカラムは既に存在します`);
      return true;
    }

    logger.warn(`[ensureInstrumentIdColumn] ⚠️ ${tableName}テーブルにinstrument_idカラムが存在しません。追加を試みます...`);
    
    // RPC関数を使用してカラムを追加
    logger.debug(`[ensureInstrumentIdColumn] Step 2: ${tableName}テーブルへのinstrument_idカラム追加を実行`);
    const added = await ensureColumnViaRPC(tableName);
    
    if (added) {
      logger.info(`[ensureInstrumentIdColumn] ✅ ${tableName}テーブルにinstrument_idカラムを追加しました`);
      
      // 追加後、再度確認
      logger.debug(`[ensureInstrumentIdColumn] Step 3: ${tableName}テーブルのinstrument_idカラム追加後の確認`);
      const verified = await checkColumnExists(tableName);
      if (verified) {
        logger.debug(`[ensureInstrumentIdColumn] ✅ ${tableName}テーブルのinstrument_idカラム追加が確認されました`);
        return true;
      } else {
        logger.warn(`[ensureInstrumentIdColumn] ⚠️ ${tableName}テーブルのinstrument_idカラム追加後の確認に失敗しました`);
        return false;
      }
    } else {
      logger.warn(`[ensureInstrumentIdColumn] ⚠️ ${tableName}テーブルのinstrument_idカラムの自動追加に失敗しました。マイグレーションを実行してください。`);
      return false;
    }
  } catch (error) {
    logger.error(`[ensureInstrumentIdColumn] ❌ エラーが発生しました:`, {
      tableName,
      error
    });
    return false;
  } finally {
    logger.debug(`[ensureInstrumentIdColumn] ========== 終了: ${tableName}テーブル ==========`);
  }
}
