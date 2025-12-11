
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { instrumentService, Instrument } from '@/services';
import { getCurrentUser } from '@/lib/authService';
import { getUserProfile, updateSelectedInstrument } from '@/repositories/userRepository';
import { supabase } from '@/lib/supabase';
import { isOnline } from '@/lib/offlineStorage';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';

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
  isInitializing: boolean; // 初期化中かどうか
}

// defaultInstrumentsはinstrumentServiceから取得するため、ここでは定義しない

const defaultTheme: Instrument = {
  id: 'default',
  name: 'デフォルト',
  nameEn: 'Default',
  primary: '#4A5568', // 落ち着いたグレー
  secondary: '#E2E8F0', // 薄いグレー
  accent: '#2D3748', // 濃いグレー
  background: '#FFFFFF', // 白（灰色を削除）
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
  // useAuthAdvancedからuser.selected_instrument_idを取得（最優先で使用）
  const { user } = useAuthAdvanced();
  
  const [selectedInstrument, setSelectedInstrumentState] = useState<string>('');
  const [practiceSettings, setPracticeSettingsState] = useState<PracticeSettings>(defaultPracticeSettings);
  const [isCustomTheme, setIsCustomTheme] = useState<boolean>(false);
  const [customTheme, setCustomThemeState] = useState<Instrument | null>(null);
  // 初期状態でも黒にならないように、デフォルト楽器を設定
  // defaultThemeは定数なので、useMemoの依存関係に含めない
  const getInitialInstruments = () => {
    const instruments = instrumentService.getDefaultInstruments();
    return instruments.length > 0 ? instruments : [defaultTheme];
  };
  
  const [dbInstruments, setDbInstruments] = useState<Instrument[]>(getInitialInstruments());
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false); // 競合状態を防ぐためのフラグ
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle'); // 同期状態
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null); // 最後の同期エラー
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null); // 最後の同期成功時刻
  const [isInitializing, setIsInitializing] = useState<boolean>(true); // 初期化中かどうか
  // 初期化時に黒を防ぐため、デフォルトテーマを初期値として設定
  const [initialTheme, setInitialTheme] = useState<Instrument | null>(() => {
    // 初期化時に即座にデフォルトテーマを設定（黒を防ぐ）
    const instruments = instrumentService.getDefaultInstruments();
    return instruments.length > 0 ? instruments[0] : defaultTheme;
  }); // 初期化時のテーマ（色の変化を防ぐため）

  // デフォルト楽器をメモ化（パフォーマンス最適化）
  // 読み込み中でも黒にならないように、必ず有効な楽器データを返す
  const defaultInstruments = useMemo(() => {
    const instruments = instrumentService.getDefaultInstruments();
    // 空の場合はデフォルトテーマを含む配列を返す（黒を防ぐため）
    return instruments.length > 0 ? instruments : [defaultTheme];
  }, []);

  // ユーザー別キーを生成（未ログイン時は従来キー）
  // useCallbackでメモ化して、依存関係を明確にする
  const getKey = React.useCallback((base: string, userId?: string) => {
    const uid = userId ?? currentUserId;
    return uid ? `${base}:${uid}` : base;
  }, [currentUserId]);

  // 認証状態変更時の処理（ログアウト時のみ実行）
  // 楽器選択と背景色は主要機能設定で変更される時以外は固定のため、
  // リロード時にサーバーから読み込む必要はない
  useEffect(() => {
    let cancelled = false;

    // 認証状態が変わった時の処理（ログアウト時のみ）
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
            // 楽器データをデフォルトにリセット
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
  }, [currentUserId, getKey]);

  // 楽器データのキャッシュ（遅延を完全に無くす）
  const instrumentsCacheRef = useRef<Instrument[] | null>(null);
  
  const loadInstrumentsFromDB = React.useCallback(async () => {
    try {
      // キャッシュがある場合は即座に使用（遅延ゼロ）
      if (instrumentsCacheRef.current) {
        setDbInstruments(instrumentsCacheRef.current);
        logger.debug('キャッシュから楽器データを即座に読み込み（遅延ゼロ）');
      }
      
      // まずデフォルト楽器を即座に設定（UIの応答性を向上・黒を防ぐ）
      // 必ず有効な楽器データを設定（空の配列にならないように）
      const safeDefaultInstruments = defaultInstruments.length > 0 ? defaultInstruments : [defaultTheme];
      if (!instrumentsCacheRef.current) {
        setDbInstruments(safeDefaultInstruments);
      }
      
      // 認証状態を確認（サービス層経由）
      const { user, error: authError } = await getCurrentUser();
      
      // 認証されていない場合はデフォルト楽器のみを使用（データベースアクセスをスキップ）
      if (authError || !user) {
        logger.debug('認証されていないため、デフォルト楽器のみを使用します');
        // 既にデフォルト楽器を設定済み
        return;
      }
      
      // 認証されている場合のみ、サービス層経由で楽器データを取得（データベースとローカルの色設定をマージ）
      // 非同期で読み込み、完了後に更新（デフォルト楽器は既に設定済み）
      const result = await instrumentService.getAllInstruments();
      
      if (result.success && result.data && result.data.length > 0) {
        // データベースから取得した楽器データで更新（空でない場合のみ）
        setDbInstruments(result.data);
        // キャッシュに保存（次回は即座に表示）
        instrumentsCacheRef.current = result.data;
        logger.debug('楽器データをキャッシュに保存');
      } else {
        // エラーの場合はローカルのdefaultInstrumentsを使用（既に設定済み）
        if (__DEV__) {
          logger.warn('楽器データの取得に失敗しました。デフォルト楽器を使用します。', result.error);
        }
        // 既にデフォルト楽器を設定済みのため、何もしない（黒を防ぐ）
      }
    } catch (error) {
      logger.error('Error loading instruments from DB:', error);
      ErrorHandler.handle(error, '楽器データ読み込み', false);
      // エラーの場合はローカルのdefaultInstrumentsを使用（既に設定済み）
      // 既にデフォルト楽器を設定済みのため、何もしない（黒を防ぐ）
      // 空の配列にならないように、必ず有効な楽器データを保持
      const safeDefaultInstruments = defaultInstruments.length > 0 ? defaultInstruments : [defaultTheme];
      setDbInstruments(safeDefaultInstruments);
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
      
      // 初期テーマは既にloadExistingThemeで設定されているため、ここでは更新しない
      // 楽器選択と背景色は既にローカルストレージから読み込まれているため、
      // ここでは状態の更新のみ行う（テーマの設定はloadExistingThemeで既に完了）
      // カスタムテーマが設定されている場合は、initialThemeも更新（loadExistingThemeで設定済みの可能性があるが、念のため）
      if (storedIsCustomTheme === 'true' && storedCustomTheme) {
        try {
          const parsedTheme = JSON.parse(storedCustomTheme);
          // 既にinitialThemeが設定されている場合は更新しない（既存のテーマを保持）
          if (!initialTheme || initialTheme.id !== parsedTheme.id) {
            setInitialTheme(parsedTheme);
          }
        } catch (parseError) {
          // エラーは無視（既に処理されている）
        }
      } else if (user && storedInstrument) {
        // 楽器が選択されている場合は、その楽器のテーマを使用
        // デフォルト楽器から即座に取得（dbInstrumentsは後で読み込まれる）
        const instrument = defaultInstruments.find(inst => inst.id === storedInstrument);
        if (instrument) {
          // 既にinitialThemeが設定されている場合は更新しない（既存のテーマを保持）
          if (!initialTheme || initialTheme.id !== instrument.id) {
            setInitialTheme(instrument);
          }
        }
      }
      // それ以外の場合は、既に設定されているinitialThemeを維持（変更しない）
    } catch (error) {
      logger.error('ローカルデータ読み込みエラー:', error);
      ErrorHandler.handle(error, 'ローカルデータ読み込み', false);
    }
  }, [getKey, initialTheme, defaultInstruments]);

  // 初期化処理（マウント時のみ実行）
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // 既存のテーマを即座に読み込む（色の変化を完全に防ぐ）
    // 楽器選択と背景色はローカルストレージから即座に読み込む（データベース読み込みは不要）
    const loadExistingTheme = async () => {
      try {
        // 1. AsyncStorageから読み込む（selectedInstrument状態を優先するため）
        // 楽器選択と背景色はローカルストレージから即座に読み込む
        // 非同期処理だが、initialThemeの初期値は既に設定されているため問題ない
        try {
          // user.idを使用（getCurrentUserを呼ばないで高速化）
          const uid = user?.id || '';
          
          // 既存のカスタムテーマを読み込む（最優先）
          const [storedCustomTheme, storedIsCustomTheme, storedInstrument] = await Promise.all([
            AsyncStorage.getItem(getKey(STORAGE_KEYS.customTheme, uid)),
            AsyncStorage.getItem(getKey(STORAGE_KEYS.isCustomTheme, uid)),
            AsyncStorage.getItem(getKey(STORAGE_KEYS.selectedInstrument, uid)),
          ]);
          
          // 従来キーもチェック
          const [legacyCustomTheme, legacyIsCustomTheme, legacyInstrument] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.customTheme),
            AsyncStorage.getItem(STORAGE_KEYS.isCustomTheme),
            AsyncStorage.getItem(STORAGE_KEYS.selectedInstrument),
          ]);
          
          const customThemeStr = storedCustomTheme || legacyCustomTheme;
          const isCustomThemeStr = storedIsCustomTheme || legacyIsCustomTheme;
          const instrumentStr = storedInstrument || legacyInstrument;
          
          if (!cancelled) {
            // カスタムテーマが設定されている場合はそれを使用
            if (isCustomThemeStr === 'true' && customThemeStr) {
              try {
                const parsedTheme = JSON.parse(customThemeStr);
                setInitialTheme(parsedTheme);
                setCustomThemeState(parsedTheme);
                setIsCustomTheme(true);
                // 楽器IDも設定（楽器ヘッダーの一瞬消えを防ぐ）
                if (instrumentStr) {
                  setSelectedInstrumentState(instrumentStr);
                }
                return; // カスタムテーマが見つかったので終了
              } catch (parseError) {
                // エラーは無視
              }
            }
            
            // 楽器が選択されている場合は、その楽器のテーマを使用（最優先）
            if (instrumentStr) {
              const instrument = defaultInstruments.find(inst => inst.id === instrumentStr);
              if (instrument) {
                setInitialTheme(instrument);
                setSelectedInstrumentState(instrumentStr);
                return; // 楽器テーマが見つかったので終了
              }
            }
          }
        } catch (storageError) {
          // ストレージ読み込みエラーは無視（initialThemeの初期値を使用）
          logger.warn('ストレージ読み込みエラー（デフォルトテーマを維持）:', storageError);
        }
        
        // 2. useAuthAdvancedからuser.selected_instrument_idを取得（AsyncStorageにない場合のみ）
        // 読み込み中でも選択楽器の背景色を表示するため、即座に設定
        // 同期的に実行できる部分は即座に実行（リロード時の黒を防ぐ）
        if (user?.selected_instrument_id) {
          // まずdbInstrumentsから探す（データベースから読み込まれた最新データ）
          let instrument = dbInstruments.find(inst => inst.id === user.selected_instrument_id);
          // 見つからない場合はdefaultInstrumentsから探す（フォールバック）
          if (!instrument) {
            instrument = defaultInstruments.find(inst => inst.id === user.selected_instrument_id);
          }
          if (instrument) {
            // 同期的に即座に設定（リロード時の黒を防ぐ）
            setInitialTheme(instrument);
            setSelectedInstrumentState(user.selected_instrument_id);
            return;
          }
        }
        
        // それ以外の場合は、既に設定されているデフォルトテーマを維持（変更しない）
        // initialThemeの初期値は既に設定されているため、ここで設定する必要はない
      } catch (error) {
        // エラーが発生しても、既に設定されているデフォルトテーマを維持（黒を防ぐ）
        logger.warn('テーマ読み込みエラー（デフォルトテーマを維持）:', error);
      }
    };
    
    // 既存のテーマを即座に読み込む（非同期だが最優先で実行）
    // user.selected_instrument_idがある場合は即座に設定される（高速化）
    // initialThemeの初期値は既に設定されているため、リロード時も黒にならない
    // 即座に実行（awaitしない）して、バックグラウンドで読み込み
    loadExistingTheme();

    const initialize = async () => {
      try {
        // 読み込み中表示を防ぐため、初期化を即座に完了として扱う
        // バックグラウンドで初期化を続行する
        setIsInitializing(false);
        // 初期化開始時は同期状態をリセット
        setSyncStatus('idle');
        setLastSyncError(null);
        
        // タイムアウトを設定（5秒で警告のみ表示、初期化は継続）
        // データベースからの読み込みが遅い場合があるため、タイムアウト時間を設定
        // タイムアウト時も初期化を継続し、警告のみ表示（アプリをブロックしない）
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            logger.warn('InstrumentThemeContext初期化が時間がかかっています。初期化は継続します。');
            // 警告のみ表示し、初期化は継続（isInitializingはfalseにしない）
          }
        }, 5000); // 10秒 → 5秒に短縮（遅延を完全に無くす）
        
        // まずユーザーIDを取得（サービス層経由）
        const { user, error: authError } = await getCurrentUser();
        if (cancelled) return;
        
        if (user) {
          setCurrentUserId(user.id);
        }
        
        // 楽器選択と背景色はローカルストレージから即座に読み込む（loadExistingThemeで既に実行済み）
        // 楽器データの読み込みは初期化時には実行しない（リロード時の黒を防ぐ）
        // 楽器選択と背景色は主要機能設定で変更される時以外は固定のため、
        // リロード時にデータベースから読み込む必要はない
        // デフォルト楽器データのみを使用（既にdefaultInstrumentsに設定済み）
        setSyncStatus('idle');
      } catch (error) {
        if (!cancelled) {
          logger.error('初期化エラー:', error);
          ErrorHandler.handle(error, 'InstrumentThemeContext初期化', false);
          const initError = error instanceof Error ? error : new Error(String(error));
          setLastSyncError(initError);
          setSyncStatus('error');
        }
      } finally {
        if (!cancelled) {
          // タイムアウトをクリア
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          // 初期化完了後、初期テーマをクリア（通常のテーマ計算に戻す）
          // 読み込み中表示を防ぐため、即座に初期化を完了
          setIsInitializing(false);
          // 初期テーマは保持（必要に応じて後でクリア）
        }
      }
    };
    
    // 初期化を非ブロッキングで実行（読み込み中表示を防ぐため）
    initialize();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [getKey, defaultInstruments, user?.selected_instrument_id, dbInstruments]);

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

  // 初期テーマを設定するuseEffect（loadStoredData完了後）
  // 既存のテーマを保持するため、initialThemeが設定されている場合は更新しない
  // selectedInstrument状態を最優先で使用（楽器選択直後の反映を確実にするため）
  useEffect(() => {
    // 1. selectedInstrument状態を最優先で使用（楽器選択直後の反映を確実にするため）
    // 楽器選択直後は、user.selected_instrument_idよりもselectedInstrument状態を優先
    if (selectedInstrument) {
      // まずdbInstrumentsから探す（データベースから読み込まれた最新データ）
      let instrument = dbInstruments.find(inst => inst.id === selectedInstrument);
      // 見つからない場合はdefaultInstrumentsから探す（フォールバック）
      if (!instrument) {
        instrument = defaultInstruments.find(inst => inst.id === selectedInstrument);
      }
      if (instrument) {
        // 既にinitialThemeが設定されていて、同じ楽器の場合は更新しない
        // ただし、user.selected_instrument_idと異なる場合は更新（楽器変更を反映）
        if (initialTheme && initialTheme.id === selectedInstrument && 
            (!user?.selected_instrument_id || user.selected_instrument_id === selectedInstrument)) {
          return;
        }
        setInitialTheme(instrument);
        return;
      }
    }
    
    // 2. user.selected_instrument_idを使用（selectedInstrument状態がない場合、または一致している場合のみ）
    // ログイン直後に即座に反映するため
    if (user?.selected_instrument_id) {
      // selectedInstrument状態と一致している場合は、既に処理済みなのでスキップ
      if (selectedInstrument === user.selected_instrument_id) {
        return;
      }
      
      // 既にinitialThemeが設定されていて、同じ楽器の場合は更新しない
      if (initialTheme && initialTheme.id === user.selected_instrument_id) {
        // selectedInstrument状態も更新（同期を保つ）
        if (!selectedInstrument) {
          setSelectedInstrumentState(user.selected_instrument_id);
        }
        return;
      }
      
      // まずdbInstrumentsから探す（データベースから読み込まれた最新データ）
      let instrument = dbInstruments.find(inst => inst.id === user.selected_instrument_id);
      // 見つからない場合はdefaultInstrumentsから探す（フォールバック）
      if (!instrument) {
        instrument = defaultInstruments.find(inst => inst.id === user.selected_instrument_id);
      }
      if (instrument) {
        setInitialTheme(instrument);
        setSelectedInstrumentState(user.selected_instrument_id);
        return;
      }
    }
    
    // 既にinitialThemeが設定されている場合は更新しない（既存のテーマを保持）
    if (initialTheme) {
      return;
    }
    
    // 3. カスタムテーマが設定されている場合はそれを使用
    if (isCustomTheme && customTheme) {
      setInitialTheme(customTheme);
      return;
    }
    
    // 4. それ以外の場合は、デフォルト楽器の最初のテーマを使用（最後の手段）
    setInitialTheme(defaultInstruments[0] || defaultTheme);
  }, [initialTheme, isCustomTheme, customTheme, selectedInstrument, dbInstruments, defaultInstruments, user?.selected_instrument_id]);

  // initialThemeが設定されていない場合に、現在のテーマをinitialThemeとして設定（色の変化を防ぐ）
  // 既存のテーマを保持するため、initialThemeが設定されている場合は更新しない
  // selectedInstrument状態を最優先で使用（楽器選択直後の反映を確実にするため）
  useEffect(() => {
    // 既にinitialThemeが設定されている場合は更新しない（既存のテーマを保持）
    if (initialTheme) {
      return;
    }
    
    let themeToSet: Instrument | null = null;
    
    // 1. selectedInstrument状態を最優先で使用（楽器選択直後の反映を確実にするため）
    if (selectedInstrument) {
      const instrument = dbInstruments.find(inst => inst.id === selectedInstrument) || 
                         defaultInstruments.find(inst => inst.id === selectedInstrument);
      if (instrument) {
        themeToSet = instrument;
      }
    }
    
    // 2. user.selected_instrument_idを使用（selectedInstrument状態がない場合のみ）
    if (!themeToSet && user?.selected_instrument_id) {
      const instrument = dbInstruments.find(inst => inst.id === user.selected_instrument_id) || 
                         defaultInstruments.find(inst => inst.id === user.selected_instrument_id);
      if (instrument) {
        themeToSet = instrument;
        setSelectedInstrumentState(user.selected_instrument_id);
      }
    }
    
    // 3. カスタムテーマが設定されている場合はそれを使用
    if (!themeToSet && isCustomTheme && customTheme) {
      themeToSet = customTheme;
    }
    
    // 4. それ以外の場合は、デフォルト楽器の最初のテーマを使用
    if (!themeToSet) {
      themeToSet = defaultInstruments[0] || defaultTheme;
    }
    
    if (themeToSet) {
      setInitialTheme(themeToSet);
    }
  }, [initialTheme, isCustomTheme, customTheme, selectedInstrument, dbInstruments, defaultInstruments, user?.selected_instrument_id]);

  // currentThemeは常に有効な値を返す（初期化時も含む）
  // リロード時に背景が黒くなる問題を根本的に解決するため、必ず有効なテーマを返す
  // この関数は常に有効なInstrumentオブジェクトを返す（undefinedやnullを返すことはない）
  const currentTheme = useMemo(() => {
    try {
      // カスタムテーマが設定されている場合は優先的に使用
      if (isCustomTheme && customTheme && customTheme.background) {
        return customTheme;
      }
      
      // selectedInstrument状態を最優先で使用（楽器選択直後の反映を確実にするため）
      if (selectedInstrument) {
        // まずdbInstrumentsから探す（データベースから読み込まれた最新データ）
        let instrument = dbInstruments.find(inst => inst.id === selectedInstrument);
        // 見つからない場合はdefaultInstrumentsから探す（フォールバック）
        if (!instrument) {
          instrument = defaultInstruments.find(inst => inst.id === selectedInstrument);
        }
        // 見つかった場合は即座に返す（背景色を正しく反映）
        if (instrument && instrument.background) {
          return instrument;
        }
      }
      
      // user.selected_instrument_idを使用（selectedInstrument状態がない場合のみ）
      // ログイン直後に即座に反映
      if (user?.selected_instrument_id) {
        // まずdbInstrumentsから探す（データベースから読み込まれた最新データ）
        let instrument = dbInstruments.find(inst => inst.id === user.selected_instrument_id);
        // 見つからない場合はdefaultInstrumentsから探す（フォールバック）
        if (!instrument) {
          instrument = defaultInstruments.find(inst => inst.id === user.selected_instrument_id);
        }
        // 見つかった場合は即座に返す（背景色を正しく反映）
        if (instrument && instrument.background) {
          return instrument;
        }
      }
      
      // 初期テーマが設定されている場合は常にそれを使用（既存のテーマを保持）
      // 読み込み中でも既存のテーマを維持するため、initialThemeを優先
      // initialThemeの初期値は必ず設定されているため、nullになることはない
      if (initialTheme && initialTheme.background) {
        return initialTheme;
      }
      
      // initialThemeが設定されていない場合（念のため）、通常のテーマ計算を行う
      // 初期化完了後も楽器が未選択の場合は、デフォルト楽器の最初のテーマを使用
      // 読み込み中でも黒にならないように、必ず有効なテーマを返す
      const fallbackTheme = defaultInstruments[0] || defaultTheme;
      // 念のため、backgroundプロパティが存在することを確認
      if (fallbackTheme && fallbackTheme.background) {
        return fallbackTheme;
      }
      // 最後の手段としてdefaultThemeを返す（必ず有効な値）
      return defaultTheme;
    } catch (error) {
      // エラーが発生した場合でも、必ず有効なテーマを返す（リロード時の黒を防ぐ）
      logger.error('currentTheme計算エラー（デフォルトテーマを返します）:', error);
      return defaultTheme;
    }
  }, [isCustomTheme, customTheme, selectedInstrument, dbInstruments, defaultInstruments, initialTheme, user?.selected_instrument_id]);

  const setCustomTheme = React.useCallback(async (theme: Instrument) => {
    try {
      setCustomThemeState(theme);
      setIsCustomTheme(true);
      // カスタムテーマが変更された時はinitialThemeも更新（背景色を即座に反映）
      setInitialTheme(theme);
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
      // initialThemeも更新して背景色を即座に反映
      if (selectedInstrument) {
        const instrument = dbInstruments.find(inst => inst.id === selectedInstrument) || 
                           defaultInstruments.find(inst => inst.id === selectedInstrument);
        if (instrument) {
          setInitialTheme(instrument);
        } else {
          setInitialTheme(defaultInstruments[0] || defaultTheme);
        }
      } else {
        setInitialTheme(defaultInstruments[0] || defaultTheme);
      }
    } catch (error) {
      logger.error('Theme reset error:', error);
      ErrorHandler.handle(error, 'テーマリセット', false);
    }
  }, [getKey, selectedInstrument, dbInstruments, defaultInstruments]);

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
    isInitializing,
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
    isInitializing,
  ]);

  return (
    <InstrumentThemeContext.Provider value={value}>
      {children}
    </InstrumentThemeContext.Provider>
  );
};
