// Supabaseクライアント設定 - データベース接続と認証を管理
import { createClient, type SupabaseClient } from '@supabase/supabase-js'; // Supabaseクライアント作成関数
import { Platform } from 'react-native'; // プラットフォーム判定（iOS/Android/Web）
import logger from './logger';
import { ErrorHandler } from './errorHandler';

// ローカルSupabase設定（開発用フォールバック）
// プラットフォームに応じたデフォルト: iOS/Web → 127.0.0.1, Android エミュ → 10.0.2.2
const defaultLocalHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
const localPort = process.env.EXPO_PUBLIC_SUPABASE_PORT || '54321';

// PCのLAN IP を自動推定（Metro の URL ログや location.host を利用）
let autoLanIp: string | null = null;
try {
  if (typeof window !== 'undefined') {
    // 例: http://10.141.12.33:8081 → 10.141.12.33
    const host = window.location.host.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      autoLanIp = host;
    }
  }
} catch {}

// 優先度: 明示設定 > 自動検出 > 既定
const envLanIp = process.env.EXPO_PUBLIC_SUPABASE_LAN_IP || null;
const resolvedLocalHost = envLanIp || autoLanIp || defaultLocalHost;
const localUrl = `http://${resolvedLocalHost}:${localPort}`;

// ローカルSupabase用の匿名キー（環境変数から取得）
// ローカルSupabaseを使用する場合は環境変数で設定してください
const localKey = process.env.EXPO_PUBLIC_SUPABASE_LOCAL_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'; // デフォルト: ローカルSupabaseのデモキー

// クラウドSupabase設定（本番用）
// 環境変数が必須 - ハードコードされた値は削除
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数の検証（本番環境では必須）
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  
  const errorMessage = `Supabase credentials are not configured. Please set the following environment variables: ${missingVars.join(', ')}. See ENV_SETUP.md or README.md for details.`;
  
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    // 本番環境ではエラーを投げる
    throw new Error(errorMessage);
  } else {
    // 開発環境では警告を出力（後方互換性のため）
    logger.warn(errorMessage);
    logger.warn('Continuing with undefined values. The app may not work correctly without proper configuration.');
  }
}

// 実行環境でURLを選択
const isDev = process.env.NODE_ENV !== 'production';
const isWeb = Platform.OS === 'web';

// 端末(Expo Go/実機)ではトンネル接続時に 127.0.0.1 へ到達できないため、
// デフォルトでクラウドSupabaseを使う。明示的にローカルを使いたい場合のみ環境変数で切替。
const useLocalOnNative = process.env.EXPO_PUBLIC_USE_LOCAL_SUPABASE === 'true';
const useLocalOnWeb = process.env.EXPO_PUBLIC_USE_LOCAL_SUPABASE_WEB === 'true';

// WebはPC上で動作するためローカル優先、ネイティブはクラウド優先
// Webは常にクラウドを使用（ローカルは明示的に実装しない）
const finalUrl = isWeb
  ? (supabaseUrl || localUrl) // Web環境ではsupabaseUrlが優先、フォールバックとしてlocalUrl
  : (isDev ? (useLocalOnNative ? localUrl : (supabaseUrl || localUrl)) : (supabaseUrl || ''));
const finalKey = isWeb
  ? (supabaseAnonKey || localKey) // Web環境ではsupabaseAnonKeyが優先、フォールバックとしてlocalKey
  : (isDev ? (useLocalOnNative ? localKey : (supabaseAnonKey || localKey)) : (supabaseAnonKey || ''));

// 開発環境でのみ接続情報をログ出力（本番では機密情報を隠す）
if (isDev) {
  logger.debug('Supabase connecting to:', finalUrl); // 接続先URL
  logger.debug('Platform:', Platform.OS); // プラットフォーム情報
  logger.debug('Local host resolved to:', resolvedLocalHost); // 解決されたローカルホスト
  logger.debug('Using anon key:', finalKey.substring(0, 6) + '...'); // 匿名キー（一部のみ表示）
}

