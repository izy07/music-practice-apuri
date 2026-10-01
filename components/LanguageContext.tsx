import React, { createContext, useContext } from 'react';

interface LanguageContextType {
  t: (key: keyof typeof translations) => string;
  /** @deprecated 日本語のみ対応のため常に 'ja' */
  language: 'ja';
  /** @deprecated 言語切り替えは廃止 */
  setLanguage: (lang: 'ja') => void;
}

const translations = {
  // Navigation
  calendar: 'カレンダー',
    timer: 'タイマー',
    goals: '目標',
    tuner: 'チューナー',
    metronome: 'メトロノーム',
    practice: '基礎練',
    practiceMenu: '学習ツール',
    settings: 'その他',
    
    // Common
    save: '保存',
    cancel: 'キャンセル',
    delete: '削除',
    edit: '編集',
    add: '追加',
    close: '閉じる',
    start: 'スタート',
    pause: '一時停止',
    reset: 'リセット',
    search: '検索',
    done: '完了',
    copy: 'コピー',
    copyCompleted: 'コピー完了',
    copiedToClipboard: 'がクリップボードにコピーされました',
    
    // Calendar
    practiceCalendar: '練習カレンダー',
    addPracticeRecord: '練習記録を追加',
    practiceTime: '練習時間',
    practiceContent: '練習内容',
    monthlyTotal: '今月の合計練習時間',
    quickRecord: 'クイック記録',
    
    // Timer
    timerMode: 'タイマー',
    stopwatchMode: 'ストップウォッチ',
    customTimeSetting: 'カスタム時間設定',
    quickSetting: 'クイック設定',
    practiceCompleted: '練習完了！',
    recordToCalendar: 'この練習時間をカレンダーに記録しますか？',
    hours: '時間',
    minutes: '分',
    seconds: '秒',
    apply: '適用',
    autoRecord: '次回から自動で記録',
    autoRecordDescription: 'タイマー完了時に自動で練習記録を保存',
    soundOnCompletion: '完了時にサウンド',
    soundOnCompletionDescription: 'タイマー完了時に通知音を再生',
    pleaseSetTimerTime: 'タイマー時間を設定してください',
    settingsCompleted: '設定完了',
    willAutoRecordNextTime: '次回から自動で記録されます',
    timerSetTo: '{time}に設定しました',
    pleaseSetValidTime: '有効な時間を設定してください',
    failedToSavePracticeRecord: '練習記録の保存に失敗しました',
    
    // Goals
    goalSetting: '目標設定',
    personalShort: '個人目標（短期）',
    personalLong: '個人目標（長期）',
    addNewGoal: '新しい目標を追加',
    goalTitle: '目標タイトル',
    goalDescription: '詳細説明',
    targetDate: '目標期日',
    progress: '進捗',
    
    // Tuner
    tunerTitle: 'チューナー',
    referenceSound: '基準音再生',
    pitchDetection: '音程検出',
    tuningTips: 'チューニングのコツ',
    cents: 'セント',
    frequency: '周波数',
    featureUnavailable: '機能停止',
    tunerUnavailable: 'チューナー機能は現在利用できません。',
    notSupported: '未対応',
    openStringWebOnly: '開放弦の音はWebでのみ再生できます。',
    failedToPlaySound: '音の再生に失敗しました。',
    
    // Practice
    basicPracticeMenu: 'バイオリンの基礎練メニュー',
    basicPractice: '基礎練',
    beginner: '初級',
    intermediate: '中級',
    advanced: 'マスター',
    basicPracticeMenuFor: '{instrument}の基礎練メニュー',
    
    // Practice Menu
    learningTools: '学習ツール',
    musicDictionary: '音楽用語辞典',
    sightReadingTraining: '譜読みトレーニング',
    
    // Beginner Guide
    faq: 'よくあるQ&A',
    overview: '楽器の基本情報',
    basicPlaying: '基本的な演奏方法',
    fingering: '運指表',
    terminology: '基本楽器用語',
    maintenance: 'メンテナンス',
    tips: '練習のコツ',
    resources: '参考資料',
    basicStructure: '基本構造',
    charm: '魅力',
    history: '歴史・背景',
    features: '特徴',
    famousMusicians: '有名な演奏家',
    howToHold: '楽器の持ち方・構え方',
    howToMakeSound: '基本的な音の出し方',
    fingeringBasics: '基本的な運指表',
    howToUseFingering: '運指表の使い方',
    correctPosture: '正しい姿勢',
    bowHold: '弓の持ち方',
    handPosition: '手の位置',
    leftHand: '左手の使い方',
    embouchure: 'アンブシュア',
    strumming: 'ストラミング（ギター）',
    breathing: '呼吸法（管楽器）',
    fingerUsage: '指の使い方・運指の基礎',
    basicInfo: '基本情報',
    playingMethod: '演奏方法',
    care: 'お手入れ',
    advice: 'アドバイス',
    guide: 'ガイド',
    loading: '読み込み中...',
    maintenanceFrequency: 'メンテナンス頻度の目安',
    practiceTipsAndMindset: '練習のコツ・心構え',
    instrumentGuide: '{instrument}ガイド',
    dailyCare: '日常的なお手入れ',
    storageMethod: '保管方法',
    cleaningFrequency: '洗浄頻度の目安',
    precautions: '注意事項',
    requiredSupplies: '必要な用品',
    beginnerAdvice: '初心者向けアドバイス',
    commonMistakes: 'よくある間違いと対策',
    improvementPoints: '上達のためのポイント',
    tutorialVideos: '解説動画',
    
    // Settings
    other: 'その他',
    profile: 'プロフィール設定',
    appearance: '外観設定',
    language: '言語設定',
    notifications: '通知設定',
    statistics: '統計・分析',
    musicLibrary: '楽曲ライブラリ',
    help: 'ヘルプ・サポート',
    feedback: 'フィードバック',
    privacy: 'プライバシー設定',
    terms: '利用規約',
    logout: 'ログアウト',
    createNewAccount: '新規アカウント作成',
    currentlyLoggedIn: 'ログイン中',
    profileSettings: 'プロフィール設定',
    profileSettingsSubtitle: '個人情報・楽器設定',
    myLibrary: 'マイライブラリ',
    myLibrarySubtitle: '楽曲を整理する',
    recordingsLibrary: '録音ライブラリ',
    recordingsLibrarySubtitle: '演奏を時系列で確認',
    mainFeatures: '主要機能',
    mainFeaturesSubtitle: '楽器選択・外観設定',
    tutorial: '使い方ガイド',
    tutorialSubtitle: '機能の詳しい説明',
    notificationSettings: '通知設定',
    notificationSettingsSubtitle: '練習リマインダー・通知方法',
    languageSettings: '言語設定',
    languageSettingsSubtitle: '日本語・English',
    privacySettings: 'プライバシー設定',
    privacySettingsSubtitle: '利用規約・プライバシーポリシー',
    feedbackTitle: 'フィードバック',
    feedbackSubtitle: 'アプリをシェア・レビュー・ランキング',
    logoutTitle: 'ログアウト',
    logoutSubtitle: 'アカウントからログアウト',
    logoutConfirm: 'ログアウト確認',
    logoutMessage: 'ログアウトしますか？\n\nログアウト一個上に配置してあるフィードバックにご協力お願いします',
    logoutFailed: 'ログアウトに失敗しました',
    logoutError: 'ログアウト処理中にエラーが発生しました',
    mainFeaturesSettings: '主要機能設定',
    tunerSettings: 'チューナー',
    instrumentSelection: '楽器選択',
    practiceLevel: '演奏レベル',
    appearanceSettings: '外観設定',
    themeLoading: 'テーマの読み込み中...',
    
    // Auth
    login: 'ログイン',
    signup: '新規会員登録',
    email: 'メールアドレス',
    password: 'パスワード',
    confirmPassword: 'パスワード確認',
    loginRequired: 'ログインが必要です',
    
    // Statistics
    statisticsAnalysis: '統計・分析',
    practiceStatsSummary: '練習統計サマリー',
    totalPracticeTime: '総練習時間',
    totalPracticeDays: '総練習日数',
    dailyAverage: '日平均（分）',
    weeklyAverage: '週平均',
    displayPeriod: '表示期間',
    daily: '日毎',
    monthly: '月毎',
    yearly: '年毎',
    averagePracticeTime: '平均練習時間',
    longestPracticeTime: '最長練習時間',
    practiceDays: '練習日数',
    practicedMonths: '練習した月数',
    practicedSections: '練習した区分数',
    weeklyStats: '週別統計',
    monthlyStats: '月別統計',
    yearlyStats: '年別統計',
    detailedAnalysis: '詳細分析',
    basicStats: '基礎統計',
    longestConsecutiveDays: '最長連続練習日',
    practiceIntensityStats: '練習強度別統計',
    shortTime: '短時間（30分未満）',
    mediumTime: '中時間（30-180分未満）',
    longTime: '長時間（180分以上）',
    times: '回',
    days: '日',
    months: 'ヶ月',
    sections: '区分',
    weekByWeek: '週別',
    monthByMonth: '月別',
    practiceFrequency: '練習頻度',
    weeklyPracticePattern: '週間練習パターン',
    monthlyPracticeTrend: '月別練習傾向（最近6ヶ月）',
    totalPracticeCount: '総練習回数',
    averageDaysPerWeek: '平均日数/週',
    dayOfWeek: '曜日',
    last6Months: '最近6ヶ月',

    error: 'エラー',
    success: '成功',
    description: '説明',
    unknown: '不明',
    info: '情報',
  };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const t = (key: keyof typeof translations): string => {
    return (translations as Record<string, string>)[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ t, language: 'ja', setLanguage: async () => {} }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};