import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'ja' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.ja) => string;
}

const translations = {
  ja: {
    // Navigation
    calendar: 'カレンダー',
    timer: 'タイマー',
    goals: '目標',
    tuner: 'チューナー',
    metronome: 'メトロノーム',
    share: '共有',
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
    
    // Goals
    goalSetting: '目標設定',
    personalShort: '個人目標（短期）',
    personalLong: '個人目標（長期）',
    groupGoal: '団体目標',
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
    
    // Practice
    basicPracticeMenu: 'バイオリンの基礎練メニュー',
    basicPractice: '基礎練',
    beginner: '初級',
    intermediate: '中級',
    advanced: 'マスター',
    
    // Practice Menu
    learningTools: '学習ツール',
    musicDictionary: '音楽用語辞典',
    sightReadingTraining: '譜読みトレーニング',
    
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
    
    // Auth
    login: 'ログイン',
    signup: '新規会員登録',
    email: 'メールアドレス',
    password: 'パスワード',
    confirmPassword: 'パスワード確認',
    
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
    
    // Room Management
    room: '部屋',
    createRoom: '部屋を作成',
    joinRoom: '部屋に入室',
    uploadScore: '楽譜をアップロード',
    members: 'メンバー',
    roomName: '部屋名',
    roomDescription: '部屋の説明',
    roomPassword: '合言葉',
    roomId: '部屋ID',
    nickname: 'ニックネーム',
    scoreTitle: '楽譜タイトル',
    composer: '作曲者',
    pageCount: 'ページ数',
  },
  en: {
    // Navigation
    calendar: 'Calendar',
    timer: 'Timer',
    goals: 'Goals',
    tuner: 'Tuner',
    metronome: 'Metronome',
    share: 'Share',
    practice: 'Practice',
    practiceMenu: 'Learning Tools',
    settings: 'Settings',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset',
    
    // Calendar
    practiceCalendar: 'Practice Calendar',
    addPracticeRecord: 'Add Practice Record',
    practiceTime: 'Practice Time',
    practiceContent: 'Practice Content',
    monthlyTotal: 'Monthly Total Practice Time',
    quickRecord: 'Quick Record',
    
    // Timer
    timerMode: 'Timer',
    stopwatchMode: 'Stopwatch',
    customTimeSetting: 'Custom Time Setting',
    quickSetting: 'Quick Setting',
    practiceCompleted: 'Practice Completed!',
    recordToCalendar: 'Would you like to record this practice time to the calendar?',
    
    // Goals
    goalSetting: 'Goal Setting',
    personalShort: 'Personal Goal (Short-term)',
    personalLong: 'Personal Goal (Long-term)',
    groupGoal: 'Group Goal',
    addNewGoal: 'Add New Goal',
    goalTitle: 'Goal Title',
    goalDescription: 'Description',
    targetDate: 'Target Date',
    progress: 'Progress',
    
    // Tuner
    tunerTitle: 'Tuner',
    referenceSound: 'Reference Sound',
    pitchDetection: 'Pitch Detection',
    tuningTips: 'Tuning Tips',
    
    // Practice
    basicPracticeMenu: 'Violin Basic Practice Menu',
    basicPractice: 'Basic Practice',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Master',
    
    // Practice Menu
    learningTools: 'Learning Tools',
    musicDictionary: 'Music Dictionary',
    sightReadingTraining: 'Sight Reading Training',
    
    // Settings
    other: 'Settings',
    profile: 'Profile Settings',
    appearance: 'Appearance Settings',
    language: 'Language Settings',
    notifications: 'Notification Settings',
    statistics: 'Statistics & Analysis',
    musicLibrary: 'Music Library',
    help: 'Help & Support',
    feedback: 'Feedback',
    privacy: 'Privacy Settings',
    terms: 'Terms of Service',
    logout: 'Logout',
    createNewAccount: 'Create New Account',
    currentlyLoggedIn: 'Currently Logged In',
    
    // Auth
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    
    // Statistics
    statisticsAnalysis: 'Statistics & Analysis',
    practiceStatsSummary: 'Practice Statistics Summary',
    totalPracticeTime: 'Total Practice Time',
    totalPracticeDays: 'Total Practice Days',
    dailyAverage: 'Daily Average (min)',
    weeklyAverage: 'Weekly Average',
    displayPeriod: 'Display Period',
    daily: 'Daily',
    monthly: 'Monthly',
    yearly: 'Yearly',
    
    // Room Management
    room: 'Room',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    uploadScore: 'Upload Score',
    members: 'Members',
    roomName: 'Room Name',
    roomDescription: 'Room Description',
    roomPassword: 'Password',
    roomId: 'Room ID',
    nickname: 'Nickname',
    scoreTitle: 'Score Title',
    composer: 'Composer',
    pageCount: 'Page Count',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ja');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage && (savedLanguage === 'ja' || savedLanguage === 'en')) {
        setLanguageState(savedLanguage);
      }
    } catch (error) {
      // デフォルト言語を使用
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('app_language', lang);
      setLanguageState(lang);
    } catch (error) {
      // 言語保存エラー
    }
  };

  const t = (key: keyof typeof translations.ja): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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