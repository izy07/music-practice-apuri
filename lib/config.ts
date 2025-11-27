/**
 * 環境変数の一元管理とバリデーション
 */
import logger from './logger';
import { ErrorHandler } from './errorHandler';

// 環境変数の型定義
interface Config {
  supabase: {
    url: string;
    anonKey: string;
    lanIp?: string;
    port?: string;
  };
  openai: {
    apiKey?: string;
  };
  whisper: {
    apiUrl?: string;
    apiKey?: string;
  };
  google: {
    clientId?: string;
    clientSecret?: string;
  };
  eas: {
    projectId?: string;
  };
  env: {
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
  };
}

// 環境変数の取得とバリデーション
const getEnvVar = (key: string, required: boolean = false, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue || '';
  
  if (required && !value) {
    const error = new Error(`Missing required environment variable: ${key}`);
    ErrorHandler.handle(error, '環境変数取得', false);
    throw error;
  }
  
  return value;
};

// 環境変数のログ出力（開発環境のみ）
const logConfig = (config: Config) => {
  if (config.env.isDevelopment) {
    logger.debug('環境変数設定:', {
      'Supabase URL': config.supabase.url,
      'Supabase Key': config.supabase.anonKey.substring(0, 10) + '...',
      'OpenAI API Key': config.openai.apiKey ? '設定済み ✅' : '未設定',
      '環境': config.env.isDevelopment ? '開発' : config.env.isProduction ? '本番' : 'テスト'
    });
  }
};

// 設定オブジェクトの作成
const createConfig = (): Config => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  const config: Config = {
    supabase: {
      url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL', false, 'http://127.0.0.1:54321'),
      anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', false, ''),
      lanIp: getEnvVar('EXPO_PUBLIC_SUPABASE_LAN_IP', false),
      port: getEnvVar('EXPO_PUBLIC_SUPABASE_PORT', false, '54321'),
    },
    openai: {
      apiKey: getEnvVar('EXPO_PUBLIC_OPENAI_API_KEY', false),
    },
    whisper: {
      apiUrl: getEnvVar('EXPO_PUBLIC_WHISPER_API_URL', false),
      apiKey: getEnvVar('EXPO_PUBLIC_WHISPER_API_KEY', false),
    },
    google: {
      clientId: getEnvVar('GOOGLE_CLIENT_ID', false),
      clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET', false),
    },
    eas: {
      projectId: getEnvVar('EAS_PROJECT_ID', false),
    },
    env: {
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      isTest: nodeEnv === 'test' || process.env.JEST_WORKER_ID !== undefined,
    },
  };

  // 開発環境でログ出力
  logConfig(config);

  return config;
};

// 設定の検証
const validateConfig = (config: Config): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 本番環境でのバリデーション
  if (config.env.isProduction) {
    if (!config.supabase.url || config.supabase.url.includes('localhost') || config.supabase.url.includes('127.0.0.1')) {
      errors.push('本番環境でローカルSupabase URLが設定されています');
    }

    if (!config.supabase.anonKey) {
      errors.push('Supabase Anon Keyが設定されていません');
    }

    if (config.supabase.anonKey.length < 100) {
      errors.push('Supabase Anon Keyが短すぎます（無効な可能性）');
    }
  }

  // 警告のログ出力
  if (errors.length > 0) {
    ErrorHandler.handle(new Error('設定エラー: ' + errors.join(', ')), '設定検証', false);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// シングルトン設定オブジェクト
const config = createConfig();

// 本番環境では検証を実行
if (config.env.isProduction) {
  const validation = validateConfig(config);
  if (!validation.isValid) {
    const error = new Error('Invalid configuration: ' + validation.errors.join(', '));
    ErrorHandler.handle(error, '設定検証', false);
    // 本番環境では厳格に検証
    throw error;
  }
}

export default config;

// 個別エクスポート（後方互換性）
export const { supabase, openai, whisper, google, eas, env } = config;

