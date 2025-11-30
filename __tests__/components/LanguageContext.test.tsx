/**
 * LanguageContext.tsx のテスト
 * 言語コンテキストの正確性を保証
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';

describe('LanguageContext', () => {
  it('デフォルト言語が日本語である', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );

    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(result.current.language).toBe('ja');
  });

  it('言語を変更できる', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );

    const { result } = renderHook(() => useLanguage(), { wrapper });

    act(() => {
      result.current.setLanguage('en');
    });

    expect(result.current.language).toBe('en');
  });

  it('翻訳関数が正しく動作する', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );

    const { result } = renderHook(() => useLanguage(), { wrapper });

    expect(result.current.t('calendar')).toBe('カレンダー');
    expect(result.current.t('timer')).toBe('タイマー');
  });

  it('英語に切り替えた場合、翻訳が英語になる', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );

    const { result } = renderHook(() => useLanguage(), { wrapper });

    act(() => {
      result.current.setLanguage('en');
    });

    expect(result.current.t('calendar')).toBe('Calendar');
    expect(result.current.t('timer')).toBe('Timer');
  });
});

