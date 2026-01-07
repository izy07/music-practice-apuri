import { Platform, AppState } from 'react-native';
import { supabase } from './supabase';
import logger from './logger';
import { ErrorHandler } from './errorHandler';
// カラム存在チェックは削除（初期スキーマに含まれているため）
// import { checkNotificationSettingsColumnExists, getMissingColumnErrorMessage } from './databaseSchemaChecker';

// expo-notificationsはWeb環境では使用しない
let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    logger.warn('expo-notifications not available:', error);
  }
}

export interface NotificationSettings {
  practice_reminders: boolean;
  goal_reminders: boolean;
  daily_practice: boolean;
  weekly_summary: boolean;
  achievement_notifications: boolean;
  organization_attendance_available: boolean;
  organization_schedule_added: boolean;
  organization_task_added: boolean;
  sound_notifications: boolean;
  vibration_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings | null = null;
  private appState: string = 'active'; // アプリの状態を追跡

  private constructor() {
    // アプリの状態を監視（バックグラウンド処理の最適化）
    if (typeof AppState !== 'undefined') {
      AppState.addEventListener('change', (nextAppState) => {
        this.appState = nextAppState;
      });
    }
  }

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
      if (!user) {
        this.settings = this.getDefaultSettings();
        return this.settings;
      }

      // カラムの存在チェックは削除（初期スキーマに含まれているため）
      // エラーが発生した場合は、その時点でエラーハンドリングする

      // 通常通り読み込み
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // エラーが発生した場合（レコードが存在しない等）
        if (error) {
          // レコードが存在しない場合は正常（デフォルト設定を使用）
          if (error.code === 'PGRST116' || error.code === 'PGRST205') {
            this.settings = this.getDefaultSettings();
            return this.settings;
          }
          
          // その他のエラーもデフォルト設定を返す
          logger.warn('通知設定の読み込みに失敗しました。デフォルト設定を使用します。', {
            errorCode: error.code,
            errorStatus: error.status,
            errorMessage: error.message
          });
          this.settings = this.getDefaultSettings();
          return this.settings;
        }

