/**
 * 楽器（instruments）関連のサービス
 * ビジネスロジックをUIから分離
 */

import { instrumentRepository, InstrumentFromDB } from '@/repositories/instrumentRepository';
import { safeServiceExecute, ServiceResult } from './baseService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { getAllStaticInstruments, getStaticInstrumentById } from '@/data/staticInstruments';

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
    primary: '#4A4A4A',
    secondary: '#E8E8E8',
    accent: '#9E9E9E',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#5A5A5A',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'ギター',
    nameEn: 'Guitar',
    primary: '#E63946',
    secondary: '#FF8A95',
    accent: '#C41E3A',
    background: '#FFF0F2',
    surface: '#FFFFFF',
    text: '#E63946',
    textSecondary: '#C41E3A',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'バイオリン',
    nameEn: 'Violin',
    primary: '#654321',
    secondary: '#DEB887',
    accent: '#8B4513',
    background: '#FFF8DC',
    surface: '#FFFFFF',
    text: '#2D1B00',
    textSecondary: '#8B4513',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'フルート',
    nameEn: 'Flute',
    primary: '#26A69A',
    secondary: '#80CBC4',
    accent: '#00897B',
    background: '#E0F2F1',
    surface: '#FFFFFF',
    text: '#004D40',
    textSecondary: '#00695C',
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
    name: 'ドラム',
    nameEn: 'Drums',
    primary: '#4A4A4A',
    secondary: '#E8E8E8',
    accent: '#9E9E9E',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#5A5A5A',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'サックス',
    nameEn: 'Saxophone',
    primary: '#E68900',
    secondary: '#FFB74D',
    accent: '#D68910',
    background: '#FFF8E1',
    surface: '#FFFFFF',
    text: '#B8860B',
    textSecondary: '#D4AF37',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'ホルン',
    nameEn: 'Horn',
    primary: '#B8860B',
    secondary: '#DAA520',
    accent: '#8B4513',
    background: '#FFE4B5',
    surface: '#FFFFFF',
    text: '#8B4513',
    textSecondary: '#B8860B',
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
    primary: '#DAA520',
    secondary: '#F0E68C',
    accent: '#B8860B',
    background: '#FFFACD',
    surface: '#FFFFFF',
    text: '#B8860B',
    textSecondary: '#DAA520',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'チェロ',
    nameEn: 'Cello',
    primary: '#6B4423',
    secondary: '#CD853F',
    accent: '#8B4513',
    background: '#FFF8F0',
    surface: '#FFFFFF',
    text: '#654321',
    textSecondary: '#8B4513',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'ファゴット',
    nameEn: 'Bassoon',
    primary: '#CD5C5C',
    secondary: '#F0A0A0',
    accent: '#B22222',
    background: '#FFF5F5',
    surface: '#FFFFFF',
    text: '#8B0000',
    textSecondary: '#A52A2A',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    name: 'オーボエ',
    nameEn: 'Oboe',
    primary: '#1A1A1A',
    secondary: '#2F2F2F',
    accent: '#000000',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#1A1A1A',
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
    primary: '#5C4033',
    secondary: '#8B7355',
    accent: '#3E2723',
    background: '#F5F0E8',
    surface: '#FFFFFF',
    text: '#5C4033',
    textSecondary: '#3E2723',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440016',
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
  {
    id: '550e8400-e29b-41d4-a716-446655440022',
    name: 'チューバ',
    nameEn: 'Tuba',
    primary: '#8B4513',
    secondary: '#D2691E',
    accent: '#654321',
    background: '#FFF8DC',
    surface: '#FFFFFF',
    text: '#2D1B00',
    textSecondary: '#8B4513',
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
 * すべての楽器を取得（静的データから取得）
 */
export const getAllInstruments = async (): Promise<ServiceResult<Instrument[]>> => {
  return safeServiceExecute(
    async () => {
      logger.debug(`[${SERVICE_CONTEXT}] getAllInstruments:start (静的データから取得)`);
      
      // 静的データから取得（データベースリクエスト不要）
      // 動的インポートを静的インポートに変更（GitHub Pagesでの404エラーを防ぐため）
      const staticInstruments = getAllStaticInstruments();
      
      if (staticInstruments.length === 0) {
        // 静的データが空の場合は、フォールバックとしてdefaultInstrumentsを使用
        logger.warn(`[${SERVICE_CONTEXT}] getAllInstruments:静的データが空のため、defaultInstrumentsを使用`);
        return defaultInstruments;
      }
      
      logger.debug(`[${SERVICE_CONTEXT}] getAllInstruments:success (静的データ)`, { count: staticInstruments.length });
      return staticInstruments;
    },
    `${SERVICE_CONTEXT}.getAllInstruments`
  );
};

/**
 * IDで楽器を取得（静的データから取得）
 */
export const getInstrumentById = async (
  instrumentId: string
): Promise<ServiceResult<Instrument | null>> => {
  return safeServiceExecute(
    async () => {
      logger.debug(`[${SERVICE_CONTEXT}] getInstrumentById:start (静的データから取得)`, { instrumentId });
      
      // 静的データから取得（データベースリクエスト不要）
      // 動的インポートを静的インポートに変更（GitHub Pagesでの404エラーを防ぐため）
      const instrument = getStaticInstrumentById(instrumentId);
      
      if (!instrument) {
        logger.debug(`[${SERVICE_CONTEXT}] getInstrumentById:楽器が見つかりません`, { instrumentId });
        return null;
      }
      
      logger.debug(`[${SERVICE_CONTEXT}] getInstrumentById:success (静的データ)`, { instrumentId });
      return instrument;
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

