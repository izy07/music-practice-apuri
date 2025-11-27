/**
 * practiceServiceのテスト
 */

import { practiceService } from '@/services/practiceService';
import * as practiceSessionRepository from '@/repositories/practiceSessionRepository';

// モック
jest.mock('@/repositories/practiceSessionRepository');
jest.mock('@/lib/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('practiceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodaySessions', () => {
    it('正常に今日のセッションを取得できる', async () => {
      const mockSessions = [
        { id: '1', duration_minutes: 30, practice_date: '2024-01-01' },
        { id: '2', duration_minutes: 45, practice_date: '2024-01-01' },
      ];

      (practiceSessionRepository.getTodayPracticeSessions as jest.Mock).mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      const result = await practiceService.getTodaySessions('test-user-id', 'test-instrument-id');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessions);
      expect(practiceSessionRepository.getTodayPracticeSessions).toHaveBeenCalledWith(
        'test-user-id',
        'test-instrument-id'
      );
    });

    it('エラーが発生した場合はエラーを返す', async () => {
      const mockError = new Error('Database error');
      (practiceSessionRepository.getTodayPracticeSessions as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await practiceService.getTodaySessions('test-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('saveSession', () => {
    it('正常にセッションを保存できる', async () => {
      (practiceSessionRepository.savePracticeSessionWithIntegration as jest.Mock).mockResolvedValue({
        success: true,
        error: null,
      });

      const result = await practiceService.saveSession({
        userId: 'test-user-id',
        minutes: 30,
        content: '練習記録',
        inputMethod: 'manual',
      });

      expect(result.success).toBe(true);
      expect(practiceSessionRepository.savePracticeSessionWithIntegration).toHaveBeenCalled();
    });

    it('バリデーションエラー: 0分以下の場合はエラーを返す', async () => {
      const result = await practiceService.saveSession({
        userId: 'test-user-id',
        minutes: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('1分以上');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('バリデーションエラー: 1440分を超える場合はエラーを返す', async () => {
      const result = await practiceService.saveSession({
        userId: 'test-user-id',
        minutes: 1441,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('1440分');
      expect(result.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('getSessionsByDateRange', () => {
    it('正常に期間指定でセッションを取得できる', async () => {
      const mockSessions = [
        { id: '1', duration_minutes: 30, practice_date: '2024-01-01' },
        { id: '2', duration_minutes: 45, practice_date: '2024-01-02' },
      ];

      (practiceSessionRepository.getPracticeSessionsByDateRange as jest.Mock).mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      const result = await practiceService.getSessionsByDateRange(
        'test-user-id',
        '2024-01-01',
        '2024-01-31',
        'test-instrument-id',
        1000
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSessions);
      expect(practiceSessionRepository.getPracticeSessionsByDateRange).toHaveBeenCalledWith(
        'test-user-id',
        '2024-01-01',
        '2024-01-31',
        'test-instrument-id',
        1000
      );
    });
  });
});

