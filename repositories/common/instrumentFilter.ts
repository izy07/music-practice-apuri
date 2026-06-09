/**
 * 楽器フィルタリングの統一関数
 * 
 * すべてのリポジトリで一貫した楽器フィルタリングロジックを提供します。
 * 既存データ（instrument_id = null）の後方互換性を考慮した設計です。
 */

import logger from '@/lib/logger';

// instrument_idカラムの存在をキャッシュ（グローバルスコープ）
let supportsInstrumentId: boolean | null = null;

/**
 * 特定のテーブルでinstrument_idカラムが存在するか確認
 * 
 * エラー時は適切にエラーを記録し、falseを返す（スキップしない）
 */
async function checkTableInstrumentIdSupport(tableName: string): Promise<boolean> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from(tableName)
      .select('instrument_id')
      .limit(1);
    
    if (error) {
      // カラムが存在しないエラーコード
      if (error.code === 'PGRST204' || error.code === '42703' || error.code === 'PGRST116' || 
          error.message?.includes('instrument_id') || 
          error.message?.includes('column') && error.message?.includes('does not exist')) {
        logger.error(`[instrumentFilter] ${tableName}テーブルにinstrument_idカラムが存在しません。マイグレーションを実行してください。`, {
          tableName,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          }
        });
        return false;
      }
      
      // その他のエラーも適切に記録
      logger.error(`[instrumentFilter] ${tableName}テーブルのinstrument_idカラム確認中にエラー:`, {
        tableName,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }
      });
      // エラーが発生した場合は、カラムが存在しないと判断（安全側に倒す）
      return false;
    }
    
    return true;
  } catch (error) {
    // 予期しないエラーも適切に記録
    logger.error(`[instrumentFilter] ${tableName}テーブルのinstrument_idカラム確認中に予期しないエラー:`, {
      tableName,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    // エラーが発生した場合は、カラムが存在しないと判断（安全側に倒す）
    return false;
  }
}

/**
 * instrument_idカラムの存在を確認
 */
export const checkInstrumentIdSupport = async (forceCheck: boolean = false): Promise<boolean> => {
  // 強制チェックの場合はキャッシュをクリア
  if (forceCheck) {
    supportsInstrumentId = null;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('disable_instrument_id');
      } catch (e) {
        // localStorageへのアクセスエラーは無視
      }
    }
  }

  // 既にチェック済みの場合はキャッシュを返す
  if (supportsInstrumentId !== null) {
    return supportsInstrumentId;
  }

  // localStorageのフラグを確認（優先度：低）
  if (typeof window !== 'undefined') {
    try {
      const disabled = window.localStorage.getItem('disable_instrument_id');
      if (disabled === '1') {
        supportsInstrumentId = false;
        return false;
      }
    } catch (e) {
      // localStorageへのアクセスエラーは無視
    }
  }

  // 実際にDBで確認（動的インポートで循環依存を回避）
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from('goals')
      .select('instrument_id')
      .limit(1);
    
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('instrument_id'))) {
      supportsInstrumentId = false;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('disable_instrument_id', '1');
        } catch {}
      }
      return false;
    } else {
      supportsInstrumentId = true;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem('disable_instrument_id');
        } catch {}
      }
      return true;
    }
  } catch (error) {
    // エラーが発生した場合はカラムが存在しないと判断
    supportsInstrumentId = false;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('disable_instrument_id', '1');
      } catch {}
    }
    return false;
  }
};

/**
 * 楽器フィルタ用のクエリを返す（DB問い合わせなし・スケール対応）
 *
 * SQL側の .or() がチェーンを壊すため、フィルタは行わずクエリをそのまま返します。
 * 呼び出し側では必ず filterByInstrumentIdInMemory でメモリフィルタを実行してください。
 * 大規模（10万ユーザー想定）では不要なDB往復を避けるため、ここでは同期的にクエリのみ返します。
 *
 * @param query Supabaseクエリビルダー
 * @param _instrumentId 楽器ID（未使用・API互換のため残置）
 * @param _includeLegacyNull 既存のnullを含むか（未使用・API互換のため残置）
 * @param _tableName テーブル名（未使用・API互換のため残置）
 * @returns 元のクエリ（フィルタは呼び出し側で filterByInstrumentIdInMemory を実行）
 */
export function applyInstrumentFilter<T extends any>(
  query: T,
  _instrumentId?: string | null,
  _includeLegacyNull: boolean = true,
  _tableName?: string
): Promise<T> {
  return Promise.resolve(query);
}

/**
 * 楽器フィルタリングを同期的に適用する（カラム存在確認済みの場合）
 * 
 * @param query Supabaseクエリビルダー
 * @param instrumentId 楽器ID（オプション）
 * @param supportsInstrumentId instrument_idカラムの存在確認結果
 * @param includeLegacyNull 既存のnullデータを含めるか（デフォルト: true）
 * @returns フィルタリングされたクエリ
 */
export function applyInstrumentFilterSync<T extends any>(
  query: T,
  instrumentId: string | null | undefined,
  supportsInstrumentId: boolean,
  includeLegacyNull: boolean = true
): T {
  if (!supportsInstrumentId) {
    // カラムが存在しない場合はフィルタリングをスキップ
    return query;
  }

  try {
    let filteredQuery: any = query;

    if (instrumentId) {
      if (includeLegacyNull) {
        filteredQuery = (query as any).or(`instrument_id.eq.${instrumentId},instrument_id.is.null`);
      } else {
        filteredQuery = (query as any).eq('instrument_id', instrumentId);
      }
    } else {
      filteredQuery = (query as any).is('instrument_id', null);
    }

    return filteredQuery as T;
  } catch (error: any) {
    logger.debug('[instrumentFilter] フィルタリング適用中にエラーが発生しました。フィルタリングなしで続行します:', error);
    return query;
  }
}

/**
 * 楽器フィルタリング失敗時のフォールバック処理（共通ヘルパー）
 * 
 * SQLレベルでの楽器フィルタリングが失敗した場合、TypeScript側でフィルタリングを実行します。
 * この関数は、各リポジトリで重複していたフォールバック処理を統一化したものです。
 * 
 * @param data フィルタリング対象のデータ配列
 * @param instrumentId 楽器ID（オプション）
 * @param includeLegacyNull 既存のnullデータを含めるか（デフォルト: true）
 * @returns フィルタリングされたデータ配列
 */
export function filterByInstrumentIdInMemory<T extends { instrument_id?: string | null }>(
  data: T[],
  instrumentId?: string | null,
  includeLegacyNull: boolean = true
): T[] {
  if (!data || data.length === 0) {
    return data;
  }

  if (instrumentId) {
    if (includeLegacyNull) {
      // 選択された楽器 + 既存のnullデータ（後方互換性）
      return data.filter(row =>
        row.instrument_id === instrumentId || row.instrument_id == null
      );
    } else {
      // 選択された楽器のみ（厳密な分離）
      return data.filter(row => row.instrument_id === instrumentId);
    }
  } else {
    // 楽器未選択の場合は null のみ
    return data.filter(row => row.instrument_id == null);
  }
}

/**
 * グローバルなinstrument_idサポート状態をリセット（テスト用）
 */
export function resetInstrumentIdSupport(): void {
  supportsInstrumentId = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('disable_instrument_id');
    } catch {}
  }
}
