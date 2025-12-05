/**
 * storageKeys.ts のテスト
 * ストレージキーの正確性を保証
 */

import { STORAGE_KEYS, withUser } from '@/lib/storageKeys';

describe('STORAGE_KEYS', () => {
  it('すべてのストレージキーが定義されている', () => {
    expect(STORAGE_KEYS.selectedInstrument).toBe('selectedInstrument');
    expect(STORAGE_KEYS.customTheme).toBe('customTheme');
    expect(STORAGE_KEYS.isCustomTheme).toBe('isCustomTheme');
    expect(STORAGE_KEYS.practiceSettings).toBe('practiceSettings');
    expect(STORAGE_KEYS.userPracticeLevel).toBe('user_practice_level');
  });
});

describe('withUser', () => {
  it('userIdが提供された場合はユーザーIDで名前空間化する', () => {
    expect(withUser('testKey', 'user-123')).toBe('testKey:user-123');
  });

  it('userIdがnullの場合は元のキーを返す', () => {
    expect(withUser('testKey', null)).toBe('testKey');
  });

  it('userIdがundefinedの場合は元のキーを返す', () => {
    expect(withUser('testKey', undefined)).toBe('testKey');
  });

  it('userIdが空文字列の場合は元のキーを返す', () => {
    expect(withUser('testKey', '')).toBe('testKey');
  });
});


