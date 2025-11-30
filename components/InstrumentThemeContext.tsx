
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { instrumentService, Instrument } from '@/services';
import { getCurrentUser } from '@/lib/authService';
import { getUserProfile, updateSelectedInstrument } from '@/repositories/userRepository';
import { supabase } from '@/lib/supabase';
import { isOnline } from '@/lib/offlineStorage';

// Instrument型はservices/instrumentServiceからインポート

interface PracticeSettings {
  colorChangeThreshold: number; // 色変更の基準時間（分）
}

// 同期状態の型定義
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface InstrumentThemeContextType {
  selectedInstrument: string;
  setSelectedInstrument: (instrumentId: string) => Promise<void>;
  currentTheme: Instrument;
  practiceSettings: PracticeSettings;
  updatePracticeSettings: (settings: Partial<PracticeSettings>) => Promise<void>;
  isCustomTheme: boolean;
  setCustomTheme: (theme: Instrument) => Promise<void>;
  resetToInstrumentTheme: () => Promise<void>;
  dbInstruments: Instrument[];
  syncStatus: SyncStatus; // 同期状態
  lastSyncError: Error | null; // 最後の同期エラー
  lastSyncTime: Date | null; // 最後の同期成功時刻
}

// defaultInstrumentsはinstrumentServiceから取得するため、ここでは定義しない

const defaultTheme: Instrument = {
  id: 'default',
  name: 'デフォルト',
  nameEn: 'Default',
  primary: '#4A5568', // 落ち着いたグレー
  secondary: '#E2E8F0', // 薄いグレー
  accent: '#2D3748', // 濃いグレー
  background: '#F5F5F0', // より濃いグレー
  surface: '#FFFFFF', // 純白
  text: '#2D3748', // 濃いグレー
  textSecondary: '#718096', // 中程度のグレー
};

const defaultPracticeSettings: PracticeSettings = {
  colorChangeThreshold: 180, // デフォルト: 3時間（180分）
};

const InstrumentThemeContext = createContext<InstrumentThemeContextType | undefined>(undefined);

export const useInstrumentTheme = () => {
  const context = useContext(InstrumentThemeContext);
  if (!context) {
    // コンテキストが利用できない場合はデフォルト値を返す
    const defaultInstruments = instrumentService.getDefaultInstruments();
    const defaultContext: InstrumentThemeContextType = {
      selectedInstrument: '',
      setSelectedInstrument: async () => {},
      currentTheme: defaultInstruments[0] || defaultTheme,
      practiceSettings: defaultPracticeSettings,
      updatePracticeSettings: async () => {},
      isCustomTheme: false,
      setCustomTheme: async () => {},
      resetToInstrumentTheme: async () => {},
      dbInstruments: defaultInstruments,
      syncStatus: 'idle',
      lastSyncError: null,
      lastSyncTime: null,
    };
    logger.warn('useInstrumentTheme used outside InstrumentThemeProvider, using default values');
    return defaultContext;
  }
  return context;
};

interface InstrumentThemeProviderProps {
  children?: ReactNode;
}

