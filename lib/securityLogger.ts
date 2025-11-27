import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './logger';
import { ErrorHandler } from './errorHandler';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  ACCOUNT_DELETION = 'account_deletion',
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  PERMISSION_REQUEST = 'permission_request',
  PERMISSION_DENIED = 'permission_denied',
  API_ERROR = 'api_error',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  ATT_PERMISSION_REQUEST = 'att_permission_request',
  ATT_PERMISSION_DENIED = 'att_permission_denied',
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export class SecurityLogger {
  private static instance: SecurityLogger;
  private events: SecurityEvent[] = [];
  private readonly MAX_EVENTS = 1000;
  private readonly STORAGE_KEY = 'security_events';

  private constructor() {
    this.loadEvents();
  }

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * セキュリティイベントをログに記録
   */
  async logEvent(
    type: SecurityEventType,
    details: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low',
    userId?: string
  ): Promise<void> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      timestamp: new Date(),
      userId,
      details,
      severity,
      resolved: false,
    };

    // プラットフォーム固有の情報を追加
    if (Platform.OS === 'web') {
      event.userAgent = navigator.userAgent;
      // IPアドレスは実際の実装ではサーバーサイドで取得
    }

    this.events.unshift(event);

    // 最大イベント数を超えた場合、古いイベントを削除
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }

    // ストレージに保存
    await this.saveEvents();

    // 重大なイベントの場合は即座にアラート
    if (severity === 'critical' || severity === 'high') {
      this.handleCriticalEvent(event);
    }

    logger.debug('Security Event Logged:', event);
  }

  /**
   * ログイン成功を記録
   */
  async logLoginSuccess(userId: string, method: string = 'email'): Promise<void> {
    await this.logEvent(
      SecurityEventType.LOGIN_SUCCESS,
      { method, timestamp: new Date().toISOString() },
      'low',
      userId
    );
  }

  /**
   * ログイン失敗を記録
   */
  async logLoginFailure(email: string, reason: string, attemptCount: number): Promise<void> {
    await this.logEvent(
      SecurityEventType.LOGIN_FAILURE,
      { email, reason, attemptCount, timestamp: new Date().toISOString() },
      attemptCount > 3 ? 'high' : 'medium'
    );
  }

  /**
   * ログアウトを記録
   */
  async logLogout(userId: string): Promise<void> {
    await this.logEvent(
      SecurityEventType.LOGOUT,
      { timestamp: new Date().toISOString() },
      'low',
      userId
    );
  }

  /**
   * パスワード変更を記録
   */
  async logPasswordChange(userId: string): Promise<void> {
    await this.logEvent(
      SecurityEventType.PASSWORD_CHANGE,
      { timestamp: new Date().toISOString() },
      'medium',
      userId
    );
  }

  /**
   * アカウント削除を記録
   */
  async logAccountDeletion(userId: string): Promise<void> {
    await this.logEvent(
      SecurityEventType.ACCOUNT_DELETION,
      { timestamp: new Date().toISOString() },
      'high',
      userId
    );
  }

  /**
   * データエクスポートを記録
   */
  async logDataExport(userId: string, dataType: string): Promise<void> {
    await this.logEvent(
      SecurityEventType.DATA_EXPORT,
      { dataType, timestamp: new Date().toISOString() },
      'medium',
      userId
    );
  }

  /**
   * データ削除を記録
   */
  async logDataDeletion(userId: string, dataType: string): Promise<void> {
    await this.logEvent(
      SecurityEventType.DATA_DELETION,
      { dataType, timestamp: new Date().toISOString() },
      'medium',
      userId
    );
  }

  /**
   * 疑わしい活動を記録
   */
  async logSuspiciousActivity(
    userId: string,
    activity: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      { activity, ...details, timestamp: new Date().toISOString() },
      'high',
      userId
    );
  }

  /**
   * 権限要求を記録
   */
  async logPermissionRequest(permission: string, granted: boolean): Promise<void> {
    await this.logEvent(
      granted ? SecurityEventType.PERMISSION_REQUEST : SecurityEventType.PERMISSION_DENIED,
      { permission, granted, timestamp: new Date().toISOString() },
      'low'
    );
  }

  /**
   * ATT許可要求を記録
   */
  async logATTPermissionRequest(granted: boolean): Promise<void> {
    await this.logEvent(
      granted ? SecurityEventType.ATT_PERMISSION_REQUEST : SecurityEventType.ATT_PERMISSION_DENIED,
      { granted, timestamp: new Date().toISOString() },
      'low'
    );
  }

  /**
   * 未承認アクセスを記録
   */
  async logUnauthorizedAccess(resource: string, userId?: string): Promise<void> {
    await this.logEvent(
      SecurityEventType.UNAUTHORIZED_ACCESS,
      { resource, timestamp: new Date().toISOString() },
      'high',
      userId
    );
  }

  /**
   * API エラーを記録
   */
  async logAPIError(endpoint: string, statusCode: number, error: string): Promise<void> {
    await this.logEvent(
      SecurityEventType.API_ERROR,
      { endpoint, statusCode, error, timestamp: new Date().toISOString() },
      statusCode >= 500 ? 'high' : 'medium'
    );
  }

  /**
   * イベントを取得
   */
  getEvents(
    type?: SecurityEventType,
    severity?: 'low' | 'medium' | 'high' | 'critical',
    limit?: number
  ): SecurityEvent[] {
    let filteredEvents = this.events;

    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type);
    }

    if (severity) {
      filteredEvents = filteredEvents.filter(event => event.severity === severity);
    }

    if (limit) {
      filteredEvents = filteredEvents.slice(0, limit);
    }

    return filteredEvents;
  }

  /**
   * 重大なイベントの処理
   */
  private handleCriticalEvent(event: SecurityEvent): void {
    // 実際の実装では、管理者に通知、外部サービスへの送信などを行う
    logger.warn('Critical Security Event:', event);
    
    // 必要に応じて、ユーザーにアラートを表示
    if (Platform.OS === 'web') {
      // Web環境でのアラート表示
      ErrorHandler.handle(new Error('Critical security event detected'), 'SecurityLogger', false);
      logger.error('Critical security event detected:', event);
    }
  }

  /**
   * イベントIDを生成
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * イベントをストレージに保存
   */
  private async saveEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events));
    } catch (error) {
      ErrorHandler.handle(error, 'SecurityLogger saveEvents', false);
    }
  }

  /**
   * ストレージからイベントを読み込み
   */
  private async loadEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedEvents = JSON.parse(stored);
        // タイムスタンプをDateオブジェクトに変換
        this.events = parsedEvents.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp),
        }));
      }
    } catch (error) {
      ErrorHandler.handle(error, 'SecurityLogger loadEvents', false);
      this.events = [];
    }
  }

  /**
   * 古いイベントをクリーンアップ
   */
  async cleanupOldEvents(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.events = this.events.filter(event => event.timestamp > cutoffDate);
    await this.saveEvents();
  }

  /**
   * すべてのイベントをクリア
   */
  async clearAllEvents(): Promise<void> {
    this.events = [];
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * セキュリティ統計を取得
   */
  getSecurityStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentCriticalEvents: number;
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    let recentCriticalEvents = 0;

    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      
      if (event.severity === 'critical' && event.timestamp > last24Hours) {
        recentCriticalEvents++;
      }
    });

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      recentCriticalEvents,
    };
  }
}


