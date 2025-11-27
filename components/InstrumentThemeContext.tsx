
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, withUser } from '@/lib/storageKeys';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

interface Instrument {
  id: string;
  name: string;
  nameEn: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

interface PracticeSettings {
  colorChangeThreshold: number; // 色変更の基準時間（分）
}

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
}

const defaultInstruments: Instrument[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'ピアノ',
    nameEn: 'Piano',
    primary: '#1A1A1A', // エレガントなダークグレー（黒鍵）
    secondary: '#FFFFFF', // 純白（白鍵）
    accent: '#D4AF37', // エレガントなゴールド（アクセント）
    background: '#F8F6F0', // 上品なアイボリー（ピアノの木目調）
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'ギター',
    nameEn: 'Guitar',
    primary: '#654321', // より濃いブラウン（木目）
    secondary: '#DEB887', // 明るいブラウン
    accent: '#8B4513', // ダークブラウン
    background: '#FFF8DC', // コーンフラワーブルー（木の温かみ）
    surface: '#FFFFFF',
    text: '#2D1B00',
    textSecondary: '#8B4513',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'バイオリン',
    nameEn: 'Violin',
    primary: '#8B0000', // 濃い赤（ニス仕上げ）
    secondary: '#FFB6C1', // ライトピンク
    accent: '#5C1F00', // ダークレッド
    background: '#FFE4E1', // ミストローズ（温かみのある背景）
    surface: '#FFFFFF',
    text: '#2D0000',
    textSecondary: '#8B0000',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'フルート',
    nameEn: 'Flute',
    primary: '#C0C0C0', // シルバー（トロンボーンから移行）
    secondary: '#E6E6FA', // ラベンダー
    accent: '#A9A9A9', // ダークグレー
    background: '#F0F8FF', // アリスブルー（金属の冷たさ）
    surface: '#FFFFFF',
    text: '#2F4F4F',
    textSecondary: '#708090',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'トランペット',
    nameEn: 'Trumpet',
    primary: '#B8860B', // ダークゴールド（より濃い）
    secondary: '#DAA520', // ゴールデンロッド
    accent: '#8B4513', // サドルブラウン
    background: '#FFE4B5', // より目立つゴールド系背景
    surface: '#FFFFFF',
    text: '#8B4513',
    textSecondary: '#B8860B',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: '打楽器',
    nameEn: 'Drums',
    primary: '#000000', // 純黒
    secondary: '#696969', // 濃いグレー
    accent: '#000000', // 純黒
    background: '#F5F5DC', // ベージュ（ドラムの温かみ）
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#2F2F2F',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'サックス',
    nameEn: 'Saxophone',
    primary: '#4B0082', // より濃いインディゴ（サックス本体）
    secondary: '#9370DB', // ミディアムパープル
    accent: '#2E0854', // ダークパープル
    background: '#F8F8FF', // ゴーストホワイト（上品な背景）
    surface: '#FFFFFF',
    text: '#4B0082',
    textSecondary: '#6A5ACD',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'ホルン',
    nameEn: 'Horn',
    primary: '#8B4513', // より濃いサドルブラウン（ホルン本体）
    secondary: '#F4A460', // サンディブラウン
    accent: '#654321', // ダークブラウン
    background: '#FFF8DC', // コーンフラワーブルー（金管楽器の温かみ）
    surface: '#FFFFFF',
    text: '#8B4513',
    textSecondary: '#A0522D',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    name: 'クラリネット',
    nameEn: 'Clarinet',
    primary: '#000000', // 純黒（エボニー）
    secondary: '#2F2F2F', // 濃いグレー
    accent: '#1A1A1A', // ダークグレー
    background: '#E6E6FA', // ラベンダー（上品な背景）
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#333333',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'トロンボーン',
    nameEn: 'Trombone',
    primary: '#C0C0C0', // シルバー（トロンボーン本体）
    secondary: '#E6E6FA', // ラベンダー
    accent: '#A9A9A9', // ダークグレー
    background: '#F0F8FF', // アリスブルー（金属の冷たさ）
    surface: '#FFFFFF',
    text: '#2F4F4F',
    textSecondary: '#708090',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'チェロ',
    nameEn: 'Cello',
    primary: '#DC143C', // クリムゾン（チェロ本体）
    secondary: '#FF69B4', // ホットピンク
    accent: '#8B0000', // ダークレッド
    background: '#FFE4E1', // ミストローズ（弦楽器の温かみ）
    surface: '#FFFFFF',
    text: '#8B0000',
    textSecondary: '#B22222',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'ファゴット',
    nameEn: 'Bassoon',
    primary: '#A0522D', // シエナ（木製）
    secondary: '#DEB887', // バーリーウッド
    accent: '#8B4513', // サドルブラウン
    background: '#FFF8DC', // コーンフラワーブルー（木の温かみ）
    surface: '#FFFFFF',
    text: '#8B4513',
    textSecondary: '#A0522D',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    name: 'オーボエ',
    nameEn: 'Oboe',
    primary: '#DAA520', // ゴールデンロッド（木製）
    secondary: '#F0E68C', // カキ
    accent: '#B8860B', // ダークゴールデンロッド
    background: '#FFFACD', // レモンチフフォン（木管楽器の温かみ）
    surface: '#FFFFFF',
    text: '#B8860B',
    textSecondary: '#DAA520',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440014',
    name: 'ハープ',
    nameEn: 'Harp',
    primary: '#FF69B4', // ホットピンク（ハープ本体）
    secondary: '#FFB6C1', // ライトピンク
    accent: '#C71585', // ミディアムバイオレットレッド
    background: '#FFF0F5', // ラベンダーブラッシュ（上品な背景）
    surface: '#FFFFFF',
    text: '#C71585',
    textSecondary: '#FF1493',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440015',
    name: 'コントラバス',
    nameEn: 'Contrabass',
    primary: '#2F4F4F', // ダークスレートグレー（重厚感）
    secondary: '#708090', // スレートグレー
    accent: '#000000', // 純黒
    background: '#F5F5F5', // ホワイトスモーク（重厚な背景）
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#2F4F4F',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440017',
    name: 'その他',
    nameEn: 'Other',
    primary: '#4682B4', // スチールブルー
    secondary: '#87CEEB', // スカイブルー
    accent: '#2F4F4F', // ダークスレートグレー
    background: '#E0F6FF', // ライトブルー（ニュートラルな背景）
    surface: '#FFFFFF',
    text: '#000080',
    textSecondary: '#4682B4',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440018',
    name: 'ヴィオラ',
    nameEn: 'Viola',
    primary: '#B22222', // ファイアブリック（ヴィオラ本体）
    secondary: '#FF7F50', // コーラル
    accent: '#8B0000', // ダークレッド
    background: '#FFE4E1', // ミストローズ（弦楽器の温かみ）
    surface: '#FFFFFF',
    text: '#8B0000',
    textSecondary: '#B22222',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440019',
    name: '琴',
    nameEn: 'Koto',
    primary: '#8B4513', // サドルブラウン（木製）
    secondary: '#DEB887', // バーリーウッド
    accent: '#654321', // ダークブラウン
    background: '#FFF8DC', // コーンフラワーブルー（和楽器の温かみ）
    surface: '#FFFFFF',
    text: '#2D1B00',
    textSecondary: '#8B4513',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440020',
    name: 'シンセサイザー',
    nameEn: 'Synthesizer',
    primary: '#4169E1', // ロイヤルブルー
    secondary: '#87CEEB', // スカイブルー
    accent: '#1E90FF', // ドッジャーブルー
    background: '#E0F6FF', // ライトブルー（電子楽器のクールさ）
    surface: '#FFFFFF',
    text: '#000080',
    textSecondary: '#4169E1',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440021',
    name: '太鼓',
    nameEn: 'Taiko',
    primary: '#DC143C', // クリムゾン（太鼓の皮）
    secondary: '#FF6347', // トマト
    accent: '#8B0000', // ダークレッド
    background: '#FFE4E1', // ミストローズ（和太鼓の温かみ）
    surface: '#FFFFFF',
    text: '#8B0000',
    textSecondary: '#DC143C',
  },
];

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
    const defaultContext: InstrumentThemeContextType = {
      selectedInstrument: '',
      setSelectedInstrument: async () => {},
      currentTheme: defaultInstruments[0],
      practiceSettings: defaultPracticeSettings,
      updatePracticeSettings: async () => {},
      isCustomTheme: false,
      setCustomTheme: async () => {},
      resetToInstrumentTheme: async () => {},
      dbInstruments: defaultInstruments,
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
  const [dbInstruments, setDbInstruments] = useState<Instrument[]>(defaultInstruments);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // ユーザー別キーを生成（未ログイン時は従来キー）
  // useCallbackでメモ化して、依存関係を明確にする
  const getKey = React.useCallback((base: string, userId?: string) => {
    const uid = userId ?? currentUserId;
    return uid ? `${base}:${uid}` : base;
  }, [currentUserId]);

  // 色設定の変更を強制的に反映させる（無限ループを防ぐため削除）
  // useEffect(() => {
  //   const forceThemeUpdate = async () => {
  //     if (selectedInstrument) {
  //       // 現在選択されている楽器のテーマを強制的に更新
  //       const currentInstrument = dbInstruments.find(inst => inst.id === selectedInstrument);
  //       if (currentInstrument) {
  //         console.log('Force updating theme for:', currentInstrument.name, 'background:', currentInstrument.background);
  //         // テーマの強制更新をトリガー
  //         setDbInstruments(prev => [...prev]);
  //       }
  //     }
  //   };
    
  //   forceThemeUpdate();
  // }, [dbInstruments, selectedInstrument]);

  // 認証済みかつローカル未設定の場合に、プロフィールから即時同期して初期反映
  useEffect(() => {
    let cancelled = false;
    let subscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const hydrateFromServer = async () => {
      if (cancelled) return;
      
      try {
        // ユーザー情報を1回だけ取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        
        // サーバー側の楽器選択を確認
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('selected_instrument_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (cancelled) return;
        
        if (profileError) {
          ErrorHandler.handle(profileError, 'プロフィール取得（楽器選択同期）', false);
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
      } catch (error) {
        if (!cancelled) {
          ErrorHandler.handle(error, 'サーバー同期', false);
        }
      }
    };

    hydrateFromServer();

    // 認証状態が変わった時にも再同期（ただし楽器が未選択の場合のみ）
    const sub = supabase.auth.onAuthStateChange(async (event: string, session: { user?: { id: string } } | null) => {
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
    
    subscription = sub;

    return () => {
      cancelled = true;
      if (subscription?.data?.subscription) {
        try {
          subscription.data.subscription.unsubscribe();
        } catch (error) {
          logger.warn('認証状態変更リスナーの解除エラー:', error);
        }
      }
    };
  }, [selectedInstrument, currentUserId, getKey]);

  const loadInstrumentsFromDB = React.useCallback(async () => {
    try {
      // データベースから楽器データを読み込むが、色設定はローカルのdefaultInstrumentsを優先
      const { data: instruments, error } = await supabase
        .from('instruments')
        .select('id, name, name_en');
      
      if (error) {
        ErrorHandler.handle(error, '楽器データ読み込み', false);
        // エラーの場合はローカルのdefaultInstrumentsを使用
        setDbInstruments(defaultInstruments);
        return;
      }

      if (instruments && instruments.length > 0) {
        // データベースの楽器名とローカルの色設定をマージ
        const mappedInstruments: Instrument[] = instruments.map((dbInst: { id: string; name: string; name_en: string }) => {
          // ローカルのdefaultInstrumentsから同じIDの楽器を探す
          const localInstrument = defaultInstruments.find(local => local.id === dbInst.id);
          
          if (localInstrument) {
            // ローカルの色設定を使用（最新の色設定）
            return {
              id: dbInst.id,
              name: dbInst.name,
              nameEn: dbInst.name_en,
              primary: localInstrument.primary,
              secondary: localInstrument.secondary,
              accent: localInstrument.accent,
              background: localInstrument.background,
              surface: localInstrument.surface,
              text: localInstrument.text,
              textSecondary: localInstrument.textSecondary,
            };
          } else {
            // ローカルにない場合はデフォルト色を使用
            return {
              id: dbInst.id,
              name: dbInst.name,
              nameEn: dbInst.name_en,
              primary: '#8B4513',
              secondary: '#F8F9FA',
              accent: '#8B4513',
              background: '#FEFEFE',
              surface: '#F5F5F5',
              text: '#2D3748',
              textSecondary: '#718096',
            };
          }
        });
        
        setDbInstruments(mappedInstruments);
      } else {
        // データベースに楽器がない場合はローカルのdefaultInstrumentsを使用
        setDbInstruments(defaultInstruments);
      }
    } catch (error) {
      console.error('Error loading instruments from DB:', error);
      // エラーの場合はローカルのdefaultInstrumentsを使用
      setDbInstruments(defaultInstruments);
    }
  }, []);

  const loadStoredData = React.useCallback(async () => {
    try {
      // 現在ユーザー
      const { data: { user } } = await supabase.auth.getUser();
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
          console.error('設定のパースエラー:', parseError);
        }
      }

      if (storedCustomTheme) {
        try {
          setCustomThemeState(JSON.parse(storedCustomTheme));
        } catch (parseError) {
          console.error('カスタムテーマのパースエラー:', parseError);
        }
      }

      if (storedIsCustomTheme) {
        setIsCustomTheme(storedIsCustomTheme === 'true');
      }
    } catch (error) {
      console.error('ローカルデータ読み込みエラー:', error);
    }
  }, [getKey]);

  // 初期化処理（マウント時のみ実行）
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        // まずユーザーIDを取得
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        
        if (user) {
          setCurrentUserId(user.id);
        }
        
        // ユーザーID取得後にデータを読み込む
        await Promise.all([
          loadStoredData(),
          loadInstrumentsFromDB(),
        ]);
      } catch (error) {
        if (!cancelled) {
          console.error('初期化エラー:', error);
        }
      }
    };
    
    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadStoredData, loadInstrumentsFromDB]);

  const setSelectedInstrument = React.useCallback(async (instrumentId: string) => {
    try {
      setSelectedInstrumentState(instrumentId);
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.selectedInstrument), instrumentId);
    } catch (error) {
      console.error('楽器選択保存エラー:', error);
    }
  }, [getKey]);

  const updatePracticeSettings = React.useCallback(async (newSettings: Partial<PracticeSettings>) => {
    try {
      const updatedSettings = { ...practiceSettings, ...newSettings };
      setPracticeSettingsState(updatedSettings);
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.practiceSettings), JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('練習設定保存エラー:', error);
    }
  }, [practiceSettings, getKey]);

  const currentTheme = useMemo(() => {
    if (isCustomTheme && customTheme) {
      return customTheme;
    }
    
    if (!selectedInstrument) {
      return defaultTheme;
    }
    
    // データベースから読み込んだ楽器を優先、フォールバックとしてdefaultInstruments
    const instrument = dbInstruments.find(inst => inst.id === selectedInstrument) || 
                       defaultInstruments.find(inst => inst.id === selectedInstrument);
    
    if (instrument) {
      // テーマが正常に適用されている
    } else {
      // デフォルトテーマを使用
    }
    
    return instrument || defaultTheme;
  }, [isCustomTheme, customTheme, selectedInstrument, dbInstruments]);

  const setCustomTheme = React.useCallback(async (theme: Instrument) => {
    try {
      setCustomThemeState(theme);
      setIsCustomTheme(true);
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.customTheme), JSON.stringify(theme));
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.isCustomTheme), 'true');
    } catch (error) {
      console.error('カスタムテーマ保存エラー:', error);
    }
  }, [getKey]);

  const resetToInstrumentTheme = React.useCallback(async () => {
    try {
      setCustomThemeState(null);
      setIsCustomTheme(false);
      await AsyncStorage.removeItem(getKey(STORAGE_KEYS.customTheme));
      await AsyncStorage.setItem(getKey(STORAGE_KEYS.isCustomTheme), 'false');
      
      // 楽器選択がある場合は、テーマを強制的に更新
      if (selectedInstrument) {
        // データベースの楽器情報を更新
        const updatedInstrument = defaultInstruments.find(inst => inst.id === selectedInstrument);
        if (updatedInstrument) {
          setDbInstruments(prev => prev.map(inst => 
            inst.id === selectedInstrument ? updatedInstrument : inst
          ));
        }
      }
    } catch (error) {
      console.error('Theme reset error:', error);
    }
  }, [selectedInstrument, getKey]);

  const value: InstrumentThemeContextType = {
    selectedInstrument,
    setSelectedInstrument,
    currentTheme,
    practiceSettings,
    updatePracticeSettings,
    isCustomTheme,
    setCustomTheme,
    resetToInstrumentTheme,
    dbInstruments,
  };

  return (
    <InstrumentThemeContext.Provider value={value}>
      {children}
    </InstrumentThemeContext.Provider>
  );
};
