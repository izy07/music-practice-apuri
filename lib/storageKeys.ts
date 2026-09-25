// Centralized storage key definitions

export const STORAGE_KEYS = {
  selectedInstrument: 'selectedInstrument',
  customTheme: 'customTheme',
  isCustomTheme: 'isCustomTheme',
  practiceSettings: 'practiceSettings',
  userPracticeLevel: 'user_practice_level',
} as const;

/**
 * ユーザー単位キー（InstrumentThemeContext と同一形式: `${base}_${userId}`）
 * 楽器・オンボーディングキャッシュは必ずこちらを使う。
 */
export const userScopedKey = (baseKey: string, userId?: string | null) => {
  if (!userId) return baseKey;
  return `${baseKey}_${userId}`;
};

/** @deprecated userScopedKey を使う（コロン区切りは楽器キーと不一致だった） */
export const withUser = (baseKey: string, userId?: string | null) => {
  if (!userId) return baseKey;
  return `${baseKey}:${userId}`;
};

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];


