/**
 * 楽器（instruments）関連のサービス
 * ビジネスロジックをUIから分離
 */

import { instrumentRepository, InstrumentFromDB } from '@/repositories/instrumentRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

const SERVICE_CONTEXT = 'instrumentService';

/**
 * アプリケーションで使用する楽器の型
 * データベースの楽器データとローカルの色設定をマージした型
 */
export interface Instrument {
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

/**
 * ローカルのデフォルト楽器データ（色設定を含む）
 * データベースの楽器名とマージして使用
 */
const defaultInstruments: Instrument[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'ピアノ',
    nameEn: 'Piano',
    primary: '#1A1A1A',
    secondary: '#FFFFFF',
    accent: '#D4AF37',
    background: '#F8F6F0',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'ギター',
    nameEn: 'Guitar',
    primary: '#654321',
    secondary: '#DEB887',
    accent: '#8B4513',
    background: '#FFF8DC',
    surface: '#FFFFFF',
    text: '#2D1B00',
    textSecondary: '#8B4513',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'バイオリン',
    nameEn: 'Violin',
    primary: '#6B4423',
    secondary: '#C9A961',
    accent: '#D4AF37',
    background: '#FFF8F0',
    surface: '#FFFFFF',
    text: '#2C1810',
    textSecondary: '#6B4423',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'フルート',
    nameEn: 'Flute',
    primary: '#C0C0C0',
    secondary: '#E6E6FA',
    accent: '#A9A9A9',
    background: '#F0F8FF',
    surface: '#FFFFFF',
    text: '#2F4F4F',
    textSecondary: '#708090',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'トランペット',
    nameEn: 'Trumpet',
    primary: '#B8860B',
    secondary: '#DAA520',
    accent: '#8B4513',
    background: '#FFE4B5',
    surface: '#FFFFFF',
    text: '#8B4513',
    textSecondary: '#B8860B',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: '打楽器',
    nameEn: 'Drums',
    primary: '#000000',
    secondary: '#696969',
    accent: '#000000',
    background: '#F5F5DC',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#2F2F2F',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'サックス',
    nameEn: 'Saxophone',
    primary: '#4B0082',
    secondary: '#9370DB',
    accent: '#2E0854',
    background: '#F8F8FF',
    surface: '#FFFFFF',
    text: '#4B0082',
    textSecondary: '#6A5ACD',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'ホルン',
    nameEn: 'Horn',
    primary: '#8B4513',
    secondary: '#F4A460',
    accent: '#654321',
    background: '#FFF8DC',
    surface: '#FFFFFF',
    text: '#8B4513',
    textSecondary: '#A0522D',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    name: 'クラリネット',
    nameEn: 'Clarinet',
    primary: '#000000',
    secondary: '#2F2F2F',
    accent: '#1A1A1A',
    background: '#E6E6FA',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#333333',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'トロンボーン',
    nameEn: 'Trombone',
    primary: '#C0C0C0',
    secondary: '#E6E6FA',
    accent: '#A9A9A9',
    background: '#F0F8FF',
    surface: '#FFFFFF',
    text: '#2F4F4F',
    textSecondary: '#708090',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'チェロ',
    nameEn: 'Cello',
    primary: '#DC143C',
    secondary: '#FF69B4',
    accent: '#8B0000',
    background: '#FFE4E1',
    surface: '#FFFFFF',
    text: '#8B0000',
    textSecondary: '#B22222',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'ファゴット',
    nameEn: 'Bassoon',
    primary: '#A0522D',
    secondary: '#DEB887',
    accent: '#8B4513',
    background: '#FFF8DC',
    surface: '#FFFFFF',
    text: '#8B4513',
    textSecondary: '#A0522D',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    name: 'オーボエ',
    nameEn: 'Oboe',
    primary: '#DAA520',
    secondary: '#F0E68C',
    accent: '#B8860B',
    background: '#FFFACD',
    surface: '#FFFFFF',
    text: '#B8860B',
    textSecondary: '#DAA520',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440014',
    name: 'ハープ',
    nameEn: 'Harp',
    primary: '#FF69B4',
    secondary: '#FFB6C1',
    accent: '#C71585',
    background: '#FFF0F5',
    surface: '#FFFFFF',
    text: '#C71585',
    textSecondary: '#FF1493',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440015',
    name: 'コントラバス',
    nameEn: 'Contrabass',
    primary: '#2F4F4F',
    secondary: '#708090',
    accent: '#000000',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#2F4F4F',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440017',
    name: 'その他',
    nameEn: 'Other',
    primary: '#4682B4',
    secondary: '#87CEEB',
    accent: '#2F4F4F',
    background: '#E0F6FF',
    surface: '#FFFFFF',
    text: '#2F4F4F',
    textSecondary: '#4682B4',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440018',
    name: 'ヴィオラ',
    nameEn: 'Viola',
    primary: '#B22222',
    secondary: '#FF7F50',
    accent: '#8B0000',
    background: '#FFE4E1',
    surface: '#FFFFFF',
    text: '#8B0000',
    textSecondary: '#B22222',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440019',
    name: '琴',
    nameEn: 'Koto',
    primary: '#8B4513',
    secondary: '#DEB887',
    accent: '#654321',
    background: '#FFF8DC',
    surface: '#FFFFFF',
    text: '#2D1B00',
    textSecondary: '#8B4513',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440020',
    name: 'シンセサイザー',
    nameEn: 'Synthesizer',
    primary: '#4169E1',
    secondary: '#87CEEB',
    accent: '#1E90FF',
    background: '#E0F6FF',
    surface: '#FFFFFF',
    text: '#1E3A5F',
    textSecondary: '#4169E1',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440021',
    name: '太鼓',
    nameEn: 'Taiko',
    primary: '#DC143C',
    secondary: '#FF6347',
    accent: '#8B0000',
    background: '#FFE4E1',
    surface: '#FFFFFF',
    text: '#8B0000',
    textSecondary: '#DC143C',
  },
];

