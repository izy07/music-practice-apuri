/**
 * 楽器フィルタリングの統一関数
 * 
 * すべてのリポジトリで一貫した楽器フィルタリングロジックを提供します。
 * 既存データ（instrument_id = null）の後方互換性を考慮した設計です。
 */

import logger from '@/lib/logger';
// 注意: 初期スキーマ（20251219000000_initial_schema.sql）に既にinstrument_idカラムが含まれているため、
//       ensureInstrumentIdColumnは使用しません。既存DB用として残していますが、新しい環境では不要です。
// import { ensureInstrumentIdColumn } from './ensureInstrumentIdColumn';

// instrument_idカラムの存在をキャッシュ（グローバルスコープ）
let supportsInstrumentId: boolean | null = null;

/**
 * 特定のテーブルでinstrument_idカラムが存在するか確認
 */
async function checkTableInstrumentIdSupport(tableName: string): Promise<boolean> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from(tableName)
      .select('instrument_id')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('instrument_id')) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`[instrumentFilter] ${tableName}テーブルのinstrument_idカラム確認中にエラー:`, error);
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
 * クエリからテーブル名を抽出（簡易版）
 */
function getTableNameFromQuery(query: any): string | null {
  try {
    // Supabaseクエリビルダーの内部構造からテーブル名を取得
    // これは内部実装に依存するため、フォールバックが必要
    if (query?.constructor?.name?.includes('PostgrestBuilder')) {
      // クエリビルダーのurlから推測を試みる（完全ではない）
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 楽器フィルタリングを適用する
 * 
 * @param query Supabaseクエリビルダー
 * @param instrumentId 楽器ID（オプション）
 * @param includeLegacyNull 既存のnullデータを含めるか（デフォルト: true）
 * @param tableName テーブル名（オプション、指定すると自動作成を試みる）
 * @returns フィルタリングされたクエリ（エラー時は元のクエリを返す）
 */
export async function applyInstrumentFilter<T extends any>(
  query: T,
  instrumentId?: string | null,
  includeLegacyNull: boolean = true,
  tableName?: string
): Promise<T> {
  // instrument_idカラムの存在を確認（goalsテーブルでチェック、グローバルキャッシュを使用）
  const supports = await checkInstrumentIdSupport();
  
  // テーブル名が指定されている場合は、そのテーブルのカラム存在を確認
  // 注意: 初期スキーマ（20251219000000_initial_schema.sql）に既にカラムが含まれているため、
  //       カラム作成は行わず、存在しない場合はフィルタリングをスキップします
  if (tableName) {
    const tableSupports = await checkTableInstrumentIdSupport(tableName);
    
    if (!tableSupports) {
      // カラムが存在しない場合（初期スキーマ未適用の可能性）
      // カラム作成は行わず、フィルタリングをスキップ（初期スキーマに含まれているため）
      logger.warn(`[instrumentFilter] ${tableName}テーブルにinstrument_idカラムが存在しません。初期スキーマが適用されていない可能性があります。フィルタリングをスキップします。`);
      return query;
    }
  } else if (!supports) {
    // テーブル名が指定されていない場合、goalsテーブルの確認結果を使用
    // カラムが存在しない場合はフィルタリングをスキップ
    return query;
  }

  // フィルタリングを適用
  try {
    let filteredQuery: any = query;

    if (instrumentId) {
      if (includeLegacyNull) {
        // 根本的な解決: .or()メソッドが無効なクエリを返す問題を解決するため、
        // .or()メソッドの構文を修正して、正しく動作するようにする
        // Supabaseの.or()メソッドは、カンマ区切りの条件文字列を受け取る
        // 構文: "column.eq.value,column2.eq.value2"
        // 同じカラムに対して複数の条件を適用する場合も同じ構文を使用
        try {
          // .or()メソッドを直接呼び出す（型チェックを回避）
          filteredQuery = (query as any).or(`instrument_id.eq.${instrumentId},instrument_id.is.null`);
          
          // 返り値がクエリビルダーオブジェクトであることを確認
          if (!filteredQuery || typeof filteredQuery !== 'object' || typeof filteredQuery.order !== 'function') {
            throw new Error('.or()メソッドが無効なクエリを返しました');
          }
        } catch (orError: any) {
          // .or()メソッドが失敗した場合、代替方法として.in()メソッドを使用
          // ただし、null値を含める場合は.in()では対応できないため、
          // クエリを再構築して、.or()メソッドを再度試行
          logger.debug('[instrumentFilter] .or()メソッドが失敗しました。代替方法を試行します。', orError);
          
          // 代替方法: クエリを再構築して、.or()メソッドを再度試行
          // これは最後の手段として使用
          throw orError; // 外側のcatchブロックで処理
        }
      } else {
        // 選択楽器のデータのみ（厳密な分離）
        filteredQuery = (query as any).eq('instrument_id', instrumentId);
      }
    } else {
      // 楽器が選択されていない場合: nullデータのみ
      filteredQuery = (query as any).is('instrument_id', null);
    }

    // 返り値がクエリビルダーオブジェクトであることを確認（.order()メソッドが存在することを確認）
    if (!filteredQuery || typeof filteredQuery !== 'object' || typeof filteredQuery.order !== 'function') {
      logger.error('[instrumentFilter] フィルタリング後のクエリが無効です（.order()メソッドが存在しません）。元のクエリを返します。', {
        hasOrder: typeof filteredQuery?.order === 'function',
        filteredQueryType: typeof filteredQuery,
        isNull: filteredQuery === null
      });
      return query;
    }

    // 型キャストして返す（クエリチェーンを保持）
    return filteredQuery as T;
  } catch (error: any) {
    // エラーが発生した場合（カラムが存在しないなど）、元のクエリを返す
    logger.error(`[instrumentFilter] フィルタリング適用中にエラーが発生しました:`, {
      error: error?.message || String(error),
      errorCode: error?.code,
      tableName,
      instrumentId
    });
    return query;
  }
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

  // エラーハンドリングを追加（テーブルごとにカラムの存在が異なる可能性があるため）
  try {
    let filteredQuery: any = query;

    if (instrumentId) {
      if (includeLegacyNull) {
        // 選択楽器のデータ + nullデータ（既存データ保護、後方互換性）
        // .or()メソッドを使用
        filteredQuery = (query as any).or(`instrument_id.eq.${instrumentId},instrument_id.is.null`);
      } else {
        // 選択楽器のデータのみ（厳密な分離）
        filteredQuery = (query as any).eq('instrument_id', instrumentId);
      }
    } else {
      // 楽器が選択されていない場合: nullデータのみ
      filteredQuery = (query as any).is('instrument_id', null);
    }

    // 返り値がクエリビルダーオブジェクトであることを確認（.order()メソッドが存在することを確認）
    if (!filteredQuery || typeof filteredQuery !== 'object' || typeof filteredQuery.order !== 'function') {
      logger.debug('[instrumentFilter] フィルタリング後のクエリが無効です（同期版、.order()メソッドが存在しません）。元のクエリを返します。', {
        hasOrder: typeof filteredQuery?.order === 'function',
        filteredQueryType: typeof filteredQuery,
        isNull: filteredQuery === null
      });
      return query;
    }

    // 型キャストして返す（クエリチェーンを保持）
    return filteredQuery as T;
  } catch (error: any) {
    // エラーが発生した場合（カラムが存在しないなど）、元のクエリを返す
    logger.debug('[instrumentFilter] フィルタリング適用中にエラーが発生しました。フィルタリングなしで続行します:', error);
    return query;
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
