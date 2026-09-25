/** 機能利用ログ: feature_id / event_name の定義 */

export type FeatureUsageEventType = 'screen_view' | 'action';

export const FEATURE_IDS = {
  calendar: 'calendar',
  timer: 'timer',
  goals: 'goals',
  tuner: 'tuner',
  settings: 'settings',
  basicPractice: 'basic_practice',
  beginnerGuide: 'beginner_guide',
  musicDictionary: 'music_dictionary',
  statistics: 'statistics',
  scoreAutoScroll: 'score_auto_scroll',
  profileSettings: 'profile_settings',
  myLibrary: 'my_library',
  recordingsLibrary: 'recordings_library',
  instrumentSelection: 'instrument_selection',
  majorSettings: 'major_settings',
  appearanceSettings: 'appearance_settings',
  notificationSettings: 'notification_settings',
  privacySettings: 'privacy_settings',
  appGuide: 'app_guide',
  tutorial: 'tutorial',
  pricingPlans: 'pricing_plans',
  support: 'support',
  representativeSongs: 'representative_songs',
  addGoal: 'add_goal',
  authLogin: 'auth_login',
  authSignup: 'auth_signup',
  learningTools: 'learning_tools',
  helpSupport: 'help_support',
  feedback: 'feedback',
  noteTraining: 'note_training',
  legalInfo: 'legal_info',
} as const;

export type FeatureId = (typeof FEATURE_IDS)[keyof typeof FEATURE_IDS];

/** expo-router パス → feature_id */
export const PATH_TO_FEATURE_ID: Record<string, FeatureId> = {
  '/': FEATURE_IDS.calendar,
  '/index': FEATURE_IDS.calendar,
  '/timer': FEATURE_IDS.timer,
  '/goals': FEATURE_IDS.goals,
  '/tuner': FEATURE_IDS.tuner,
  '/settings': FEATURE_IDS.settings,
  '/basic-practice': FEATURE_IDS.basicPractice,
  '/beginner-guide': FEATURE_IDS.beginnerGuide,
  '/music-dictionary': FEATURE_IDS.musicDictionary,
  '/statistics': FEATURE_IDS.statistics,
  '/score-auto-scroll': FEATURE_IDS.scoreAutoScroll,
  '/profile-settings': FEATURE_IDS.profileSettings,
  '/my-library': FEATURE_IDS.myLibrary,
  '/recordings-library': FEATURE_IDS.recordingsLibrary,
  '/instrument-selection': FEATURE_IDS.instrumentSelection,
  '/main-settings': FEATURE_IDS.instrumentSelection,
  '/major-settings': FEATURE_IDS.majorSettings,
  '/appearance-settings': FEATURE_IDS.appearanceSettings,
  '/notification-settings': FEATURE_IDS.notificationSettings,
  '/privacy-settings': FEATURE_IDS.privacySettings,
  '/app-guide': FEATURE_IDS.appGuide,
  '/tutorial': FEATURE_IDS.tutorial,
  '/pricing-plans': FEATURE_IDS.pricingPlans,
  '/support': FEATURE_IDS.support,
  '/add-goal': FEATURE_IDS.addGoal,
  '/representative-songs': FEATURE_IDS.representativeSongs,
  '/auth/login': FEATURE_IDS.authLogin,
  '/auth/signup': FEATURE_IDS.authSignup,
  '/privacy-policy': FEATURE_IDS.privacySettings,
  '/terms-of-service': FEATURE_IDS.privacySettings,
  '/help-support': FEATURE_IDS.helpSupport,
  '/feedback': FEATURE_IDS.feedback,
  '/note-training': FEATURE_IDS.noteTraining,
  '/legal-info': FEATURE_IDS.legalInfo,
};

export const resolveFeatureIdFromPath = (pathname: string): FeatureId | null => {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (PATH_TO_FEATURE_ID[normalized]) {
    return PATH_TO_FEATURE_ID[normalized];
  }
  const segments = normalized.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && PATH_TO_FEATURE_ID[`/${last}`]) {
    return PATH_TO_FEATURE_ID[`/${last}`];
  }
  return null;
};
