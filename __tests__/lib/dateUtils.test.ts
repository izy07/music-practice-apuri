/**
 * dateUtils.ts のテスト
 * 練習記録の日付ずれ問題を防ぐための重要なテスト
 */

import { formatLocalDate } from '@/lib/dateUtils';

describe('formatLocalDate', () => {
  it('正しいフォーマットでローカル日付を返す', () => {
    const date = new Date(2025, 9, 14); // 2025年10月14日
    const result = formatLocalDate(date);
    expect(result).toBe('2025-10-14');
  });

  it('1桁の月と日をゼロパディングする', () => {
    const date = new Date(2025, 0, 5); // 2025年1月5日
    const result = formatLocalDate(date);
    expect(result).toBe('2025-01-05');
  });

  it('12月31日を正しく処理する', () => {
    const date = new Date(2025, 11, 31); // 2025年12月31日
    const result = formatLocalDate(date);
    expect(result).toBe('2025-12-31');
  });

  it('タイムゾーンに関係なくローカル日付を返す', () => {
    // UTCとローカルタイムゾーンが異なる場合でも正しく処理
    const date = new Date(2025, 9, 14, 23, 59); // 2025年10月14日 23:59
    const result = formatLocalDate(date);
    expect(result).toBe('2025-10-14');
  });

  it('日付の境界をまたいでも正しい日付を返す', () => {
    // 深夜0時付近でも正しく動作
    const date = new Date(2025, 9, 14, 0, 0); // 2025年10月14日 00:00
    const result = formatLocalDate(date);
    expect(result).toBe('2025-10-14');
  });
});

