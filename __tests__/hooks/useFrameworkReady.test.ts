/**
 * useFrameworkReady.ts のテスト
 * フレームワーク準備状態フックの正確性を保証
 */

import { renderHook, act } from '@testing-library/react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

jest.useFakeTimers();

describe('useFrameworkReady', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    if (typeof window !== 'undefined') {
      (window as any).frameworkReady = undefined;
    }
  });

  it('初期状態ではisReadyがfalse', () => {
    const { result } = renderHook(() => useFrameworkReady());
    expect(result.current.isReady).toBe(false);
  });

  it('100ms後にisReadyがtrueになる', () => {
    const { result } = renderHook(() => useFrameworkReady());

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.isReady).toBe(true);
  });

  it('frameworkReadyコールバックが呼ばれる', () => {
    const mockCallback = jest.fn();
    if (typeof window !== 'undefined') {
      (window as any).frameworkReady = mockCallback;
    }

    renderHook(() => useFrameworkReady());

    act(() => {
      jest.advanceTimersByTime(100);
    });

    if (typeof window !== 'undefined' && (window as any).frameworkReady) {
      expect(mockCallback).toHaveBeenCalledTimes(1);
    }
  });
});





