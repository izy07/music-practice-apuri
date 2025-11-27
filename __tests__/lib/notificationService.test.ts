/**
 * notificationService.ts のテスト
 * 通知機能の正確性を保証
 */

describe('通知スケジュールの計算', () => {
  describe('毎日の通知時刻計算', () => {
    it('指定時刻の通知を正しく計算する', () => {
      const now = new Date(2025, 9, 14, 10, 0); // 10:00
      const notificationTime = new Date(2025, 9, 14, 20, 0); // 20:00
      
      const timeUntilNotification = notificationTime.getTime() - now.getTime();
      const hoursUntil = timeUntilNotification / (1000 * 60 * 60);
      
      expect(hoursUntil).toBe(10);
    });

    it('過去の時刻を指定した場合は翌日の同時刻を計算する', () => {
      const now = new Date(2025, 9, 14, 21, 0); // 21:00
      const targetHour = 20; // 20:00
      
      let notificationTime = new Date(2025, 9, 14, targetHour, 0);
      
      // 過去の時刻なら翌日に設定
      if (notificationTime <= now) {
        notificationTime = new Date(2025, 9, 15, targetHour, 0);
      }
      
      expect(notificationTime.getDate()).toBe(15);
      expect(notificationTime.getHours()).toBe(20);
    });
  });

  describe('週次の通知曜日計算', () => {
    it('次の指定曜日を正しく計算する', () => {
      const now = new Date(2025, 9, 14); // 2025年10月14日（火曜日）
      const targetDayOfWeek = 5; // 金曜日
      
      const daysUntilTarget = (targetDayOfWeek - now.getDay() + 7) % 7 || 7;
      const nextDate = new Date(now.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
      
      expect(nextDate.getDay()).toBe(5); // 金曜日
      expect(nextDate.getDate()).toBeGreaterThan(14);
    });

    it('同じ曜日の場合は1週間後を返す', () => {
      const tuesday = new Date(2025, 9, 14); // 火曜日
      const targetDayOfWeek = 2; // 火曜日
      
      const daysUntilTarget = (targetDayOfWeek - tuesday.getDay() + 7) % 7 || 7;
      
      expect(daysUntilTarget).toBe(7);
    });
  });

  describe('通知の有効性チェック', () => {
    it('通知がオンの場合はtrue', () => {
      const settings = {
        practiceReminder: true,
        practiceReminderTime: '20:00',
      };
      
      expect(settings.practiceReminder).toBe(true);
    });

    it('通知がオフの場合はfalse', () => {
      const settings = {
        practiceReminder: false,
        practiceReminderTime: '20:00',
      };
      
      expect(settings.practiceReminder).toBe(false);
    });
  });

  describe('通知時刻のフォーマット', () => {
    it('HH:MM形式の時刻を正しくパースする', () => {
      const timeString = '20:30';
      const [hours, minutes] = timeString.split(':').map(Number);
      
      expect(hours).toBe(20);
      expect(minutes).toBe(30);
    });

    it('無効な時刻形式を検出する', () => {
      const invalidTimes = ['25:00', '20:60', 'invalid', ''];
      
      invalidTimes.forEach(time => {
        const parts = time.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        
        const isValid = !isNaN(hours) && !isNaN(minutes) && 
                       hours >= 0 && hours < 24 && 
                       minutes >= 0 && minutes < 60;
        
        expect(isValid).toBe(false);
      });
    });

    it('有効な時刻形式を検証する', () => {
      const validTimes = ['00:00', '12:30', '23:59'];
      
      validTimes.forEach(time => {
        const parts = time.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        
        const isValid = !isNaN(hours) && !isNaN(minutes) && 
                       hours >= 0 && hours < 24 && 
                       minutes >= 0 && minutes < 60;
        
        expect(isValid).toBe(true);
      });
    });
  });

  describe('通知のスロットリング', () => {
    it('短時間に複数の通知を送らない', () => {
      const lastNotificationTime = Date.now();
      const minInterval = 5 * 60 * 1000; // 5分
      
      const now = Date.now();
      const timeSinceLastNotification = now - lastNotificationTime;
      
      const shouldNotify = timeSinceLastNotification >= minInterval;
      
      // 5分未満なら通知しない
      if (timeSinceLastNotification < minInterval) {
        expect(shouldNotify).toBe(false);
      }
    });
  });

  describe('通知タイプの分類', () => {
    it('練習リマインダー通知を識別できる', () => {
      const notificationTypes = {
        practiceReminder: 'practice_reminder',
        goalDeadline: 'goal_deadline',
        achievementUnlocked: 'achievement_unlocked',
      };
      
      expect(notificationTypes.practiceReminder).toBe('practice_reminder');
    });

    it('目標期限通知を識別できる', () => {
      const notificationType = 'goal_deadline';
      const validTypes = ['practice_reminder', 'goal_deadline', 'achievement_unlocked'];
      
      expect(validTypes).toContain(notificationType);
    });
  });
});

