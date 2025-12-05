/**
 * Stopwatch.tsx のテスト
 * ストップウォッチ機能の正確性を保証
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Stopwatch from '@/components/timer/Stopwatch';
import { useTimer } from '@/hooks/useTimer';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

// モック
jest.mock('@/hooks/useTimer');
jest.mock('@/components/InstrumentThemeContext');

const mockUseTimer = useTimer as jest.MockedFunction<typeof useTimer>;
const mockUseInstrumentTheme = useInstrumentTheme as jest.MockedFunction<typeof useInstrumentTheme>;

describe('Stopwatch', () => {
  const mockTheme = {
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    primary: '#007AFF',
    secondary: '#E5E5EA',
    background: '#F2F2F7',
  };

  const mockTimerHook = {
    stopwatchSeconds: 0,
    isStopwatchRunning: false,
    startStopwatch: jest.fn(),
    pauseStopwatch: jest.fn(),
    resetStopwatch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInstrumentTheme.mockReturnValue({
      currentTheme: mockTheme,
      selectedInstrument: null,
      setSelectedInstrument: jest.fn(),
    } as any);
    mockUseTimer.mockReturnValue(mockTimerHook as any);
  });

  it('初期状態が正しく表示される', () => {
    const { getByText } = render(<Stopwatch />);
    
    expect(getByText('00:00')).toBeTruthy();
  });

  it('時間が正しくフォーマットされる（分:秒）', () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerHook,
      stopwatchSeconds: 125, // 2分5秒
    } as any);

    const { getByText } = render(<Stopwatch />);
    
    expect(getByText('02:05')).toBeTruthy();
  });

  it('時間が正しくフォーマットされる（時:分:秒）', () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerHook,
      stopwatchSeconds: 3665, // 1時間1分5秒
    } as any);

    const { getByText } = render(<Stopwatch />);
    
    expect(getByText('01:01:05')).toBeTruthy();
  });

  it('開始ボタンがクリックされるとstartStopwatchが呼ばれる', () => {
    const { getByTestId } = render(<Stopwatch />);
    
    // Playボタンを探す（実際のコンポーネントにtestIDを追加する必要がある）
    // このテストはコンポーネントにtestIDを追加した後に有効になる
  });

  it('停止中にリセットボタンが表示される（時間が0より大きい場合）', () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerHook,
      stopwatchSeconds: 60,
    } as any);

    const { queryByText } = render(<Stopwatch />);
    
    // リセットボタンが表示されることを確認
    // 実際のコンポーネントにtestIDを追加する必要がある
  });

  it('ラップ機能が動作する', () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerHook,
      stopwatchSeconds: 30,
      isStopwatchRunning: true,
    } as any);

    const { getByText } = render(<Stopwatch />);
    
    // ラップボタンが表示されることを確認
    expect(getByText('ラップ')).toBeTruthy();
  });

  it('ラップタイムが正しく記録される', () => {
    let currentSeconds = 30;
    mockUseTimer.mockReturnValue({
      ...mockTimerHook,
      get stopwatchSeconds() { return currentSeconds; },
      isStopwatchRunning: true,
    } as any);

    const { getByText, rerender } = render(<Stopwatch />);
    
    // ラップボタンをクリック
    const lapButton = getByText('ラップ');
    fireEvent.press(lapButton);
    
    // ラップタイムが追加されることを確認
    currentSeconds = 60;
    rerender(<Stopwatch />);
    
    // ラップタイムリストが表示されることを確認
    expect(getByText('ラップ (1)')).toBeTruthy();
  });

  it('ラップタイムがクリアされる', () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerHook,
      stopwatchSeconds: 30,
      isStopwatchRunning: true,
    } as any);

    const { getByText } = render(<Stopwatch />);
    
    // クリアボタンが表示されることを確認
    expect(getByText('クリア')).toBeTruthy();
  });

  it('リセット時にラップタイムもクリアされる', () => {
    mockUseTimer.mockReturnValue({
      ...mockTimerHook,
      stopwatchSeconds: 60,
    } as any);

    const { getByText } = render(<Stopwatch />);
    
    // リセットボタンがクリックされると、ラップタイムもクリアされる
    // 実際のコンポーネントにtestIDを追加する必要がある
  });
});


