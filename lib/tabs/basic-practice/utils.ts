/**
 * basic-practice.tsx のユーティリティ関数
 */

import { getInstrumentKeyFromId } from '@/lib/instrumentUtils';

/**
 * 楽器ID（選択ID）→ 楽器キーへの変換
 * @deprecated 直接 getInstrumentKeyFromId を使用してください
 */
export const getInstrumentKey = (selectedInstrument: string | null): string => {
  return getInstrumentKeyFromId(selectedInstrument, 'other');
};

/**
 * 楽器名を取得する関数
 * @deprecated データベースから取得した楽器情報を使用してください
 */
export const getInstrumentName = (
  selectedInstrument: string | null,
  customInstrumentName: string | null
): string => {
  // その他楽器が選択されていて、カスタム楽器名がある場合はそれを返す
  if (selectedInstrument === '550e8400-e29b-41d4-a716-446655440016' && customInstrumentName) {
    return customInstrumentName;
  }
  
  const instrumentKey = getInstrumentKey(selectedInstrument);
  // 楽器名マップ（データベースから取得できない場合のフォールバック）
  const instrumentNames: { [key: string]: string } = {
    'piano': 'ピアノ',
    'guitar': 'ギター',
    'violin': 'バイオリン',
    'flute': 'フルート',
    'trumpet': 'トランペット',
    'drums': 'ドラム',
    'saxophone': 'サックス',
    'horn': 'ホルン',
    'clarinet': 'クラリネット',
    'tuba': 'チューバ',
    'cello': 'チェロ',
    'bassoon': 'ファゴット',
    'trombone': 'トロンボーン',
    'oboe': 'オーボエ',
    'harp': 'ハープ',
    'other': '楽器'
  };
  return instrumentNames[instrumentKey] || '楽器';
};

