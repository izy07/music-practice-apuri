import { supabase } from './supabase';
import logger from './logger';
import { ErrorHandler } from './errorHandler';

export interface NotificationSettings {
  practice_reminders: boolean;
  goal_reminders: boolean;
  daily_practice: boolean;
  weekly_summary: boolean;
  achievement_notifications: boolean;
  sound_notifications: boolean;
  vibration_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // 通知設定を読み込み
  async loadSettings(): Promise<NotificationSettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_settings')
        .select('notification_settings')
        .eq('user_id', user.id)
        .single();

      if (error) {
        ErrorHandler.handle(error, '通知設定読み込み', false);
        return null;
      }

      this.settings = data?.notification_settings || this.getDefaultSettings();
      return this.settings;
    } catch (error) {
      ErrorHandler.handle(error, '通知設定読み込み', false);
      return null;
    }
  }

  // 通知設定を保存
  async saveSettings(settings: NotificationSettings): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          notification_settings: settings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        ErrorHandler.handle(error, '通知設定保存', false);
        return false;
      }

      this.settings = settings;
      return true;
    } catch (error) {
      ErrorHandler.handle(error, '通知設定保存', false);
      return false;
    }
  }

  // デフォルト設定を取得
  private getDefaultSettings(): NotificationSettings {
    return {
      practice_reminders: true,
      goal_reminders: true,
      daily_practice: true,
      weekly_summary: false,
      achievement_notifications: true,
      sound_notifications: true,
      vibration_notifications: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
    };
  }

  // 通知を送信
  async sendNotification(title: string, body: string, options?: NotificationOptions): Promise<boolean> {
    try {
      // おやすみ時間のチェック
      if (this.settings?.quiet_hours_enabled && this.isInQuietHours()) {
        logger.debug('Notification suppressed during quiet hours');
        return false;
      }

      // Web環境での通知
      if (typeof window !== 'undefined' && 'Notification' in window) {
        // 権限の確認と要求
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            logger.debug('Notification permission denied');
            return false;
          }
        }

        if (Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            tag: 'music-practice',
            requireInteraction: false,
            silent: !this.settings?.sound_notifications,
            ...options,
          });

          // 通知の自動削除（5秒後）
          setTimeout(() => {
            notification.close();
          }, 5000);

          // 通知クリック時の処理
          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          return true;
        } else {
          logger.debug('Notification permission not granted');
          return false;
        }
      }

      return false;
    } catch (error) {
      ErrorHandler.handle(error, '通知送信', false);
      return false;
    }
  }

  // 練習リマインダー通知
  async sendPracticeReminder(): Promise<boolean> {
    if (!this.settings?.practice_reminders) return false;

    const messages = [
      '練習の時間です！今日も楽器の練習を始めましょう。',
      '継続は力なり！今日の練習を始めませんか？',
      '音楽の時間です。楽器を手に取ってみましょう。',
      '上達への一歩。今日も練習を続けましょう！',
      '楽器との時間を楽しみましょう。練習を始めませんか？'
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    return await this.sendNotification(
      '🎵 練習リマインダー',
      randomMessage
    );
  }

  // 目標リマインダー通知
  async sendGoalReminder(goalTitle: string): Promise<boolean> {
    if (!this.settings?.goal_reminders) return false;

    return this.sendNotification(
      '目標の確認',
      `目標「${goalTitle}」の進捗を確認しましょう。`
    );
  }

  // 毎日の練習通知
  async sendDailyPracticeReminder(): Promise<boolean> {
    if (!this.settings?.daily_practice) return false;

    return this.sendNotification(
      '今日の練習',
      '今日も楽器の練習をしましょう。継続は力なりです！'
    );
  }

  // 週間サマリー通知
  async sendWeeklySummary(totalPracticeTime: number): Promise<boolean> {
    if (!this.settings?.weekly_summary) return false;

    const hours = Math.floor(totalPracticeTime / 60);
    const minutes = totalPracticeTime % 60;

    return this.sendNotification(
      '今週の練習サマリー',
      `今週は${hours}時間${minutes}分の練習をしました。お疲れさまでした！`
    );
  }

  // 達成通知
  async sendAchievementNotification(achievement: string): Promise<boolean> {
    if (!this.settings?.achievement_notifications) return false;

    return this.sendNotification(
      '🎉 達成！',
      `おめでとうございます！${achievement}を達成しました。`
    );
  }

  // おやすみ時間内かチェック
  private isInQuietHours(): boolean {
    if (!this.settings?.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = this.settings.quiet_hours_start.split(':').map(Number);
    const [endHour, endMinute] = this.settings.quiet_hours_end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // 日をまたぐ場合（例：22:00-08:00）
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  // 通知権限をリクエスト
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission;
      } catch (error) {
        ErrorHandler.handle(error, '通知権限要求', false);
        return 'denied';
      }
    }
    return 'denied';
  }

  // 通知権限の状態を取得
  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  }
}

export default NotificationService;