// 接続テスト用の関数
export const testSupabaseConnection = async () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Supabaseクライアント接続テスト開始...');
      logger.debug('接続先URL:', finalUrl);
      logger.debug('使用するキー:', finalKey.substring(0, 6) + '...');
    }
    
    // 接続テストのタイムアウト処理
    const testTimeout = setTimeout(() => {
      logger.warn('接続テストタイムアウト（3秒）');
      throw new Error('接続テストがタイムアウトしました');
    }, 3000); // 3秒でタイムアウト
    
    try {
      logger.debug('基本的な接続テスト開始...');
      
      // 最もシンプルなテスト：セッション取得のみ
      const sessionResult = await supabase.auth.getSession();
      logger.debug('セッション取得テスト完了:', { 
        hasSession: !!sessionResult.data.session, 
        error: !!sessionResult.error,
        errorMessage: sessionResult.error?.message
      });
      
      // タイムアウトタイマーをクリア
      clearTimeout(testTimeout);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('基本的な接続テストが完了しました');
      }
      return { sessionResult };
    } catch (testError) {
      // タイムアウトタイマーをクリア
      clearTimeout(testTimeout);
      ErrorHandler.handle(testError, 'Supabase接続テスト', false);
      throw testError;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Supabaseクライアント接続テスト', false);
    throw error;
  }
};

// シングルトンパターンでSupabaseクライアントを管理
let supabaseInstance: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    logger.debug('新しいSupabaseクライアントインスタンスを作成中...');
    
    // Web環境でのストレージ設定
    let authStorage: {
      getItem: (key: string) => Promise<string | null> | string | null;
      setItem: (key: string, value: string) => Promise<void> | void;
      removeItem: (key: string) => Promise<void> | void;
    } | undefined = undefined;
    if (typeof window !== 'undefined') {
      authStorage = {
        getItem: (key: string) => window.localStorage.getItem(key),
        setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
        removeItem: (key: string) => window.localStorage.removeItem(key),
      };
    }
    
    supabaseInstance = createClient(finalUrl, finalKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // カスタムストレージを使用して複数インスタンス問題を回避
        storage: authStorage,
        storageKey: 'music-practice-auth',
        // 複数インスタンス検出を回避
        debug: false,
        // 有効期限延長はサーバ設定側で管理
      },
      global: {
        headers: {
          'X-Client-Info': 'music-practice-app',
          // PostgREST 406回避: 明示的にJSONを要求
          'Accept': 'application/json',
        },
      },
      // すべての高度な機能を無効化
      realtime: {
        params: {
          eventsPerSecond: 0,
        },
      },
      db: {
        schema: 'public',
      },
    });
    logger.debug('Supabaseクライアントインスタンス作成完了');
  } else {
    logger.debug('既存のSupabaseクライアントインスタンスを再利用');
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();

// Supabase設定を取得する関数
export const getSupabaseConfig = () => {
  return {
    url: finalUrl,
    key: finalKey,
  };
};

// ローカルに保存されたSupabaseセッション（sb-*）を完全削除
export const clearSupabaseSessionLocal = async () => {
  try {
    // Supabaseのローカルスコープのみサインアウト（サーバには影響なし）
    // 型の差異を避けるため any キャスト
    await (supabase.auth.signOut as any)({ scope: 'local' });
  } catch {}
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-'))
        .forEach((k) => localStorage.removeItem(k));
    }
  } catch {}
};