/**
 * データベースの楽器データとローカルの色設定をマージ
 */
const mergeInstrumentData = (dbInstrument: InstrumentFromDB): Instrument | null => {
  // ローカルのdefaultInstrumentsから同じIDの楽器を探す
  const localInstrument = defaultInstruments.find(local => local.id === dbInstrument.id);
  
  if (localInstrument) {
    // ローカルの色設定を使用（最新の色設定をコードで管理）
    // データベースの楽器名を使用
    return {
      id: dbInstrument.id,
      name: dbInstrument.name,
      nameEn: dbInstrument.name_en,
      primary: localInstrument.primary,
      secondary: localInstrument.secondary,
      accent: localInstrument.accent,
      background: localInstrument.background,
      surface: localInstrument.surface,
      text: localInstrument.text,
      textSecondary: localInstrument.textSecondary,
    };
  } else {
    // ローカルにない場合は、データベースの色設定を使用（フォールバック）
    return {
      id: dbInstrument.id,
      name: dbInstrument.name,
      nameEn: dbInstrument.name_en,
      primary: dbInstrument.color_primary || '#8B4513',
      secondary: dbInstrument.color_secondary || '#F8F9FA',
      accent: dbInstrument.color_accent || '#8B4513',
      background: '#FEFEFE',
      surface: '#FFFFFF',
      text: '#2D3748',
      textSecondary: '#718096',
    };
  }
};

/**
 * すべての楽器を取得（データベースとローカルの色設定をマージ）
 */
export const getAllInstruments = async (): Promise<ServiceResult<Instrument[]>> => {
  return safeServiceExecute(
    async () => {
      logger.debug(`[${SERVICE_CONTEXT}] getAllInstruments:start`);
      
      const result = await instrumentRepository.getAllInstruments();
      
      if (!result.success || !result.data) {
        // エラーの場合はローカルのdefaultInstrumentsを使用（警告は開発環境のみ、警告レベルを下げる）
        // リロード時にデータベースから読み込まないため、これは正常な動作
        if (__DEV__) {
          logger.debug(`[${SERVICE_CONTEXT}] getAllInstruments:fallback to defaultInstruments (正常な動作)`, {
            error: result.error
          });
        }
        return defaultInstruments;
      }
      
      if (result.data.length === 0) {
        // データベースに楽器がない場合はローカルのdefaultInstrumentsを使用（警告は開発環境のみ、警告レベルを下げる）
        // リロード時にデータベースから読み込まないため、これは正常な動作
        if (__DEV__) {
          logger.debug(`[${SERVICE_CONTEXT}] getAllInstruments:no instruments in DB, using defaultInstruments (正常な動作)`);
        }
        return defaultInstruments;
      }
      
      // データベースの楽器名とローカルの色設定をマージ
      const mergedInstruments: Instrument[] = result.data
        .map(mergeInstrumentData)
        .filter((instrument): instrument is Instrument => instrument !== null);
      
      logger.debug(`[${SERVICE_CONTEXT}] getAllInstruments:success`, { count: mergedInstruments.length });
      return mergedInstruments;
    },
    `${SERVICE_CONTEXT}.getAllInstruments`
  );
};

/**
 * IDで楽器を取得
 */
export const getInstrumentById = async (
  instrumentId: string
): Promise<ServiceResult<Instrument | null>> => {
  return safeServiceExecute(
    async () => {
      logger.debug(`[${SERVICE_CONTEXT}] getInstrumentById:start`, { instrumentId });
      
      const result = await instrumentRepository.getInstrumentById(instrumentId);
      
      if (!result.success || !result.data) {
        // エラーの場合はローカルのdefaultInstrumentsから探す
        const localInstrument = defaultInstruments.find(inst => inst.id === instrumentId);
        return localInstrument || null;
      }
      
      const mergedInstrument = mergeInstrumentData(result.data);
      if (!mergedInstrument) {
        // マージに失敗した場合はローカルのdefaultInstrumentsから探す
        const localInstrument = defaultInstruments.find(inst => inst.id === instrumentId);
        return localInstrument || null;
      }
      
      logger.debug(`[${SERVICE_CONTEXT}] getInstrumentById:success`);
      return mergedInstrument;
    },
    `${SERVICE_CONTEXT}.getInstrumentById`
  );
};

/**
 * デフォルト楽器リストを取得（オフライン時など）
 */
export const getDefaultInstruments = (): Instrument[] => {
  return defaultInstruments;
};

/**
 * 楽器サービスクラス
 */
export class InstrumentService {
  /**
   * すべての楽器を取得
   */
  async getAllInstruments(): Promise<ServiceResult<Instrument[]>> {
    return getAllInstruments();
  }

  /**
   * IDで楽器を取得
   */
  async getInstrumentById(instrumentId: string): Promise<ServiceResult<Instrument | null>> {
    return getInstrumentById(instrumentId);
  }

  /**
   * デフォルト楽器リストを取得
   */
  getDefaultInstruments(): Instrument[] {
    return getDefaultInstruments();
  }
}

/**
 * 楽器サービスのシングルトンインスタンス
 */
export const instrumentService = new InstrumentService();

