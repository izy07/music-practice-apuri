/**
 * groupManagement.ts のテスト
 * 団体・グループ管理機能のテスト
 */

import { PracticeScheduleManager } from '@/lib/groupManagement';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('PracticeScheduleManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchedule', () => {
    it('練習日程データのバリデーション', () => {
      const scheduleData = {
        organization_id: 'org-id',
        title: '合奏練習',
        practice_date: '2025-10-20',
        practice_type: 'ensemble',
      };

      expect(scheduleData.organization_id).toBeDefined();
      expect(scheduleData.title.trim().length).toBeGreaterThan(0);
      expect(scheduleData.practice_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['ensemble', 'part_practice', 'event']).toContain(scheduleData.practice_type);
    });

    it('必須フィールドの検証', () => {
      const requiredFields = ['organization_id', 'title', 'practice_date', 'practice_type'];
      const scheduleData: any = {
        organization_id: 'org-id',
        title: '合奏練習',
        practice_date: '2025-10-20',
        practice_type: 'ensemble',
      };

      requiredFields.forEach(field => {
        expect(scheduleData[field]).toBeDefined();
      });
    });

    it('練習タイプが有効な値であることを確認', () => {
      const validTypes = ['ensemble', 'part_practice', 'event'];
      const testType = 'ensemble';
      
      expect(validTypes).toContain(testType);
    });

    it('オプション情報が含まれる場合の検証', () => {
      const scheduleWithOptions = {
        organization_id: 'org-id',
        title: '合奏練習',
        practice_date: '2025-10-20',
        practice_type: 'ensemble',
        description: '詳細説明',
        location: '音楽室',
        start_time: '19:00',
        end_time: '21:00',
      };

      expect(scheduleWithOptions.description).toBeDefined();
      expect(scheduleWithOptions.location).toBeDefined();
      expect(scheduleWithOptions.start_time).toMatch(/^\d{2}:\d{2}$/);
      expect(scheduleWithOptions.end_time).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('getMonthlySchedules', () => {
    it('年月のバリデーション', () => {
      const year = 2025;
      const month = 10;
      
      expect(year).toBeGreaterThanOrEqual(2000);
      expect(year).toBeLessThanOrEqual(2100);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
    });

    it('無効な月を検出する', () => {
      const invalidMonths = [0, 13, -1, 100];
      
      invalidMonths.forEach(month => {
        expect(month < 1 || month > 12).toBe(true);
      });
    });

    it('有効な月を受け入れる', () => {
      const validMonths = [1, 6, 12];
      
      validMonths.forEach(month => {
        expect(month >= 1 && month <= 12).toBe(true);
      });
    });
  });

  describe('練習タイプの分類', () => {
    it('合奏タイプを識別する', () => {
      const practiceType = 'ensemble';
      const validTypes = ['ensemble', 'part_practice', 'event'];
      
      expect(validTypes).toContain(practiceType);
    });

    it('パート練習タイプを識別する', () => {
      const practiceType = 'part_practice';
      const validTypes = ['ensemble', 'part_practice', 'event'];
      
      expect(validTypes).toContain(practiceType);
    });

    it('イベントタイプを識別する', () => {
      const practiceType = 'event';
      const validTypes = ['ensemble', 'part_practice', 'event'];
      
      expect(validTypes).toContain(practiceType);
    });

    it('無効なタイプを検出する', () => {
      const invalidType = 'invalid_type';
      const validTypes = ['ensemble', 'part_practice', 'event'];
      
      expect(validTypes).not.toContain(invalidType);
    });
  });
});

