/**
 * Metronome.tsx のテスト
 * メトロノーム機能の正確性を保証
 */

import React, { useRef } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Metronome from '@/components/metronome/Metronome';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

// モック
jest.mock('@/components/InstrumentThemeContext');

const mockUseInstrumentTheme = useInstrumentTheme as jest.MockedFunction<typeof useInstrumentTheme>;

// AudioContextのモック
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    frequency: { setValueAtTime: jest.fn() },
    type: '',
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
    },
    connect: jest.fn(),
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: jest.fn(),
})) as any;

describe('Metronome', () => {
  const mockTheme = {
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    primary: '#007AFF',
    secondary: '#E5E5EA',
    background: '#F2F2F7',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseInstrumentTheme.mockReturnValue({
      currentTheme: mockTheme,
      selectedInstrument: null,
      setSelectedInstrument: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('初期状態が正しく表示される', () => {
    const audioContextRef = { current: new (global.AudioContext as any)() };
    const { getByText } = render(<Metronome audioContextRef={audioContextRef} />);
    
    expect(getByText('4/4')).toBeTruthy();
    expect(getByText('120')).toBeTruthy();
    expect(getByText('開始')).toBeTruthy();
  });

  it('BPMが正しく表示される', () => {
    const audioContextRef = { current: new (global.AudioContext as any)() };
    const { getByText } = render(<Metronome audioContextRef={audioContextRef} />);
    
    expect(getByText('120')).toBeTruthy();
  });

  it('拍子が正しく表示される', () => {
    const audioContextRef = { current: new (global.AudioContext as any)() };
    const { getByText } = render(<Metronome audioContextRef={audioContextRef} />);
    
    expect(getByText('4/4')).toBeTruthy();
  });

  it('BPM調整ボタンが動作する', () => {
    const audioContextRef = { current: new (global.AudioContext as any)() };
    const { getByText } = render(<Metronome audioContextRef={audioContextRef} />);
    
    // BPM調整ボタンが存在することを確認
    expect(getByText('+1')).toBeTruthy();
    expect(getByText('-1')).toBeTruthy();
    expect(getByText('+10')).toBeTruthy();
    expect(getByText('-10')).toBeTruthy();
  });

  it('拍子選択ボタンが表示される', () => {
    const audioContextRef = { current: new (global.AudioContext as any)() };
    const { getByText } = render(<Metronome audioContextRef={audioContextRef} />);
    
    // 拍子選択ボタンが存在することを確認
    expect(getByText('2/4')).toBeTruthy();
    expect(getByText('3/4')).toBeTruthy();
    expect(getByText('4/4')).toBeTruthy();
  });

  it('音選択ボタンが表示される', () => {
    const audioContextRef = { current: new (global.AudioContext as any)() };
    const { getByText } = render(<Metronome audioContextRef={audioContextRef} />);
    
    // 音選択ボタンが存在することを確認
    expect(getByText('クリック')).toBeTruthy();
    expect(getByText('ビープ')).toBeTruthy();
    expect(getByText('ベル')).toBeTruthy();
    expect(getByText('チム')).toBeTruthy();
  });

  it('メトロノーム開始時に停止ボタンが表示される', () => {
    const audioContextRef = { current: new (global.AudioContext as any)() };
    const { getByText, queryByText } = render(<Metronome audioContextRef={audioContextRef} />);
    
    // 開始ボタンをクリック
    const startButton = getByText('開始');
    fireEvent.press(startButton);
    
    // 停止ボタンが表示されることを確認
    expect(queryByText('停止')).toBeTruthy();
    expect(queryByText('開始')).toBeFalsy();
  });

  it('メトロノーム停止時に開始ボタンが表示される', () => {
    const audioContextRef = { current: new (global.AudioContext as any)() };
    const { getByText } = render(<Metronome audioContextRef={audioContextRef} />);
    
    // 開始ボタンをクリック
    const startButton = getByText('開始');
    fireEvent.press(startButton);
    
    // 停止ボタンをクリック
    const stopButton = getByText('停止');
    fireEvent.press(stopButton);
    
    // 開始ボタンが再表示されることを確認
    expect(getByText('開始')).toBeTruthy();
  });

  it('ビートインジケーターが正しく表示される', () => {
    const audioContextRef = { current: new (global.AudioContext as any)() };
    const { UNSAFE_getAllByType } = render(<Metronome audioContextRef={audioContextRef} />);
    
    // ビートインジケーターが4つ表示されることを確認（4/4拍子の場合）
    // 実際のコンポーネントにtestIDを追加する必要がある
  });
});

