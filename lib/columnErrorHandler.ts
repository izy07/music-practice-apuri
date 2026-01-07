/**
 * カラムが存在しない場合のエラーハンドリングユーティリティ
 * 
 * Supabaseでカラムが存在しないエラー（PGRST204, 42703）が発生した場合、
 * 該当カラムを除外して再試行するためのヘルパー関数を提供します。
 */

import logger from '@/lib/logger';

/**
 * カラムが存在しないエラーかどうかを判定
 */
export function isColumnNotFoundError(error: any, columnName?: string): boolean {
  if (!error) return false;
  
  const errorCode = error.code;
  const errorMessage = error.message?.toLowerCase() || '';
  
  // 一般的なカラム不存在エラーコード
  const isColumnError = errorCode === 'PGRST204' || 
                        errorCode === '42703' || 
                        errorCode === '400';
  
  if (!isColumnError) return false;
  
  // 特定のカラム名が指定されている場合、そのカラムに関するエラーかチェック
  if (columnName) {
    return errorMessage.includes(columnName.toLowerCase()) ||
           errorMessage.includes('could not find') ||
           errorMessage.includes('schema cache') ||
           errorMessage.includes('column') && errorMessage.includes('does not exist');
  }
  
  // カラム名が指定されていない場合、一般的なカラムエラーかチェック
  return errorMessage.includes('could not find') ||
         errorMessage.includes('schema cache') ||
         errorMessage.includes('column') && errorMessage.includes('does not exist');
}

/**
 * ペイロードから指定されたカラムを除外
 */
export function excludeColumnFromPayload<T extends Record<string, any>>(
  payload: T,
  columnName: string
): Omit<T, typeof columnName> {
  const { [columnName]: _, ...rest } = payload;
  return rest;
}

/**
 * 複数のカラムを除外
 */
export function excludeColumnsFromPayload<T extends Record<string, any>>(
  payload: T,
  columnNames: string[]
): Omit<T, typeof columnNames[number]> {
  let result = { ...payload };
  for (const columnName of columnNames) {
    const { [columnName]: _, ...rest } = result;
    result = rest as T;
  }
  return result as Omit<T, typeof columnNames[number]>;
}

/**
 * エラーから存在しないカラム名を抽出（可能な場合）
 */
export function extractMissingColumnName(error: any): string | null {
  if (!error || !error.message) return null;
  
  // 大文字小文字を区別せずにマッチング（元のメッセージを使用）
  const message = error.message;
  
  // "Could not find the 'column_name' column of 'table_name' in the schema cache" パターン
  const match1 = message.match(/could not find the ['"]([^'"]+)['"] column/i);
  if (match1) {
    logger.debug(`[columnErrorHandler] extractMissingColumnName: パターン1でマッチ: ${match1[1]}`);
    return match1[1];
  }
  
  // "column 'column_name' does not exist" パターン
  const match2 = message.match(/column ['"]([^'"]+)['"] does not exist/i);
  if (match2) {
    logger.debug(`[columnErrorHandler] extractMissingColumnName: パターン2でマッチ: ${match2[1]}`);
    return match2[1];
  }
  
  // "column column_name does not exist" パターン
  const match3 = message.match(/column\s+(\w+)\s+does not exist/i);
  if (match3) {
    logger.debug(`[columnErrorHandler] extractMissingColumnName: パターン3でマッチ: ${match3[1]}`);
    return match3[1];
  }
  
  logger.debug(`[columnErrorHandler] extractMissingColumnName: マッチするパターンが見つかりませんでした`, {
    errorMessage: error.message
  });
  return null;
}

/**
 * カラムエラーを処理し、該当カラムを除外したペイロードを返す
 * 
 * @param error エラーオブジェクト
 * @param payload 元のペイロード
 * @param optionalColumns オプショナルカラムのリスト（この順序で除外を試行）
 * @returns 除外後のペイロード、またはnull（エラーがカラムエラーでない場合）
 */
export function handleColumnError<T extends Record<string, any>>(
  error: any,
  payload: T,
  optionalColumns: string[] = []
): { payload: Omit<T, string>; excludedColumns: string[] } | null {
  if (!isColumnNotFoundError(error)) {
    logger.debug(`[columnErrorHandler] handleColumnError: カラムエラーではありません`, {
      errorCode: error?.code,
      errorMessage: error?.message
    });
    return null;
  }
  
  logger.debug(`[columnErrorHandler] handleColumnError: カラムエラーを検出`, {
    errorCode: error.code,
    errorMessage: error.message,
    optionalColumns
  });
  
  const excludedColumns: string[] = [];
  let currentPayload: any = { ...payload };
  
  // エラーメッセージから存在しないカラム名を抽出
  const missingColumn = extractMissingColumnName(error);
  logger.debug(`[columnErrorHandler] handleColumnError: 抽出されたカラム名`, {
    missingColumn,
    optionalColumns
  });
  
  // 特定のカラムが指定されている場合、それを優先的に除外
  if (missingColumn && optionalColumns.includes(missingColumn)) {
    currentPayload = excludeColumnFromPayload(currentPayload, missingColumn);
    excludedColumns.push(missingColumn);
    logger.warn(`[columnErrorHandler] カラム '${missingColumn}' が存在しないため除外しました`, {
      errorCode: error.code,
      errorMessage: error.message,
      excludedColumn: missingColumn
    });
    return { payload: currentPayload, excludedColumns };
  }
  
  // オプショナルカラムのリストから順に除外を試行
  for (const columnName of optionalColumns) {
    const messageLower = error.message?.toLowerCase() || '';
    const columnNameLower = columnName.toLowerCase();
    if (messageLower.includes(columnNameLower)) {
      currentPayload = excludeColumnFromPayload(currentPayload, columnName);
      excludedColumns.push(columnName);
      logger.warn(`[columnErrorHandler] カラム '${columnName}' が存在しないため除外しました`, {
        errorCode: error.code,
        errorMessage: error.message,
        excludedColumn: columnName
      });
      return { payload: currentPayload, excludedColumns };
    }
  }
  
  // カラム名が特定できない場合でも、オプショナルカラムが1つだけの場合はそれを除外
  if (optionalColumns.length === 1) {
    const columnName = optionalColumns[0];
    currentPayload = excludeColumnFromPayload(currentPayload, columnName);
    excludedColumns.push(columnName);
    logger.warn(`[columnErrorHandler] カラム名を特定できませんでしたが、オプショナルカラム '${columnName}' を除外します`, {
      errorCode: error.code,
      errorMessage: error.message,
      excludedColumn: columnName
    });
    return { payload: currentPayload, excludedColumns };
  }
  
  // カラム名が特定できない場合、一般的なカラムエラーとして扱う
  logger.warn(`[columnErrorHandler] カラムエラーを検出しましたが、特定のカラムを識別できませんでした`, {
    errorCode: error.code,
    errorMessage: error.message,
    optionalColumns
  });
  
  return null;
}

