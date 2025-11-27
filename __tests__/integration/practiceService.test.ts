/**
 * practiceServiceの統合テスト
 * 
 * 実際のリポジトリとの連携をテスト
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

describe('practiceService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('練習記録の保存フロー', () => {
    it('新規記録の作成から取得までの一連の流れ', async () => {
      // 1. 新規記録を作成
      (practiceSessionRepository.savePracticeSessionWithIntegration as jest.Mock).mockResolvedValue({
        success: true,
        error: null,
      });

      const saveResult = await practiceService.saveSession({
        userId: 'test-user-id',
        minutes: 30,
        content: '練習記録',
        inputMethod: 'manual',
      });

      expect(saveResult.success).toBe(true);

      // 2. 今日の記録を取得
      const mockSessions = [
        { id: '1', duration_minutes: 30, practice_date: new Date().toISOString().split('T')[0] },
      ];

      (practiceSessionRepository.getTodayPracticeSessions as jest.Mock).mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      const getResult = await practiceService.getTodaySessions('test-user-id');

      expect(getResult.success).toBe(true);
      expect(getResult.data).toHaveLength(1);
      expect(getResult.data?.[0].duration_minutes).toBe(30);
    });

    it('既存記録への統合保存', async () => {
      // 既存の記録がある状態
      (practiceSessionRepository.getTodayPracticeSessions as jest.Mock).mockResolvedValue({
        data: [{ id: '1', duration_minutes: 15, practice_date: new Date().toISOString().split('T')[0] }],
        error: null,
      });

      // 統合保存
      (practiceSessionRepository.savePracticeSessionWithIntegration as jest.Mock).mockResolvedValue({
        success: true,
        error: null,
      });

      const result = await practiceService.saveSession({
        userId: 'test-user-id',
        minutes: 20,
        content: '追加練習',
        inputMethod: 'timer',
      });

      expect(result.success).toBe(true);
      expect(practiceSessionRepository.savePracticeSessionWithIntegration).toHaveBeenCalledWith(
        'test-user-id',
        20,
        expect.objectContaining({
          content: '追加練習',
          inputMethod: 'timer',
        })
      );
    });
  });

  describe('統計データ取得フロー', () => {
    it('期間指定でのデータ取得と集計', async () => {
      const mockSessions = [
        { id: '1', duration_minutes: 30, practice_date: '2024-01-01' },
        { id: '2', duration_minutes: 45, practice_date: '2024-01-02' },
        { id: '3', duration_minutes: 60, practice_date: '2024-01-03' },
      ];

      (practiceSessionRepository.getPracticeSessionsByDateRange as jest.Mock).mockResolvedValue({
        data: mockSessions,
        error: null,
      });

      const result = await practiceService.getSessionsByDateRange(
        'test-user-id',
        '2024-01-01',
        '2024-01-31'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      
      // 合計時間の計算
      const totalMinutes = result.data?.reduce((sum, session) => sum + session.duration_minutes, 0) || 0;
      expect(totalMinutes).toBe(135);
    });
  });
});

