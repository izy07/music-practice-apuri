/**
 * UserFeedbackコンポーネントのテスト
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import UserFeedback from '@/components/UserFeedback';
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
        surface: '#ffffff',
      },
    }),
  };
});

describe('UserFeedback', () => {
  const defaultProps = {
    type: 'info' as const,
    title: 'テストタイトル',
    message: 'テストメッセージ',
    visible: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('visibleがfalseの場合は何も表示しない', () => {
    const { queryByText } = render(
      <InstrumentThemeProvider>
        <UserFeedback {...defaultProps} visible={false} />
      </InstrumentThemeProvider>
    );

    expect(queryByText('テストタイトル')).toBeNull();
  });

  it('visibleがtrueの場合は表示される', () => {
    const { getByText } = render(
      <InstrumentThemeProvider>
        <UserFeedback {...defaultProps} />
      </InstrumentThemeProvider>
    );

    expect(getByText('テストタイトル')).toBeTruthy();
    expect(getByText('テストメッセージ')).toBeTruthy();
  });

  it('successタイプの場合は適切なスタイルが適用される', () => {
    const { getByText } = render(
      <InstrumentThemeProvider>
        <UserFeedback {...defaultProps} type="success" />
      </InstrumentThemeProvider>
    );

    expect(getByText('テストタイトル')).toBeTruthy();
  });

  it('errorタイプの場合は適切なスタイルが適用される', () => {
    const { getByText } = render(
      <InstrumentThemeProvider>
        <UserFeedback {...defaultProps} type="error" />
      </InstrumentThemeProvider>
    );

    expect(getByText('テストタイトル')).toBeTruthy();
  });

  it('閉じるボタンをクリックするとonCloseが呼ばれる', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <InstrumentThemeProvider>
        <UserFeedback {...defaultProps} onClose={onClose} />
      </InstrumentThemeProvider>
    );

    const closeButton = getByText('閉じる');
    fireEvent.press(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('autoHideがtrueの場合、指定時間後に自動で閉じる', async () => {
    const onClose = jest.fn();
    render(
      <InstrumentThemeProvider>
        <UserFeedback {...defaultProps} autoHide={true} duration={1000} onClose={onClose} />
      </InstrumentThemeProvider>
    );

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('actionが提供された場合、アクションボタンが表示される', () => {
    const action = {
      label: 'アクション',
      onPress: jest.fn(),
    };

    const { getByText } = render(
      <InstrumentThemeProvider>
        <UserFeedback {...defaultProps} action={action} />
      </InstrumentThemeProvider>
    );

    const actionButton = getByText('アクション');
    expect(actionButton).toBeTruthy();

    fireEvent.press(actionButton);
    expect(action.onPress).toHaveBeenCalledTimes(1);
  });
});