        // データが存在する場合は使用、存在しない場合はデフォルト設定
        if (data && 'notification_settings' in data && data.notification_settings) {
          this.settings = { ...this.getDefaultSettings(), ...data.notification_settings };
        } else {
          this.settings = this.getDefaultSettings();
        }
        return this.settings;
      } catch (queryError: any) {
        logger.error('通知設定の読み込み中にエラーが発生しました。デフォルト設定を使用します。', queryError);
        this.settings = this.getDefaultSettings();
        return this.settings;
      }
    } catch (error) {
      logger.error('通知設定の読み込み中に予期しないエラーが発生しました。デフォルト設定を使用します。', error);
      this.settings = this.getDefaultSettings();
      return this.settings;
    }
  }

  // 通知設定を保存
  async saveSettings(settings: NotificationSettings): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // カラムの存在チェックは削除（初期スキーマに含まれているため）
      // エラーが発生した場合は、その時点でエラーハンドリングする

      // 通常通り保存
      try {
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
      } catch (queryError: any) {
        ErrorHandler.handle(queryError, '通知設定保存', false);
        return false;
      }
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
      achievement_notifications: false, // 目標・達成通知はデフォルトで無効
      organization_attendance_available: true,
      organization_schedule_added: true,
      organization_task_added: true,
      sound_notifications: true,
      vibration_notifications: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
    };
  }

  // 通知を送信
  async sendNotification(title: string, body: string, options?: NotificationOptions): Promise<boolean> {
    // バックグラウンド時は通知を送信しない（バッテリー消費削減）
    if (this.appState !== 'active') {
      logger.debug('アプリがバックグラウンドのため、通知をスキップします');
      return false;
    }
    
    try {
      // おやすみ時間のチェック
      if (this.settings?.quiet_hours_enabled && this.isInQuietHours()) {
        logger.debug('Notification suppressed during quiet hours');
        return false;
      }

      // ネイティブアプリ（iOS/Android）での通知
      if (Platform.OS !== 'web' && Notifications) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: this.settings?.sound_notifications !== false,
              data: options?.data || {},
            },
            trigger: null, // 即座に送信
          });
          logger.debug('ネイティブ通知を送信しました');
          return true;
        } catch (error) {
          logger.error('ネイティブ通知の送信エラー:', error);
          ErrorHandler.handle(error, 'ネイティブ通知送信', false);
          return false;
        }
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
          // アイコンパスを動的に解決（開発環境と本番環境で異なる、WebP形式を優先）
          const getIconPath = () => {
            if (typeof window === 'undefined') return '/assets/images/icon.webp';
            
            const hostname = window.location.hostname;
            const paths = [
              '/_expo/static/assets/images/icon.webp', // 開発環境（Expo Web）- WebP形式
              '/assets/images/icon.webp', // 本番環境 - WebP形式
              '/assets/images/icon.png', // PNG形式（フォールバック）
              '/images/icon.png', // publicディレクトリ（フォールバック）
            ];
            
            // 開発環境の判定
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
              return paths[0]; // 開発環境では/_expo/static/を使用
            }
            
            return paths[1]; // 本番環境では/assets/を使用
          };
          
          const iconPath = getIconPath();
          const notification = new Notification(title, {
            body,
            icon: iconPath,
            badge: iconPath,
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

  // 出席登録可能日通知
  async sendAttendanceAvailableNotification(organizationName: string, practiceDate: string, scheduleTitle: string): Promise<boolean> {
    if (!this.settings?.organization_attendance_available) return false;

    return this.sendNotification(
      '📋 出席登録可能になりました',
      `${organizationName}の「${scheduleTitle}」の出席登録が可能になりました。`
    );
  }

  // 練習日程追加通知
  async sendScheduleAddedNotification(organizationName: string, scheduleTitle: string, practiceDate: string): Promise<boolean> {
    if (!this.settings?.organization_schedule_added) return false;

    const dateStr = new Date(practiceDate).toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric',
    });

    return this.sendNotification(
      '📅 新しい練習日程が追加されました',
      `${organizationName}に「${scheduleTitle}」（${dateStr}）が追加されました。`
    );
  }

  // 課題追加通知
  async sendTaskAddedNotification(organizationName: string, taskTitle: string): Promise<boolean> {
    if (!this.settings?.organization_task_added) return false;

    return this.sendNotification(
      '📝 新しい課題が追加されました',
      `${organizationName}に「${taskTitle}」が追加されました。`
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
  async requestPermission(): Promise<'granted' | 'denied' | 'default'> {
    // ネイティブアプリ（iOS/Android）での通知権限リクエスト
    if (Platform.OS !== 'web' && Notifications) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          logger.warn('通知権限が拒否されました');
          return 'denied';
        }
        
        logger.debug('通知権限が許可されました');
        return 'granted';
      } catch (error) {
        logger.error('通知権限のリクエストエラー:', error);
        ErrorHandler.handle(error, '通知権限要求', false);
        return 'denied';
      }
    }

    // Web環境での通知権限リクエスト
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission as 'granted' | 'denied' | 'default';
      } catch (error) {
        ErrorHandler.handle(error, '通知権限要求', false);
        return 'denied';
      }
    }
    return 'denied';
  }

  // 通知権限の状態を取得
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
    // ネイティブアプリ（iOS/Android）での通知権限状態取得
    if (Platform.OS !== 'web' && Notifications) {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        return status as 'granted' | 'denied' | 'default';
      } catch (error) {
        logger.error('通知権限状態の取得エラー:', error);
        return 'denied';
      }
    }

    // Web環境での通知権限状態取得
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as 'granted' | 'denied' | 'default';
    }
    return 'unsupported';
  }

  // プッシュトークンを取得（ネイティブアプリのみ）
  async getPushToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      logger.debug('Web環境ではプッシュトークンは取得できません');
      return null;
    }

    if (!Notifications) {
      logger.warn('expo-notificationsが利用できません');
      return null;
    }

    try {
      // 通知権限を確認
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('通知権限が許可されていません');
        return null;
      }

      // プッシュトークンを取得
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      });

      logger.debug('プッシュトークンを取得しました:', tokenData.data);
      return tokenData.data;
    } catch (error) {
      logger.error('プッシュトークンの取得エラー:', error);
      ErrorHandler.handle(error, 'プッシュトークン取得', false);
      return null;
    }
  }

  // プッシュトークンをサーバーに登録
  async registerPushToken(): Promise<boolean> {
    if (Platform.OS === 'web') {
      logger.debug('Web環境ではプッシュトークンの登録は不要です');
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.warn('ユーザーが認証されていません');
        return false;
      }

      const token = await this.getPushToken();
      if (!token) {
        logger.warn('プッシュトークンが取得できませんでした');
        return false;
      }

      // Supabaseにプッシュトークンを保存
      // 注意: user_push_tokensテーブルが存在することを前提としています
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          push_token: token,
          platform: Platform.OS,
          device_id: null, // 必要に応じてデバイスIDを追加可能
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform,device_id',
        });

      if (error) {
        logger.error('プッシュトークンの登録エラー:', error);
        ErrorHandler.handle(error, 'プッシュトークン登録', false);
        return false;
      }

      logger.debug('プッシュトークンをサーバーに登録しました');
      return true;
    } catch (error) {
      logger.error('プッシュトークン登録処理のエラー:', error);
      ErrorHandler.handle(error, 'プッシュトークン登録', false);
      return false;
    }
  }
}

export default NotificationService;