export const InstrumentThemeProvider: React.FC<InstrumentThemeProviderProps> = ({ children }) => {
  const [selectedInstrument, setSelectedInstrumentState] = useState<string>('');
  const [practiceSettings, setPracticeSettingsState] = useState<PracticeSettings>(defaultPracticeSettings);
  const [isCustomTheme, setIsCustomTheme] = useState<boolean>(false);
  const [customTheme, setCustomThemeState] = useState<Instrument | null>(null);
  const [dbInstruments, setDbInstruments] = useState<Instrument[]>(instrumentService.getDefaultInstruments());
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false); // 競合状態を防ぐためのフラグ
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle'); // 同期状態
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null); // 最後の同期エラー
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null); // 最後の同期成功時刻

  // デフォルト楽器をメモ化（パフォーマンス最適化）
  const defaultInstruments = useMemo(() => instrumentService.getDefaultInstruments(), []);

  // ユーザー別キーを生成（未ログイン時は従来キー）
  // useCallbackでメモ化して、依存関係を明確にする
  const getKey = React.useCallback((base: string, userId?: string) => {
    const uid = userId ?? currentUserId;
    return uid ? `${base}:${uid}` : base;
  }, [currentUserId]);

  // 認証済みかつローカル未設定の場合に、プロフィールから即時同期して初期反映
  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async () => {
      if (cancelled || isSyncing) return;
      
      try {
        setIsSyncing(true);
        setSyncStatus('syncing');
        setLastSyncError(null);
        
        // オフライン状態を確認（ログのみ、同期は試みる）
        const online = isOnline();
        if (!online) {
          logger.debug('オフライン状態: サーバー同期を試みますが、失敗する可能性があります。');
        }
        
        // ユーザー情報を1回だけ取得（サービス層経由）
        const { user, error: userError } = await getCurrentUser();
        if (userError || !user || cancelled) {
          setIsSyncing(false);
          setSyncStatus('idle');
          return;
        }
        
        // サーバー側の楽器選択を確認（リポジトリ層経由）
        const profileResult = await getUserProfile(user.id);
        if (cancelled) {
          setIsSyncing(false);
          return;
        }
        
        const profile = profileResult.data;
        const profileError = profileResult.error;
        
        if (cancelled) {
          setIsSyncing(false);
          return;
        }
        
        if (profileError) {
          ErrorHandler.handle(profileError, 'プロフィール取得（楽器選択同期）', false);
          const syncError = profileError instanceof Error ? profileError : new Error(String(profileError));
          setLastSyncError(syncError);
          setSyncStatus('error');
          setIsSyncing(false);
          return;
        }
        
        // 既に楽器が選択されている場合は、サーバーとの同期のみ行う
        if (selectedInstrument) {
          if (profile?.selected_instrument_id && profile.selected_instrument_id !== null && profile.selected_instrument_id !== selectedInstrument) {
            // サーバー側が異なる場合は、サーバー側に合わせる
            if (!cancelled) {
              setSelectedInstrumentState(profile.selected_instrument_id);
              await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument), profile.selected_instrument_id);
            }
          }
          setIsSyncing(false);
          return;
        }
        
        // 楽器が未選択の場合のみ、サーバーから取得
        if (profile?.selected_instrument_id && profile.selected_instrument_id !== null) {
          // サーバーに楽器選択がある場合は、それを設定
          if (!cancelled) {
            setSelectedInstrumentState(profile.selected_instrument_id);
            await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument), profile.selected_instrument_id);
          }
        } else {
          // 初回ログインなどでサーバーに未設定の場合、端末に残っている前ユーザーの選択をクリア
          if (!cancelled) {
            await AsyncStorage.removeItem(getKey(STORAGE_KEYS.selectedInstrument));
            setSelectedInstrumentState('');
          }
        }
        setIsSyncing(false);
        setSyncStatus('success');
        setLastSyncTime(new Date());
        setLastSyncError(null);
      } catch (error) {
        if (!cancelled) {
          ErrorHandler.handle(error, 'サーバー同期', false);
          const syncError = error instanceof Error ? error : new Error(String(error));
          setLastSyncError(syncError);
          setSyncStatus('error');
        } else {
          setSyncStatus('idle');
        }
        setIsSyncing(false);
      }
    };

    hydrateFromServer();

    // 認証状態が変わった時にも再同期（ただし楽器が未選択の場合のみ）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: { user?: { id: string } } | null) => {
      if (cancelled) return;
      
      if (event === 'SIGNED_OUT') {
        // ログアウト時にローカルストレージをクリア
        try {
          await AsyncStorage.multiRemove([
            getKey(STORAGE_KEYS.selectedInstrument),
            getKey(STORAGE_KEYS.customTheme),
            getKey(STORAGE_KEYS.isCustomTheme),
            getKey(STORAGE_KEYS.practiceSettings),
          ]);
          if (!cancelled) {
            setSelectedInstrumentState('');
            setCurrentUserId('');
            // 楽器データをデフォルトにリセット（データベースアクセスを停止）
            setDbInstruments(defaultInstruments);
            logger.debug('ログアウト: 楽器データをデフォルトにリセットしました');
          }
        } catch (error) {
          ErrorHandler.handle(error, 'ログアウト時のストレージクリア', false);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        // ユーザーIDが変わった場合は、ローカルストレージをクリア
        const newUserId = session.user.id;
        if (currentUserId && currentUserId !== newUserId) {
          logger.debug('ユーザー切り替え検出 - ローカルストレージをクリア');
          try {
            await AsyncStorage.multiRemove([
              getKey(STORAGE_KEYS.selectedInstrument, currentUserId),
              getKey(STORAGE_KEYS.customTheme, currentUserId),
              getKey(STORAGE_KEYS.isCustomTheme, currentUserId),
              getKey(STORAGE_KEYS.practiceSettings, currentUserId),
            ]);
            if (!cancelled) {
              setSelectedInstrumentState('');
            }
          } catch (error) {
            ErrorHandler.handle(error, 'ユーザー切り替え時のストレージクリア', false);
          }
        }
        if (!cancelled) {
          setCurrentUserId(newUserId);
          hydrateFromServer();
        }
      }
    });

    return () => {
      cancelled = true;
      try {
        subscription.unsubscribe();
      } catch (error) {
        logger.warn('認証状態変更リスナーの解除エラー:', error);
      }
    };
  }, [selectedInstrument, currentUserId, getKey, isSyncing]);

  const loadInstrumentsFromDB = React.useCallback(async () => {
    try {
      // 認証状態を確認（サービス層経由）
      const { user, error: authError } = await getCurrentUser();
      
      // 認証されていない場合はデフォルト楽器のみを使用（データベースアクセスをスキップ）
      if (authError || !user) {
        logger.debug('認証されていないため、デフォルト楽器のみを使用します');
        // defaultInstrumentsは既にメモ化されているため、再利用
        setDbInstruments(defaultInstruments);
        return;
      }
      
      // 認証されている場合のみ、サービス層経由で楽器データを取得（データベースとローカルの色設定をマージ）
      const result = await instrumentService.getAllInstruments();
      
      if (result.success && result.data) {
        setDbInstruments(result.data);
      } else {
        // エラーの場合はローカルのdefaultInstrumentsを使用
        logger.warn('楽器データの取得に失敗しました。デフォルト楽器を使用します。', result.error);
        setDbInstruments(defaultInstruments);
      }
    } catch (error) {
      logger.error('Error loading instruments from DB:', error);
      ErrorHandler.handle(error, '楽器データ読み込み', false);
      // エラーの場合はローカルのdefaultInstrumentsを使用
      setDbInstruments(defaultInstruments);
    }
  }, [defaultInstruments]);

  const loadStoredData = React.useCallback(async () => {
    try {
      // 現在ユーザー（サービス層経由）
      const { user, error: userError } = await getCurrentUser();
      const uid = user?.id || '';
      if (uid) setCurrentUserId(uid);

      // まずユーザー別キーから読む
      let [storedInstrument, storedSettings, storedCustomTheme, storedIsCustomTheme] = await Promise.all([
        AsyncStorage.getItem(getKey(STORAGE_KEYS.selectedInstrument, uid)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.practiceSettings, uid)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.customTheme, uid)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.isCustomTheme, uid)),
      ]);

      // 従来キーが残っている場合はマイグレーションして削除
      const [legacyInstrument, legacySettings, legacyCustomTheme, legacyIsCustomTheme] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.selectedInstrument),
        AsyncStorage.getItem(STORAGE_KEYS.practiceSettings),
        AsyncStorage.getItem(STORAGE_KEYS.customTheme),
        AsyncStorage.getItem(STORAGE_KEYS.isCustomTheme),
      ]);
      
      if (!storedInstrument && legacyInstrument) {
        storedInstrument = legacyInstrument;
        await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument, uid), legacyInstrument);
        await AsyncStorage.removeItem(STORAGE_KEYS.selectedInstrument);
      }
      if (!storedSettings && legacySettings) {
        storedSettings = legacySettings;
        await AsyncStorage.setItem(getKey(STORAGE_KEYS.practiceSettings, uid), legacySettings);
        await AsyncStorage.removeItem(STORAGE_KEYS.practiceSettings);
      }
      if (!storedCustomTheme && legacyCustomTheme) {
        storedCustomTheme = legacyCustomTheme;
        await AsyncStorage.setItem(getKey(STORAGE_KEYS.customTheme, uid), legacyCustomTheme);
        await AsyncStorage.removeItem(STORAGE_KEYS.customTheme);
      }
      if (!storedIsCustomTheme && legacyIsCustomTheme) {
        storedIsCustomTheme = legacyIsCustomTheme;
        await AsyncStorage.setItem(getKey(STORAGE_KEYS.isCustomTheme, uid), legacyIsCustomTheme);
        await AsyncStorage.removeItem(STORAGE_KEYS.isCustomTheme);
      }

      if (user && storedInstrument) {
        setSelectedInstrumentState(storedInstrument);
      } else if (!user && storedInstrument) {
        await AsyncStorage.removeItem(getKey(STORAGE_KEYS.selectedInstrument, uid));
        setSelectedInstrumentState('');
      }

      if (storedSettings) {
        try {
          const parsedSettings = JSON.parse(storedSettings);
          setPracticeSettingsState({ ...defaultPracticeSettings, ...parsedSettings });
        } catch (parseError) {
          logger.error('設定のパースエラー:', parseError);
          ErrorHandler.handle(parseError, '設定パース', false);
        }
      }

      if (storedCustomTheme) {
        try {
          setCustomThemeState(JSON.parse(storedCustomTheme));
        } catch (parseError) {
          logger.error('カスタムテーマのパースエラー:', parseError);
          ErrorHandler.handle(parseError, 'カスタムテーマパース', false);
        }
      }

      if (storedIsCustomTheme) {
        setIsCustomTheme(storedIsCustomTheme === 'true');
      }
    } catch (error) {
      logger.error('ローカルデータ読み込みエラー:', error);
      ErrorHandler.handle(error, 'ローカルデータ読み込み', false);
    }
  }, [getKey]);

  // 初期化処理（マウント時のみ実行）
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        // 初期化開始時は同期状態をリセット
        setSyncStatus('idle');
        setLastSyncError(null);
        
        // まずユーザーIDを取得（サービス層経由）
        const { user, error: authError } = await getCurrentUser();
        if (cancelled) return;
        
        if (user) {
          setCurrentUserId(user.id);
        }
        
        // 認証状態を確認してからデータを読み込む
        // 認証されている場合のみ楽器データを取得（loadInstrumentsFromDB内でもチェックされるが、ここでも確認）
        if (user) {
          await Promise.all([
            loadStoredData(),
            loadInstrumentsFromDB(),
          ]);
          // 初期化完了後、認証済みユーザーの場合はサーバー同期を試みる
          // hydrateFromServerは別のuseEffectで実行されるため、ここでは状態のみ設定
        } else {
          // 認証されていない場合は、ローカルデータのみ読み込み（楽器データはデフォルトを使用）
          await loadStoredData();
          // デフォルト楽器を設定（loadInstrumentsFromDBは認証チェックでデフォルトを設定する）
          await loadInstrumentsFromDB();
          // 未認証の場合は同期不要
          setSyncStatus('idle');
        }
      } catch (error) {
        if (!cancelled) {
          logger.error('初期化エラー:', error);
          ErrorHandler.handle(error, 'InstrumentThemeContext初期化', false);
          const initError = error instanceof Error ? error : new Error(String(error));
          setLastSyncError(initError);
          setSyncStatus('error');
        }
      }
    };
    
    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadStoredData, loadInstrumentsFromDB]);

  const setSelectedInstrument = React.useCallback(async (instrumentId: string) => {
    // 同期中の場合は待機（競合状態を防ぐ）
    if (isSyncing) {
      logger.debug('サーバー同期中です。少し待ってから再試行してください。');
      // 短い待機後にリトライ
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isSyncing) {
        // まだ同期中の場合は、ローカルのみ更新してサーバー同期は後で行う
        setSelectedInstrumentState(instrumentId);
        await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument), instrumentId);
        return;
      }
    }

    try {
      // まずローカル状態を更新（オフライン時でも即座に反映）
      // オフライン対応: ローカル保存は常に成功し、サーバー同期は後で自動的に再試行される
      setSelectedInstrumentState(instrumentId);
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument), instrumentId);
      
      // サーバーにも同期（認証済みの場合のみ）
      const { user } = await getCurrentUser();
      if (user) {
        // オフライン状態を確認（ログのみ、同期は試みる）
        const online = isOnline();
        if (!online) {
          logger.debug('オフライン状態: サーバー同期を試みますが、失敗する可能性があります。後で自動的に再同期されます。');
        }
        
        setSyncStatus('syncing');
        setLastSyncError(null);
        
        let retryCount = 0;
        const maxRetries = 3;
        let lastError: Error | null = null;

        while (retryCount < maxRetries) {
          const result = await updateSelectedInstrument(user.id, instrumentId);
          if (!result.error) {
            // 成功
            setSyncStatus('success');
            setLastSyncTime(new Date());
            setLastSyncError(null);
            break;
          }

          lastError = result.error instanceof Error ? result.error : new Error(String(result.error));
          retryCount++;

          if (retryCount < maxRetries) {
            // 指数バックオフでリトライ
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
            logger.debug(`サーバー同期失敗、${delay}ms後にリトライ (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        if (lastError && retryCount >= maxRetries) {
          logger.warn('サーバー同期失敗（ローカル保存は成功）:', lastError);
          setLastSyncError(lastError);
          setSyncStatus('error');
          // オフライン対応: ローカル保存は成功しているため、ユーザーには通知しない
          // 次回のhydrateFromServerで自動的に再同期される（ネットワーク復旧時）
        }
      } else {
        // 未認証の場合は同期状態をリセット
        setSyncStatus('idle');
      }
    } catch (error) {
      logger.error('楽器選択保存エラー:', error);
      ErrorHandler.handle(error, '楽器選択保存', false);
    }
  }, [getKey, isSyncing]);

  const updatePracticeSettings = React.useCallback(async (newSettings: Partial<PracticeSettings>) => {
    try {
      const updatedSettings = { ...practiceSettings, ...newSettings };
      setPracticeSettingsState(updatedSettings);
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.practiceSettings), JSON.stringify(updatedSettings));
    } catch (error) {
      logger.error('練習設定保存エラー:', error);
      ErrorHandler.handle(error, '練習設定保存', false);
    }
  }, [practiceSettings, getKey]);

  const currentTheme = useMemo(() => {
    if (isCustomTheme && customTheme) {
      return customTheme;
    }
    
    if (!selectedInstrument) {
      return defaultTheme;
    }
    
    // データベースから読み込んだ楽器を優先、フォールバックとしてデフォルト楽器
    // defaultInstrumentsは既にメモ化されているため、毎回取得する必要はない
    const instrument = dbInstruments.find(inst => inst.id === selectedInstrument) || 
                       defaultInstruments.find(inst => inst.id === selectedInstrument);
    
    return instrument || defaultTheme;
  }, [isCustomTheme, customTheme, selectedInstrument, dbInstruments, defaultInstruments]);

  const setCustomTheme = React.useCallback(async (theme: Instrument) => {
    try {
      setCustomThemeState(theme);
      setIsCustomTheme(true);
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.customTheme), JSON.stringify(theme));
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.isCustomTheme), 'true');
    } catch (error) {
      logger.error('カスタムテーマ保存エラー:', error);
      ErrorHandler.handle(error, 'カスタムテーマ保存', false);
    }
  }, [getKey]);

  const resetToInstrumentTheme = React.useCallback(async () => {
    try {
      setCustomThemeState(null);
      setIsCustomTheme(false);
      await AsyncStorage.removeItem(getKey(STORAGE_KEYS.customTheme));
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.isCustomTheme), 'false');
      
      // 楽器選択がある場合は、dbInstrumentsから取得（データベースの最新情報を使用）
      // currentThemeのuseMemoが自動的に更新されるため、特別な更新は不要
    } catch (error) {
      logger.error('Theme reset error:', error);
      ErrorHandler.handle(error, 'テーマリセット', false);
    }
  }, [getKey]);

  const value = useMemo<InstrumentThemeContextType>(() => ({
    selectedInstrument,
    setSelectedInstrument,
    currentTheme,
    practiceSettings,
    updatePracticeSettings,
    isCustomTheme,
    setCustomTheme,
    resetToInstrumentTheme,
    dbInstruments,
    syncStatus,
    lastSyncError,
    lastSyncTime,
  }), [
    selectedInstrument,
    setSelectedInstrument,
    currentTheme,
    practiceSettings,
    updatePracticeSettings,
    isCustomTheme,
    setCustomTheme,
    resetToInstrumentTheme,
    dbInstruments,
    syncStatus,
    lastSyncError,
    lastSyncTime,
  ]);

  return (
    <InstrumentThemeContext.Provider value={value}>
      {children}
    </InstrumentThemeContext.Provider>
  );
};
