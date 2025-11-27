// Centralized storage key definitions

export const STORAGE_KEYS = {
  selectedInstrument: 'selectedInstrument',
  customTheme: 'customTheme',
  isCustomTheme: 'isCustomTheme',
  practiceSettings: 'practiceSettings',
  userPracticeLevel: 'user_practice_level',
} as const;

// Helper to namespace by user id
export const withUser = (baseKey: string, userId?: string | null) => {
  if (!userId) return baseKey;
  return `${baseKey}:${userId}`;
};

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];


