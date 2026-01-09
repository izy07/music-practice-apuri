import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { instrumentService, Instrument } from '@/services';
import { getCurrentUser } from '@/lib/authService';
import { updateSelectedInstrument } from '@/repositories/userRepository';
import { isOnline } from '@/lib/offlineStorage';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { TIMEOUT, ERROR } from '@/lib/constants';

interface PracticeSettings {
  colorChangeThreshold: number;
}

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
  syncStatus: SyncStatus;
  lastSyncError: Error | null;
  lastSyncTime: Date | null;
  isInitializing: boolean;
}

const defaultTheme: Instrument = {
  id: 'default',
  name: 'デフォルト',
  nameEn: 'Default',
  primary: '#4A5568',
  secondary: '#E2E8F0',
  accent: '#2D3748',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#2D3748',
  textSecondary: '#718096',
};

const defaultPracticeSettings: PracticeSettings = {
  colorChangeThreshold: 180,
};

const InstrumentThemeContext = createContext<InstrumentThemeContextType | undefined>(undefined);

export const useInstrumentTheme = () => {
  const context = useContext(InstrumentThemeContext);
  if (!context) {
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
      isInitializing: false,
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
  const { user } = useAuthAdvanced();
  
  const [selectedInstrument, setSelectedInstrumentState] = useState<string>('');
  const [practiceSettings, setPracticeSettingsState] = useState<PracticeSettings>(defaultPracticeSettings);
  const [isCustomTheme, setIsCustomTheme] = useState<boolean>(false);
  const [customTheme, setCustomThemeState] = useState<Instrument | null>(null);
  const [dbInstruments, setDbInstruments] = useState<Instrument[]>(() => {
    const instruments = instrumentService.getDefaultInstruments();
    return instruments.length > 0 ? instruments : [defaultTheme];
  });
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [currentTheme, setCurrentThemeState] = useState<Instrument>(() => {
    const instruments = instrumentService.getDefaultInstruments();
    return instruments.length > 0 ? instruments[0] : defaultTheme;
  });

  const defaultInstruments = useMemo(() => {
    const instruments = instrumentService.getDefaultInstruments();
    return instruments.length > 0 ? instruments : [defaultTheme];
  }, []);

  const instrumentsCacheRef = useRef<Instrument[] | null>(null);
  const initializeDoneRef = useRef(false); // 初期化が完了したかどうかを追跡

  const getKey = useCallback((base: string, userId?: string) => {
    // currentUserIdを依存配列から削除し、直接参照する（無限ループを防ぐ）
    const uid = userId ?? currentUserId;
    return uid ? `${base}:${uid}` : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 楽器データ読み込み中のフラグ（無限ループを防ぐ）
  const isLoadingInstrumentsRef = useRef(false);

  // 楽器データをDBから取得（計画に従って独立した関数として実装）
  // キャッシュ戦略を改善：ContextレベルとRepositoryレベルの両方でキャッシュを使用
  const loadInstrumentsFromDB = useCallback(async (): Promise<void> => {
    // 既に読み込み中の場合はスキップ（無限ループを防ぐ）
    if (isLoadingInstrumentsRef.current) {
      logger.debug('楽器データの読み込みは既に実行中です。スキップします。');
      return;
    }

    try {
      isLoadingInstrumentsRef.current = true;

      // 1. Contextレベルのキャッシュを確認（最優先）
      if (instrumentsCacheRef.current) {
        setDbInstruments(instrumentsCacheRef.current);
        logger.debug('Contextキャッシュから楽器データを即座に読み込み');
        isLoadingInstrumentsRef.current = false;
        return;
      }

      // 2. まずデフォルト楽器を即座に設定（UIの応答性を向上）
      const safeDefaultInstruments = defaultInstruments.length > 0 ? defaultInstruments : [defaultTheme];
      setDbInstruments(safeDefaultInstruments);

      // 3. 認証状態を確認
      const { user: currentUser, error: authError } = await getCurrentUser();

      // 認証されていない場合はデフォルト楽器のみを使用
      if (authError || !currentUser) {
        logger.debug('認証されていないため、デフォルト楽器のみを使用します');
        isLoadingInstrumentsRef.current = false;
        return;
      }

      // 4. 認証されている場合のみ、サービス層経由で楽器データを取得
      // Repositoryレベルでもキャッシュが使用されるため、二重キャッシュで最適化
      const fetchPromise = instrumentService.getAllInstruments();
      const timeoutPromise = new Promise<{ success: false; data: null; error: Error }>((resolve) => {
        setTimeout(() => {
          resolve({
            success: false,
            data: null,
            error: new Error('楽器データ取得がタイムアウトしました'),
          });
        }, TIMEOUT.INSTRUMENT_FETCH_MS);
      });

      const result = await Promise.race([fetchPromise, timeoutPromise]);

      if (result.success && result.data && result.data.length > 0) {
        // 5. データベースから取得した楽器データで更新
        setDbInstruments(result.data);
        // 6. Contextレベルのキャッシュに保存（次回は即座に表示）
        instrumentsCacheRef.current = result.data;
        logger.debug('楽器データをContextキャッシュに保存');
      } else {
        // エラーの場合はローカルのdefaultInstrumentsを使用（既に設定済み）
        // エラー時のフォールバック処理を統一
        if (__DEV__) {
          logger.warn('楽器データの取得に失敗しました。デフォルト楽器を使用します。', result.error);
        }
      }
    } catch (error) {
      logger.error('Error loading instruments from DB:', error);
      ErrorHandler.handle(error, '楽器データ読み込み', false);
      // エラー時のフォールバック処理を統一
      const safeDefaultInstruments = defaultInstruments.length > 0 ? defaultInstruments : [defaultTheme];
      setDbInstruments(safeDefaultInstruments);
    } finally {
      // 読み込み完了時にフラグをリセット
      isLoadingInstrumentsRef.current = false;
    }
  }, [defaultInstruments]);

  // 統一された初期化関数
  // 初期化順序: デフォルト楽器 → AsyncStorage → user.selected_instrument_id → DB
  const initialize = useCallback(async () => {
    // 既に初期化が完了している場合はスキップ（無限ループを防ぐ）
    if (initializeDoneRef.current) {
      logger.debug('初期化は既に完了しています。スキップします。');
      return;
    }

    let cancelled = false;

    try {
      // 1. デフォルト楽器を即座に設定
      const safeDefaultInstruments = defaultInstruments.length > 0 ? defaultInstruments : [defaultTheme];
      setDbInstruments(safeDefaultInstruments);
      setCurrentThemeState(safeDefaultInstruments[0] || defaultTheme);

      // 2. ユーザーIDを取得
      const { user: currentUser } = await getCurrentUser();
      if (cancelled) return;

      const uid = currentUser?.id || '';
      if (uid) {
        setCurrentUserId(uid);
      }

      // 3. AsyncStorageから読み込み（優先順位: user.selected_instrument_id > AsyncStorage > デフォルト）
      const [storedInstrument, storedSettings] = await Promise.all([
        AsyncStorage.getItem(getKey(STORAGE_KEYS.selectedInstrument, uid)),
        AsyncStorage.getItem(getKey(STORAGE_KEYS.practiceSettings, uid)),
      ]);

      // 従来キーのマイグレーション
      const [legacyInstrument, legacySettings] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.selectedInstrument),
        AsyncStorage.getItem(STORAGE_KEYS.practiceSettings),
      ]);

      if (!storedInstrument && legacyInstrument) {
        await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument, uid), legacyInstrument);
        await AsyncStorage.removeItem(STORAGE_KEYS.selectedInstrument);
      }
      if (!storedSettings && legacySettings) {
        await AsyncStorage.setItem(getKey(STORAGE_KEYS.practiceSettings, uid), legacySettings);
        await AsyncStorage.removeItem(STORAGE_KEYS.practiceSettings);
      }

      // 4. データソースの優先順位を明確化: user.selected_instrument_id > AsyncStorage > デフォルト
      // 計画に従って、user.selected_instrument_idを最優先に設定
      let instrumentIdToUse = user?.selected_instrument_id || storedInstrument || '';
      
      if (instrumentIdToUse) {
        setSelectedInstrumentState(instrumentIdToUse);
      }

      // 5. カスタムテーマの処理（楽器IDを含めたキーで読み込み）
      if (instrumentIdToUse) {
        const customThemeKey = `${getKey(STORAGE_KEYS.customTheme, uid)}:${instrumentIdToUse}`;
        const isCustomThemeKey = `${getKey(STORAGE_KEYS.isCustomTheme, uid)}:${instrumentIdToUse}`;
        
        const [storedCustomTheme, storedIsCustomTheme] = await Promise.all([
          AsyncStorage.getItem(customThemeKey),
          AsyncStorage.getItem(isCustomThemeKey),
        ]);
        
        if (storedIsCustomTheme === 'true' && storedCustomTheme) {
          try {
            const parsedTheme = JSON.parse(storedCustomTheme);
            setCustomThemeState(parsedTheme);
            setIsCustomTheme(true);
            setCurrentThemeState(parsedTheme);
            if (!cancelled) {
              setIsInitializing(false);
            }
            return;
          } catch (parseError) {
            logger.error('カスタムテーマのパースエラー:', parseError);
          }
        }
      }

      // 6. 楽器テーマの設定
      if (instrumentIdToUse) {
        const instrument = safeDefaultInstruments.find(inst => inst.id === instrumentIdToUse);
        if (instrument) {
          setCurrentThemeState(instrument);
        }
      }

      // 7. 設定の読み込み
      if (storedSettings) {
        try {
          const parsedSettings = JSON.parse(storedSettings);
          setPracticeSettingsState({ ...defaultPracticeSettings, ...parsedSettings });
        } catch (parseError) {
          logger.error('設定のパースエラー:', parseError);
        }
      }

      // 8. バックグラウンドでDBから楽器データを取得（計画に従ってloadInstrumentsFromDBを確実に呼び出す）
      if (currentUser) {
        // 非ブロッキングで楽器データを取得（初期化をブロックしない）
        loadInstrumentsFromDB().then(async () => {
          // 楽器データ取得後に選択中の楽器のテーマを更新
          if (!cancelled && instrumentIdToUse) {
            // その楽器のカスタムテーマを確認
            const customThemeKey = `${getKey(STORAGE_KEYS.customTheme, uid)}:${instrumentIdToUse}`;
            const isCustomThemeKey = `${getKey(STORAGE_KEYS.isCustomTheme, uid)}:${instrumentIdToUse}`;
            
            const [storedCustomTheme, storedIsCustomTheme] = await Promise.all([
              AsyncStorage.getItem(customThemeKey),
              AsyncStorage.getItem(isCustomThemeKey),
            ]);
            
            if (storedIsCustomTheme === 'true' && storedCustomTheme) {
              try {
                const parsedTheme = JSON.parse(storedCustomTheme);
                setCustomThemeState(parsedTheme);
                setIsCustomTheme(true);
                setCurrentThemeState(parsedTheme);
              } catch (parseError) {
                logger.error('カスタムテーマのパースエラー:', parseError);
                // パースエラーの場合は楽器のデフォルトテーマを使用
                setDbInstruments(prevInstruments => {
                  const dbInstrument = prevInstruments.find(inst => inst.id === instrumentIdToUse);
                  if (dbInstrument) {
                    setCurrentThemeState(dbInstrument);
                  }
                  return prevInstruments;
                });
                setCustomThemeState(null);
                setIsCustomTheme(false);
              }
            } else {
              // カスタムテーマがない場合は楽器のデフォルトテーマを使用
              setDbInstruments(prevInstruments => {
                const dbInstrument = prevInstruments.find(inst => inst.id === instrumentIdToUse);
                if (dbInstrument) {
                  setCurrentThemeState(dbInstrument);
                }
                return prevInstruments;
              });
              setCustomThemeState(null);
              setIsCustomTheme(false);
            }
          }
        }).catch(error => {
          logger.error('loadInstrumentsFromDBエラー:', error);
        });
      }

      if (!cancelled) {
        setIsInitializing(false);
        initializeDoneRef.current = true; // 初期化完了をマーク
      }
    } catch (error) {
      logger.error('初期化エラー:', error);
      ErrorHandler.handle(error, 'InstrumentThemeContext初期化', false);
      if (!cancelled) {
        setIsInitializing(false);
        initializeDoneRef.current = true; // エラー時も初期化完了をマーク（無限ループを防ぐ）
      }
    }
    // loadInstrumentsFromDB、getKey、user?.selected_instrument_idを依存配列から削除
    // loadInstrumentsFromDBはuseCallbackでメモ化されているため、依存配列に含める必要はない
    // getKeyはuseCallbackでメモ化されているが、currentUserIdを直接参照するため、依存配列に含めない
    // user?.selected_instrument_idはinitialize内で直接参照するため、依存配列に含める必要はない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultInstruments]);

  // 認証状態変更時の処理（useAuthAdvancedのuserを監視）
  // onAuthStateChangeのリスナーを削除し、useAuthAdvancedのuserの変更を監視することで重複実行を防ぐ
  useEffect(() => {
    let cancelled = false;

    // ログアウト時（userがnullになった場合）
    if (!user) {
      if (currentUserId) {
        // ログアウト時はストレージをクリア（基本キー）
        AsyncStorage.multiRemove([
          getKey(STORAGE_KEYS.selectedInstrument),
          getKey(STORAGE_KEYS.customTheme),
          getKey(STORAGE_KEYS.isCustomTheme),
          getKey(STORAGE_KEYS.practiceSettings),
        ]).catch((error) => {
          ErrorHandler.handle(error, 'ログアウト時のストレージクリア', false);
        });
        
        // 楽器IDを含むキーもすべて削除（カスタムテーマが楽器ごとに保存されているため）
        AsyncStorage.getAllKeys().then((allKeys) => {
          const themeKeys = allKeys.filter(key => 
            (key.includes('customTheme') || key.includes('isCustomTheme')) &&
            (key.includes(currentUserId) || key.startsWith('customTheme') || key.startsWith('isCustomTheme'))
          );
          
          if (themeKeys.length > 0) {
            AsyncStorage.multiRemove(themeKeys).catch((error) => {
              logger.warn('楽器IDを含むカスタムテーマキーの削除エラー（無視）:', error);
            });
            logger.debug('楽器IDを含むカスタムテーマキーを削除しました:', themeKeys);
          }
        }).catch((error) => {
          logger.warn('カスタムテーマキーの取得エラー（無視）:', error);
        });
        
        if (!cancelled) {
          setSelectedInstrumentState('');
          setCurrentUserId('');
          setDbInstruments(defaultInstruments);
          setCurrentThemeState(defaultInstruments[0] || defaultTheme);
          setIsCustomTheme(false);
          setCustomThemeState(null);
        }
      }
      return;
    }

    // ログイン時（userが存在する場合）
    const newUserId = user.id;
    
    // ユーザーが切り替わった場合（別のユーザーでログインした場合）
    if (currentUserId && currentUserId !== newUserId) {
      AsyncStorage.multiRemove([
        getKey(STORAGE_KEYS.selectedInstrument, currentUserId),
        getKey(STORAGE_KEYS.customTheme, currentUserId),
        getKey(STORAGE_KEYS.isCustomTheme, currentUserId),
        getKey(STORAGE_KEYS.practiceSettings, currentUserId),
      ]).catch((error) => {
        ErrorHandler.handle(error, 'ユーザー切り替え時のストレージクリア', false);
      });
      
      // 以前のユーザーの楽器IDを含むカスタムテーマキーもすべて削除
      AsyncStorage.getAllKeys().then((allKeys) => {
        const themeKeys = allKeys.filter(key => 
          (key.includes('customTheme') || key.includes('isCustomTheme')) &&
          (key.includes(currentUserId) || key.startsWith('customTheme') || key.startsWith('isCustomTheme'))
        );
        
        if (themeKeys.length > 0) {
          AsyncStorage.multiRemove(themeKeys).catch((error) => {
            logger.warn('以前のユーザーのカスタムテーマキー削除エラー（無視）:', error);
          });
          logger.debug('以前のユーザーのカスタムテーマキーを削除しました:', themeKeys);
        }
      }).catch((error) => {
        logger.warn('カスタムテーマキーの取得エラー（無視）:', error);
      });
      
      if (!cancelled) {
        setSelectedInstrumentState('');
        // 以前のユーザーの楽器情報をクリアし、デフォルトテーマに戻す
        setCurrentThemeState(defaultInstruments[0] || defaultTheme);
        setIsCustomTheme(false);
        setCustomThemeState(null);
        // 初期化フラグをリセットして、新しいユーザーで初期化を再実行
        initializeDoneRef.current = false;
      }
    }
    
    // ユーザーIDを更新
    if (!cancelled && currentUserId !== newUserId) {
      setCurrentUserId(newUserId);
      // 新しいユーザーの場合、初期化を再実行
      if (!initializeDoneRef.current) {
        initialize();
      }
    }

    return () => {
      cancelled = true;
    };
  }, [user, currentUserId, getKey, defaultInstruments]);

  // 初期化実行（1回だけ実行）
  useEffect(() => {
    // 既に初期化が完了している場合はスキップ
    if (initializeDoneRef.current) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    timeoutId = setTimeout(() => {
      if (isInitializing) {
        logger.warn('InstrumentThemeContext初期化がタイムアウトしました');
        setIsInitializing(false);
        initializeDoneRef.current = true; // タイムアウト時も初期化完了をマーク
      }
    }, TIMEOUT.INITIALIZATION_MS);

    initialize();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
    // initializeを依存配列から削除（1回だけ実行するため）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 楽器選択の同期処理（唯一のエントリーポイント）
  const setSelectedInstrument = useCallback(async (instrumentId: string) => {
    if (isSyncing) {
      logger.debug('サーバー同期中です。少し待ってから再試行してください。');
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isSyncing) {
        setSelectedInstrumentState(instrumentId);
        await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument), instrumentId);
        return;
      }
    }

    try {
      setIsSyncing(true);
      
      // 1. ローカル状態を即座に更新
      setSelectedInstrumentState(instrumentId);
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument), instrumentId);
      
      // 2. その楽器のカスタムテーマを読み込む
      const customThemeKey = `${getKey(STORAGE_KEYS.customTheme)}:${instrumentId}`;
      const isCustomThemeKey = `${getKey(STORAGE_KEYS.isCustomTheme)}:${instrumentId}`;
      
      const [storedCustomTheme, storedIsCustomTheme] = await Promise.all([
        AsyncStorage.getItem(customThemeKey),
        AsyncStorage.getItem(isCustomThemeKey),
      ]);
      
      if (storedIsCustomTheme === 'true' && storedCustomTheme) {
        try {
          const parsedTheme = JSON.parse(storedCustomTheme);
          setCustomThemeState(parsedTheme);
          setIsCustomTheme(true);
          setCurrentThemeState(parsedTheme);
        } catch (parseError) {
          logger.error('カスタムテーマのパースエラー:', parseError);
          // パースエラーの場合は楽器のデフォルトテーマを使用
          const instrument = dbInstruments.find(inst => inst.id === instrumentId) || 
                             defaultInstruments.find(inst => inst.id === instrumentId);
          if (instrument) {
            setCurrentThemeState(instrument);
          }
          setCustomThemeState(null);
          setIsCustomTheme(false);
        }
      } else {
        // カスタムテーマがない場合は楽器のデフォルトテーマを使用
        const instrument = dbInstruments.find(inst => inst.id === instrumentId) || 
                           defaultInstruments.find(inst => inst.id === instrumentId);
        if (instrument) {
          setCurrentThemeState(instrument);
        }
        setCustomThemeState(null);
        setIsCustomTheme(false);
      }

      // 3. サーバーに同期（認証済みの場合のみ）
      const { user: currentUser } = await getCurrentUser();
      if (currentUser) {
        const online = isOnline();
        if (!online) {
          logger.debug('オフライン状態: サーバー同期を試みますが、失敗する可能性があります。');
        }
        
        setSyncStatus('syncing');
        setLastSyncError(null);
        
        let retryCount = 0;
        const maxRetries = ERROR.MAX_RETRIES;
        let lastError: Error | null = null;

        while (retryCount < maxRetries) {
          const result = await updateSelectedInstrument(currentUser.id, instrumentId);
          if (!result.error) {
            setSyncStatus('success');
            setLastSyncTime(new Date());
            setLastSyncError(null);
            break;
          }

          lastError = result.error instanceof Error ? result.error : new Error(String(result.error));
          retryCount++;

          if (retryCount < maxRetries) {
            const delay = Math.min(
              ERROR.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount - 1),
              ERROR.RETRY_MAX_DELAY_MS
            );
            logger.debug(`サーバー同期失敗、${delay}ms後にリトライ (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        if (lastError && retryCount >= maxRetries) {
          logger.warn('サーバー同期失敗（ローカル保存は成功）:', lastError);
          setLastSyncError(lastError);
          setSyncStatus('error');
        }
      } else {
        setSyncStatus('idle');
      }
    } catch (error) {
      logger.error('楽器選択保存エラー:', error);
      ErrorHandler.handle(error, '楽器選択保存', false);
      setSyncStatus('error');
      setLastSyncError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsSyncing(false);
    }
  }, [getKey, isSyncing, dbInstruments, defaultInstruments]);

  // selectedInstrumentまたはuser.selected_instrument_idが変更されたらテーマを更新
  useEffect(() => {
    const updateThemeForInstrument = async () => {
      const { getEffectiveInstrumentId } = require('@/lib/instrumentUtils');
      const instrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
      if (!instrumentId) return;

      // その楽器のカスタムテーマを確認
      const customThemeKey = `${getKey(STORAGE_KEYS.customTheme)}:${instrumentId}`;
      const isCustomThemeKey = `${getKey(STORAGE_KEYS.isCustomTheme)}:${instrumentId}`;
      
      const [storedCustomTheme, storedIsCustomTheme] = await Promise.all([
        AsyncStorage.getItem(customThemeKey),
        AsyncStorage.getItem(isCustomThemeKey),
      ]);
      
      if (storedIsCustomTheme === 'true' && storedCustomTheme) {
        try {
          const parsedTheme = JSON.parse(storedCustomTheme);
          setCustomThemeState(parsedTheme);
          setIsCustomTheme(true);
          setCurrentThemeState(parsedTheme);
          return;
        } catch (parseError) {
          logger.error('カスタムテーマのパースエラー:', parseError);
        }
      }
      
      // カスタムテーマがない場合は楽器のデフォルトテーマを使用
      const instrument = dbInstruments.find(inst => inst.id === instrumentId) || 
                         defaultInstruments.find(inst => inst.id === instrumentId);
      if (instrument && instrument.id !== currentTheme.id) {
        setCurrentThemeState(instrument);
        setCustomThemeState(null);
        setIsCustomTheme(false);
      }
    };
    
    updateThemeForInstrument();
  }, [selectedInstrument, user?.selected_instrument_id, dbInstruments, defaultInstruments, currentTheme.id, getKey]);

  // currentThemeの計算（カスタムテーマ優先）
  const currentThemeComputed = useMemo(() => {
    if (isCustomTheme && customTheme) {
      return customTheme;
    }
    return currentTheme;
  }, [isCustomTheme, customTheme, currentTheme]);

  const updatePracticeSettings = useCallback(async (newSettings: Partial<PracticeSettings>) => {
    try {
      const updatedSettings = { ...practiceSettings, ...newSettings };
      setPracticeSettingsState(updatedSettings);
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.practiceSettings), JSON.stringify(updatedSettings));
    } catch (error) {
      logger.error('練習設定保存エラー:', error);
      ErrorHandler.handle(error, '練習設定保存', false);
    }
  }, [practiceSettings, getKey]);

  const setCustomTheme = useCallback(async (theme: Instrument) => {
    try {
      const { getEffectiveInstrumentId } = require('@/lib/instrumentUtils');
      const instrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
      
      if (!instrumentId) {
        logger.warn('楽器IDが取得できないため、カスタムテーマを保存できません');
        return;
      }

      // 楽器IDを含めたキーで保存
      const customThemeKey = `${getKey(STORAGE_KEYS.customTheme)}:${instrumentId}`;
      const isCustomThemeKey = `${getKey(STORAGE_KEYS.isCustomTheme)}:${instrumentId}`;
      
      setCustomThemeState(theme);
      setIsCustomTheme(true);
      setCurrentThemeState(theme);
      await AsyncStorage.setItem(customThemeKey, JSON.stringify(theme));
      await AsyncStorage.setItem(isCustomThemeKey, 'true');
      
      logger.debug('カスタムテーマを保存しました', { instrumentId, customThemeKey });
    } catch (error) {
      logger.error('カスタムテーマ保存エラー:', error);
      ErrorHandler.handle(error, 'カスタムテーマ保存', false);
    }
  }, [getKey, selectedInstrument, user?.selected_instrument_id]);

  const resetToInstrumentTheme = useCallback(async () => {
    try {
      const { getEffectiveInstrumentId } = require('@/lib/instrumentUtils');
      const instrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
      
      if (instrumentId) {
        // 楽器IDを含めたキーで削除
        const customThemeKey = `${getKey(STORAGE_KEYS.customTheme)}:${instrumentId}`;
        const isCustomThemeKey = `${getKey(STORAGE_KEYS.isCustomTheme)}:${instrumentId}`;
        
        await AsyncStorage.removeItem(customThemeKey);
        await AsyncStorage.setItem(isCustomThemeKey, 'false');
        
        logger.debug('カスタムテーマをリセットしました', { instrumentId, customThemeKey });
      }
      
      setCustomThemeState(null);
      setIsCustomTheme(false);
      
      if (instrumentId) {
        const instrument = dbInstruments.find(inst => inst.id === instrumentId) || 
                           defaultInstruments.find(inst => inst.id === instrumentId);
        if (instrument) {
          setCurrentThemeState(instrument);
        } else {
          setCurrentThemeState(defaultInstruments[0] || defaultTheme);
        }
      } else {
        setCurrentThemeState(defaultInstruments[0] || defaultTheme);
      }
    } catch (error) {
      logger.error('Theme reset error:', error);
      ErrorHandler.handle(error, 'テーマリセット', false);
    }
  }, [getKey, selectedInstrument, user?.selected_instrument_id, dbInstruments, defaultInstruments]);

  const value = useMemo<InstrumentThemeContextType>(() => ({
    selectedInstrument,
    setSelectedInstrument,
    currentTheme: currentThemeComputed,
    practiceSettings,
    updatePracticeSettings,
    isCustomTheme,
    setCustomTheme,
    resetToInstrumentTheme,
    dbInstruments,
    syncStatus,
    lastSyncError,
    lastSyncTime,
    isInitializing,
  }), [
    selectedInstrument,
    setSelectedInstrument,
    currentThemeComputed,
    practiceSettings,
    updatePracticeSettings,
    isCustomTheme,
    setCustomTheme,
    resetToInstrumentTheme,
    dbInstruments,
    syncStatus,
    lastSyncError,
    lastSyncTime,
    isInitializing,
  ]);

  return (
    <InstrumentThemeContext.Provider value={value}>
      {children}
    </InstrumentThemeContext.Provider>
  );
};
