/**
 * eventsテーブルのlocationカラムの自動確保機能
 * 
 * eventsテーブルにlocationカラムが存在しない場合、自動的に作成します。
 */

import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { isColumnNotFoundError } from '@/lib/columnErrorHandler';

// 同時実行を防ぐためのロック
let isChecking = false;
let checkPromise: Promise<boolean> | null = null;
let cachedResult: boolean | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1分間キャッシュ

/**
 * eventsテーブルにlocationカラムが存在するか確認
 * より確実な方法で確認（information_schemaを使用）
 */
async function checkLocationColumnExists(): Promise<boolean> {
  try {
    logger.debug('[ensureLocationColumn] eventsテーブルのlocationカラム存在確認を開始');
    
    // 方法1: SELECTクエリで確認（高速）
    const { error: selectError } = await supabase
      .from('events')
      .select('location')
      .limit(1);
    
    if (!selectError) {
      logger.debug('[ensureLocationColumn] ✅ eventsテーブルにlocationカラムが存在します（SELECTクエリで確認）');
      return true;
    }
    
    // エラーが発生した場合、エラーコードを確認
    logger.debug('[ensureLocationColumn] SELECTクエリでエラーが発生:', {
      errorCode: selectError.code,
      errorMessage: selectError.message,
    });
    
    // PostgREST(PGRST204) / Postgres(42703) いずれも「カラム不存在」を示す
    if (isColumnNotFoundError(selectError, 'location')) {
      logger.debug('[ensureLocationColumn] ❌ eventsテーブルにlocationカラムは存在しません');
      return false;
    }
    
    // その他のエラー（ネットワークエラー、権限エラーなど）の場合は、
    // カラムが存在する可能性があるため、trueを返す（安全側に倒す）
    logger.warn('[ensureLocationColumn] ⚠️ SELECTクエリで予期しないエラーが発生しました。カラムは存在する可能性があります:', {
      errorCode: selectError.code,
      errorMessage: selectError.message,
    });
    return true; // 安全側に倒す：エラー時はカラムが存在すると仮定
  } catch (error) {
    logger.error('[ensureLocationColumn] カラム存在確認中にエラーが発生しました:', error);
    // エラー時は安全側に倒す：カラムが存在すると仮定
    return true;
  }
}

/**
 * eventsテーブルにlocationカラムを作成（RPC関数を使用）
 */
async function ensureLocationColumnViaRPC(): Promise<boolean> {
  try {
    logger.debug('[ensureLocationColumn] eventsテーブルへのlocationカラム追加を開始（RPC関数を使用）');
    
    // RPC関数が存在する場合は使用
    const { data, error: rpcError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'location') THEN
              ALTER TABLE public.events 
              ADD COLUMN location text;
              
              COMMENT ON COLUMN public.events.location IS 'イベントの場所（例：ホール名、会場名など）';
            END IF;
          END IF;
        END $$;
      `
    });

    if (rpcError) {
      logger.error('[ensureLocationColumn] ❌ RPC関数を使用したカラム追加を試みましたが失敗:', {
        errorCode: rpcError.code,
        errorMessage: rpcError.message,
        errorDetails: rpcError.details,
        errorHint: rpcError.hint
      });
      return false;
    }

    logger.debug('[ensureLocationColumn] ✅ RPC関数によるカラム追加が成功しました', {
      rpcResult: data
    });
    return true;
  } catch (error) {
    logger.error('[ensureLocationColumn] ❌ カラム追加の試行中にエラーが発生しました:', {
      error
    });
    return false;
  }
}

/**
 * eventsテーブルにlocationカラムが存在することを確認し、存在しない場合は作成を試みる
 * 同時実行を防ぐため、シングルトンパターンで実装
 */
export async function ensureLocationColumn(): Promise<boolean> {
  // キャッシュをチェック（1分以内の結果を再利用）
  const now = Date.now();
  if (cachedResult !== null && (now - cacheTimestamp) < CACHE_DURATION) {
    logger.debug('[ensureLocationColumn] キャッシュから結果を返します:', { cachedResult });
    return cachedResult;
  }
  
  // 既にチェック中の場合は、そのPromiseを待つ
  if (isChecking && checkPromise) {
    logger.debug('[ensureLocationColumn] 既にチェック中のため、待機します');
    return await checkPromise;
  }
  
  // 新しいチェックを開始
  isChecking = true;
  checkPromise = (async (): Promise<boolean> => {
    logger.debug('[ensureLocationColumn] ========== 開始: eventsテーブル ==========');
    try {
      // まずカラムが存在するか確認
      logger.debug('[ensureLocationColumn] Step 1: eventsテーブルのlocationカラム存在確認');
      const exists = await checkLocationColumnExists();
      if (exists) {
        logger.debug('[ensureLocationColumn] ✅ eventsテーブルにlocationカラムは既に存在します');
        cachedResult = true;
        cacheTimestamp = Date.now();
        return true;
      }

      logger.warn('[ensureLocationColumn] ⚠️ eventsテーブルにlocationカラムが存在しません。追加を試みます...');
      
      // RPC関数を使用してカラムを追加
      logger.debug('[ensureLocationColumn] Step 2: eventsテーブルへのlocationカラム追加を実行');
      const added = await ensureLocationColumnViaRPC();
      
      if (added) {
        logger.info('[ensureLocationColumn] ✅ eventsテーブルにlocationカラムを追加しました');
        
        // 追加後、再度確認
        logger.debug('[ensureLocationColumn] Step 3: eventsテーブルのlocationカラム追加後の確認');
        const verified = await checkLocationColumnExists();
        if (verified) {
          logger.debug('[ensureLocationColumn] ✅ eventsテーブルのlocationカラム追加が確認されました');
          cachedResult = true;
          cacheTimestamp = Date.now();
          return true;
        } else {
          logger.warn('[ensureLocationColumn] ⚠️ eventsテーブルのlocationカラム追加後の確認に失敗しました');
          cachedResult = false;
          cacheTimestamp = Date.now();
          return false;
        }
      } else {
        logger.warn('[ensureLocationColumn] ⚠️ eventsテーブルのlocationカラムの自動追加に失敗しました。マイグレーションを実行してください。');
        // RPC関数が存在しない場合でも、カラムが存在する可能性があるため、
        // 安全側に倒してfalseを返す（アプリケーション側でlocationを除外して処理する）
        cachedResult = false;
        cacheTimestamp = Date.now();
        return false;
      }
    } catch (error) {
      logger.error('[ensureLocationColumn] ❌ エラーが発生しました:', {
        error
      });
      // エラー時は安全側に倒す：カラムが存在しないと仮定（アプリケーション側でlocationを除外して処理する）
      cachedResult = false;
      cacheTimestamp = Date.now();
      return false;
    } finally {
      logger.debug('[ensureLocationColumn] ========== 終了: eventsテーブル ==========');
      isChecking = false;
      checkPromise = null;
    }
  })();
  
  return await checkPromise;
}
