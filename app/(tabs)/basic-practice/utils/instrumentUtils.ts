/**
 * 楽器関連のユーティリティ関数
 */

/**
 * 楽器ID(選択ID) → 楽器キーへの変換
 */
export function getInstrumentKey(selectedInstrument: string): string {
  const id = selectedInstrument;
  const map: { [key: string]: string } = {
    '550e8400-e29b-41d4-a716-446655440001': 'piano',
    '550e8400-e29b-41d4-a716-446655440002': 'guitar',
    '550e8400-e29b-41d4-a716-446655440003': 'violin',
    '550e8400-e29b-41d4-a716-446655440004': 'flute',
    '550e8400-e29b-41d4-a716-446655440005': 'trumpet',
    '550e8400-e29b-41d4-a716-446655440006': 'drums',
    '550e8400-e29b-41d4-a716-446655440007': 'saxophone',
    '550e8400-e29b-41d4-a716-446655440008': 'horn',
    '550e8400-e29b-41d4-a716-446655440009': 'clarinet',
    '550e8400-e29b-41d4-a716-446655440010': 'tuba',
    '550e8400-e29b-41d4-a716-446655440011': 'cello',
    '550e8400-e29b-41d4-a716-446655440012': 'bassoon',
    '550e8400-e29b-41d4-a716-446655440013': 'trombone',
    // TODO: 実装完了後にコメントアウトを解除
    // '550e8400-e29b-41d4-a716-446655440014': 'harp',
    // '550e8400-e29b-41d4-a716-446655440015': 'harp',
    '550e8400-e29b-41d4-a716-446655440016': 'other',
  };
  return map[id] || id || 'other';
}

/**
 * 楽器名を取得する関数
 */
export function getInstrumentName(instrumentKey: string): string {
  const instrumentNames: { [key: string]: string } = {
    'piano': 'ピアノ',
    'guitar': 'ギター',
    'violin': 'バイオリン',
    'flute': 'フルート',
    'trumpet': 'トランペット',
    'drums': '打楽器',
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
}