export type Database = {
  public: {
    Tables: {
      instruments: {
        Row: {
          id: string;
          name: string;
          name_en: string;
          color_primary: string;
          color_secondary: string;
          color_accent: string;
          starting_note: string | null;
          tuning_notes: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_en: string;
          color_primary?: string;
          color_secondary?: string;
          color_accent?: string;
          starting_note?: string | null;
          tuning_notes?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string;
          color_primary?: string;
          color_secondary?: string;
          color_accent?: string;
          starting_note?: string | null;
          tuning_notes?: string[] | null;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          selected_instrument_id: string | null;
          practice_level: 'beginner' | 'intermediate' | 'advanced';
          level_selected_at: string | null;
          total_practice_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          selected_instrument_id?: string | null;
          practice_level?: 'beginner' | 'intermediate' | 'advanced';
          level_selected_at?: string | null;
          total_practice_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          selected_instrument_id?: string | null;
          practice_level?: 'beginner' | 'intermediate' | 'advanced';
          level_selected_at?: string | null;
          total_practice_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          instrument_id: string | null;
          practice_date: string;
          duration_minutes: number;
          content: string | null;
          audio_url: string | null;
          input_method: 'manual' | 'preset' | 'voice';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          instrument_id?: string | null;
          practice_date: string;
          duration_minutes: number;
          content?: string | null;
          audio_url?: string | null;
          input_method?: 'manual' | 'preset' | 'voice';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          instrument_id?: string | null;
          practice_date?: string;
          duration_minutes?: number;
          content?: string | null;
          audio_url?: string | null;
          input_method?: 'manual' | 'preset' | 'voice';
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          goal_type: 'personal_short' | 'personal_long' | 'group';
          title: string;
          description: string | null;
          target_date: string | null;
          progress_percentage: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_type: 'personal_short' | 'personal_long' | 'group';
          title: string;
          description?: string | null;
          target_date?: string | null;
          progress_percentage?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_type?: 'personal_short' | 'personal_long' | 'group';
          title?: string;
          description?: string | null;
          target_date?: string | null;
          progress_percentage?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      music_terms: {
        Row: {
          id: string;
          term: string;
          reading: string;
          category: 'tempo' | 'dynamics' | 'articulation' | 'technique' | 'other';
          meaning_ja: string;
          meaning_en: string;
          description_ja: string | null;
          description_en: string | null;
          created_at: string;
        };
      };
      // (removed) ai_chat_history table types
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          language: 'ja' | 'en';
          theme: 'light' | 'dark' | 'auto';
          notifications_enabled: boolean;
          metronome_settings: {
            bpm: number;
            time_signature: string;
            volume: number;
            sound_type: 'click' | 'beep';
            subdivision: string;
          } | null;
          tuner_settings: {
            reference_pitch: number;
            temperament: string;
            volume: number;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          language?: 'ja' | 'en';
          theme?: 'light' | 'dark' | 'auto';
          notifications_enabled?: boolean;
          metronome_settings?: {
            bpm: number;
            time_signature: string;
            volume: number;
            sound_type: 'click' | 'beep';
            subdivision: string;
          } | null;
          tuner_settings?: {
            reference_pitch: number;
            temperament: string;
            volume: number;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          language?: 'ja' | 'en';
          theme?: 'light' | 'dark' | 'auto';
          notifications_enabled?: boolean;
          metronome_settings?: {
            bpm: number;
            time_signature: string;
            volume: number;
            sound_type: 'click' | 'beep';
            subdivision: string;
          } | null;
          tuner_settings?: {
            reference_pitch: number;
            temperament: string;
            volume: number;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tutorial_progress: {
        Row: {
          id: string;
          user_id: string;
          is_completed: boolean;
          completed_at: string | null;
          current_step: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          is_completed?: boolean;
          completed_at?: string | null;
          current_step?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          current_step?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      note_training_results: {
        Row: {
          id: string;
          user_id: string;
          mode: 'basic' | 'instrument' | 'endless';
          level: number;
          score: number;
          correct_count: number;
          total_count: number;
          max_streak: number;
          play_time: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: 'basic' | 'instrument' | 'endless';
          level: number;
          score: number;
          correct_count: number;
          total_count: number;
          max_streak: number;
          play_time: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: 'basic' | 'instrument' | 'endless';
          level?: number;
          score?: number;
          correct_count?: number;
          total_count?: number;
          max_streak?: number;
          play_time?: number;
          created_at?: string;
        };
      };
    };
  };
};