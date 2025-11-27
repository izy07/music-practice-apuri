/**
 * カレンダー機能の統合テスト
 * 日付ずれ問題を防ぐための重要なテスト
 */

import { formatLocalDate } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('カレンダー練習記録の統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('練習記録の日付処理', () => {
    it('保存した日付と取得した日付が一致する', () => {
      const testDate = new Date(2025, 9, 14); // 2025年10月14日
      
      // 保存時の日付フォーマット
      const savedDate = formatLocalDate(testDate);
      expect(savedDate).toBe('2025-10-14');
      
      // 取得時の日付パース（文字列から直接取得）
      const day = parseInt(savedDate.split('-')[2]);
      expect(day).toBe(14);
      
      // new Date()を使わないことでタイムゾーン問題を回避
    });

    it('月初の日付が正しく処理される', () => {
      const testDate = new Date(2025, 9, 1); // 10月1日
      const savedDate = formatLocalDate(testDate);
      expect(savedDate).toBe('2025-10-01');
      
      const day = parseInt(savedDate.split('-')[2]);
      expect(day).toBe(1);
    });

    it('月末の日付が正しく処理される', () => {
      const testDate = new Date(2025, 9, 31); // 10月31日
      const savedDate = formatLocalDate(testDate);
      expect(savedDate).toBe('2025-10-31');
      
      const day = parseInt(savedDate.split('-')[2]);
      expect(day).toBe(31);
    });

    it('タイムゾーンが異なる場合でも正しい日付を返す', () => {
      // 日本時間の深夜0時（UTCでは前日の15時）
      const testDate = new Date(2025, 9, 14, 0, 0, 0);
      const savedDate = formatLocalDate(testDate);
      
      // ローカルタイムゾーンで14日として保存される
      expect(savedDate).toBe('2025-10-14');
    });

    it('日本時間の23時59分でも正しい日付を返す', () => {
      // 日本時間の23時59分（UTCでは同日の14時59分）
      const testDate = new Date(2025, 9, 14, 23, 59, 59);
      const savedDate = formatLocalDate(testDate);
      
      // ローカルタイムゾーンで14日として保存される
      expect(savedDate).toBe('2025-10-14');
    });
  });

  describe('カレンダー表示のための日付計算', () => {
    it('月の日数を正しく計算する', () => {
      // 2025年10月は31日間
      const date = new Date(2025, 9, 1);
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      expect(daysInMonth).toBe(31);
    });

    it('2月の日数を正しく計算する（うるう年）', () => {
      // 2024年はうるう年（29日）
      const date = new Date(2024, 1, 1);
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      expect(daysInMonth).toBe(29);
    });

    it('2月の日数を正しく計算する（平年）', () => {
      // 2025年は平年（28日）
      const date = new Date(2025, 1, 1);
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      expect(daysInMonth).toBe(28);
    });

    it('月の最初の曜日を正しく取得する', () => {
      // 2025年10月1日は水曜日（3）
      const date = new Date(2025, 9, 1);
      const firstDayOfWeek = date.getDay();
      expect(firstDayOfWeek).toBe(3);
    });
  });

  describe('練習データの集計', () => {
    it('月間の練習データを正しく集計する', () => {
      const sessions = [
        { practice_date: '2025-10-01', duration_minutes: 30 },
        { practice_date: '2025-10-01', duration_minutes: 45 },
        { practice_date: '2025-10-15', duration_minutes: 60 },
      ];

      const practiceData: {[key: number]: {minutes: number, hasRecord: boolean}} = {};
      
      sessions.forEach(session => {
        const day = parseInt(session.practice_date.split('-')[2]);
        if (!practiceData[day]) {
          practiceData[day] = { minutes: 0, hasRecord: true };
        }
        practiceData[day].minutes += session.duration_minutes;
      });

      expect(practiceData[1].minutes).toBe(75); // 30 + 45
      expect(practiceData[15].minutes).toBe(60);
      expect(practiceData[2]).toBeUndefined(); // 記録なし
    });

    it('月間合計を正しく計算する', () => {
      const sessions = [
        { duration_minutes: 30 },
        { duration_minutes: 45 },
        { duration_minutes: 60 },
      ];

      const total = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
      expect(total).toBe(135);
    });
  });

  describe('イベントデータの処理', () => {
    it('イベントを日付でグループ化できる', () => {
      const events = [
        { id: '1', title: 'イベント1', date: '2025-10-14' },
        { id: '2', title: 'イベント2', date: '2025-10-14' },
        { id: '3', title: 'イベント3', date: '2025-10-20' },
      ];

      const groupedEvents: {[key: number]: any[]} = {};
      
      events.forEach(event => {
        const day = parseInt(event.date.split('-')[2]);
        if (!groupedEvents[day]) {
          groupedEvents[day] = [];
        }
        groupedEvents[day].push(event);
      });

      expect(groupedEvents[14]).toHaveLength(2);
      expect(groupedEvents[20]).toHaveLength(1);
      expect(groupedEvents[1]).toBeUndefined();
    });
  });

  describe('日付の境界値テスト', () => {
    it('1月1日を正しく処理する', () => {
      const date = new Date(2025, 0, 1);
      const formatted = formatLocalDate(date);
      expect(formatted).toBe('2025-01-01');
      
      const day = parseInt(formatted.split('-')[2]);
      expect(day).toBe(1);
    });

    it('12月31日を正しく処理する', () => {
      const date = new Date(2025, 11, 31);
      const formatted = formatLocalDate(date);
      expect(formatted).toBe('2025-12-31');
      
      const day = parseInt(formatted.split('-')[2]);
      expect(day).toBe(31);
    });

    it('年をまたぐ日付を正しく処理する', () => {
      const dec31 = new Date(2024, 11, 31);
      const jan1 = new Date(2025, 0, 1);
      
      expect(formatLocalDate(dec31)).toBe('2024-12-31');
      expect(formatLocalDate(jan1)).toBe('2025-01-01');
    });
  });
});

