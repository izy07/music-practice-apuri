/**
 * LanguageContext.tsx のテスト
 * 日本語のみ対応の言語コンテキスト
 */

import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';

describe('LanguageContext', () => {
  it('言語は常に日本語である', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );

    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(result.current.language).toBe('ja');
  });

  it('翻訳関数が日本語を返す', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );

    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(result.current.t('calendar')).toBe('カレンダー');
    expect(result.current.t('timer')).toBe('タイマー');
  });
});
