/**
 * useIdleTimeout.ts のテスト
 * アイドルタイムアウトフックの正確性を保証
 */

import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
  Platform: {
    OS: 'web',
  },
}));

jest.useFakeTimers();

describe('useIdleTimeout', () => {
  const mockOnLogout = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('認証されていない場合はタイマーを開始しない', () => {
    renderHook(() =>
      useIdleTimeout({
        isAuthenticated: false,
        onLogout: mockOnLogout,
        timeoutMs: 1000,
      })
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockOnLogout).not.toHaveBeenCalled();
  });

  it('enabledがfalseの場合はタイマーを開始しない', () => {
    renderHook(() =>
      useIdleTimeout({
        isAuthenticated: true,
        onLogout: mockOnLogout,
        enabled: false,
        timeoutMs: 1000,
      })
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockOnLogout).not.toHaveBeenCalled();
  });

  it('タイムアウト時間経過後にログアウトを実行する', () => {
    renderHook(() =>
      useIdleTimeout({
        isAuthenticated: true,
        onLogout: mockOnLogout,
        timeoutMs: 1000,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  it('カスタムタイムアウト時間を使用できる', () => {
    renderHook(() =>
      useIdleTimeout({
        isAuthenticated: true,
        onLogout: mockOnLogout,
        timeoutMs: 500,
      })
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });
});

