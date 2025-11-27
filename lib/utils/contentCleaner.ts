/**
 * 練習記録のcontentフィールドから時間詳細を削除するユーティリティ
 * 複数の場所で使用される共通ロジック
 */

/**
 * contentフィールドから時間詳細を削除
 * 「（累計XX分）」「累計XX分」「+ XX分」「XX分」などの時間表現を削除
 */
export function cleanContentFromTimeDetails(content: string | null | undefined): string {
  if (!content) {
    return '';
  }

  return content
    .replace(/\s*\(累計\d+分\)/g, '') // 「（累計XX分）」を削除
    .replace(/\s*累計\d+分/g, '') // 「累計XX分」を削除
    .replace(/\s*\+\s*[^,]+?\d+分/g, '') // 「+ XX分」を削除
    .replace(/\s*[^,]+?\d+分/g, '') // 「XX分」を含む文字列を削除
    .replace(/練習記録/g, '') // 「練習記録」を削除
    .replace(/^[\s,]+|[\s,]+$/g, '') // 前後のカンマとスペースを削除
    .replace(/,\s*,/g, ',') // 連続するカンマを1つに
    .trim();
}

/**
 * contentフィールドに新しい内容を追加（時間詳細なし）
 */
export function appendToContent(
  existingContent: string | null | undefined,
  newContent: string
): string {
  const cleaned = cleanContentFromTimeDetails(existingContent);
  
  if (!cleaned) {
    return newContent;
  }
  
  return `${cleaned}, ${newContent}`;
}

