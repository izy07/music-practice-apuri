/**
 * useThemeColorsフックのテスト
 */

import { renderHook } from '@testing-library/react-native';
import { useThemeColors, useThemeColor } from '@/hooks/useThemeColors';
import { InstrumentThemeProvider } from '@/components/InstrumentThemeContext';

// モック
jest.mock('@/components/InstrumentThemeContext', () => {
  const actual = jest.requireActual('@/components/InstrumentThemeContext');
  return {
    ...actual,
    useInstrumentTheme: () => ({
      currentTheme: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#1f2937',
        textSecondary: '#6b7280',
      },
    }),
  };
});

describe('useThemeColors', () => {
  it('すべての色を取得できる', () => {
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: InstrumentThemeProvider,
    });

    expect(result.current.primary).toBe('#6366f1');
    expect(result.current.secondary).toBe('#8b5cf6');
    expect(result.current.accent).toBe('#ec4899');
    expect(result.current.background).toBe('#ffffff');
    expect(result.current.surface).toBe('#f5f5f5');
    expect(result.current.text).toBe('#1f2937');
    expect(result.current.textSecondary).toBe('#6b7280');
  });

  it('テーマが変更されない限り、同じオブジェクトを返す（メモ化）', () => {
    const { result, rerender } = renderHook(() => useThemeColors(), {
      wrapper: InstrumentThemeProvider,
    });

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    // メモ化されているため、同じオブジェクト参照を返す
    expect(firstResult).toBe(secondResult);
  });
});

describe('useThemeColor', () => {
  it('特定の色のみを取得できる', () => {
    const { result } = renderHook(() => useThemeColor('primary'), {
      wrapper: InstrumentThemeProvider,
    });

    expect(result.current).toBe('#6366f1');
  });

  it('存在しない色キーの場合はデフォルト値を返す', () => {
    // モックを変更してcurrentThemeをnullにする
    jest.spyOn(require('@/components/InstrumentThemeContext'), 'useInstrumentTheme').mockReturnValue({
      currentTheme: null,
    });

    const { result } = renderHook(() => useThemeColor('primary'), {
      wrapper: InstrumentThemeProvider,
    });

    expect(result.current).toBe('#6366f1'); // デフォルト値
  });
});

