/**
 * errorHandler.ts のテスト
 * エラーハンドラーの正確性を保証
 */

import { ErrorHandler, getUserFriendlyMessage, handleError } from '@/lib/errorHandler';
import { Alert } from 'react-native';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('getUserFriendlyMessage', () => {
  it('セッション期限切れエラーを適切に変換する', () => {
    expect(getUserFriendlyMessage(new Error('Invalid refresh token'))).toBe('セッションが期限切れです。再ログインしてください。');
    expect(getUserFriendlyMessage(new Error('Session expired'))).toBe('セッションが期限切れです。再ログインしてください。');
  });

  it('ネットワークエラーを適切に変換する', () => {
    expect(getUserFriendlyMessage(new Error('Network error'))).toBe('ネットワークに問題が発生しました。接続を確認してください。');
    expect(getUserFriendlyMessage(new Error('Fetch failed'))).toBe('ネットワークに問題が発生しました。接続を確認してください。');
  });

  it('その他のエラーはデフォルトメッセージを返す', () => {
    expect(getUserFriendlyMessage(new Error('Unknown error'))).toBe('処理中にエラーが発生しました。時間をおいて再度お試しください。');
  });

  it('エラーオブジェクトを処理できる', () => {
    expect(getUserFriendlyMessage({ message: 'Network error' })).toBe('ネットワークに問題が発生しました。接続を確認してください。');
  });

  it('文字列エラーを処理できる', () => {
    expect(getUserFriendlyMessage('Network error')).toBe('ネットワークに問題が発生しました。接続を確認してください。');
  });
});

describe('handleError', () => {
  it('エラーをログに記録する', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    handleError(new Error('Test error'), 'Test context');
    
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.resetErrorCount();
    jest.clearAllMocks();
  });

  it('エラーを処理できる', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    ErrorHandler.handle(new Error('Test error'), 'Test context', false);
    
    expect(consoleSpy).toHaveBeenCalled();
    expect(ErrorHandler.getErrorCount()).toBe(1);
    
    consoleSpy.mockRestore();
  });

  it('エラーカウントをリセットできる', () => {
    ErrorHandler.handle(new Error('Test error'), 'Test context', false);
    expect(ErrorHandler.getErrorCount()).toBe(1);
    
    ErrorHandler.resetErrorCount();
    expect(ErrorHandler.getErrorCount()).toBe(0);
  });

  it('エラー制限に達していない場合はfalseを返す', () => {
    ErrorHandler.handle(new Error('Test error'), 'Test context', false);
    expect(ErrorHandler.isErrorLimitReached()).toBe(false);
  });

  it('エラー制限に達した場合はtrueを返す', () => {
    for (let i = 0; i < 6; i++) {
      ErrorHandler.handle(new Error('Test error'), 'Test context', false);
    }
    expect(ErrorHandler.isErrorLimitReached()).toBe(true);
  });

  it('エラー制限を超えるとアラートを表示する', () => {
    for (let i = 0; i < 6; i++) {
      ErrorHandler.handle(new Error('Test error'), 'Test context', true);
    }
    
    expect(Alert.alert).toHaveBeenCalledWith(
      'エラーが多発しています',
      'エラーが続いているため、アプリを再起動することをお勧めします。',
      [{ text: '了解' }]
    );
  });

  it('showToUserがfalseの場合はアラートを表示しない', () => {
    ErrorHandler.handle(new Error('Test error'), 'Test context', false);
    
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});





