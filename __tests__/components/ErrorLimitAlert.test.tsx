/**
 * ErrorLimitAlert.tsx のテスト
 * エラー制限アラートコンポーネントの正確性を保証
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ErrorLimitAlert from '@/components/ErrorLimitAlert';
import { InstrumentThemeProvider } from '@/components/InstrumentThemeContext';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('@/components/InstrumentThemeContext', () => ({
  InstrumentThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useInstrumentTheme: () => ({
    currentTheme: {
      error: '#FEE2E2',
      errorText: '#DC2626',
      primary: '#8B4513',
      surface: '#FFFFFF',
    },
  }),
}));

describe('ErrorLimitAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('エラー制限に達していない場合は何も表示しない', () => {
    const { queryByText } = render(
      <InstrumentThemeProvider>
        <ErrorLimitAlert
          errorCount={3}
          isErrorLimitReached={false}
          onReset={jest.fn()}
        />
      </InstrumentThemeProvider>
    );

    expect(queryByText('エラー制限に達しました')).toBeNull();
  });

  it('エラー制限に達した場合はアラートを表示する', () => {
    const { getByText } = render(
      <InstrumentThemeProvider>
        <ErrorLimitAlert
          errorCount={6}
          isErrorLimitReached={true}
          onReset={jest.fn()}
        />
      </InstrumentThemeProvider>
    );

    expect(getByText('エラー制限に達しました')).toBeTruthy();
    expect(getByText(/エラーが6回発生/)).toBeTruthy();
  });

  it('リセットボタンを押すとアラートを表示する', () => {
    const mockOnReset = jest.fn();
    const { getByText } = render(
      <InstrumentThemeProvider>
        <ErrorLimitAlert
          errorCount={6}
          isErrorLimitReached={true}
          onReset={mockOnReset}
        />
      </InstrumentThemeProvider>
    );

    const resetButton = getByText('リセット');
    resetButton.props.onPress();

    expect(Alert.alert).toHaveBeenCalled();
  });
});


