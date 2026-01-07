/**
 * 楽器関連のユーティリティ関数
 * ハードコードされた楽器IDマッピング、絵文字マップを集約
 */

/**
 * 楽器名（英語）から絵文字への変換マップ
 */
const INSTRUMENT_NAME_TO_EMOJI_MAP: Record<string, string> = {
  'Piano': '🎹',
  'Guitar': '🎸',
  'Violin': '🎻',
  'Flute': '🪈',
  'Trumpet': '🎺',
  'Drums': '🥁',
  'Saxophone': '🎷',
  'Horn': '📯',
  'Clarinet': '🎵',
  'Trombone': '🎺',
  'Cello': '🎻',
  'Bassoon': '🎵',
  'Oboe': '🎵',
  'Harp': '🎶',
  'Contrabass': '🎻',
  'Viola': '🎻',
  'Koto': '🎵',
  'Synthesizer': '🎹',
  'Taiko': '🥁',
  'Other': '❓',
};

/**
 * 楽器ID（UUID）から楽器キーへの変換マップ
 * このマップは、instrument-selection.tsx で使用している固定UUIDと対応しています
 */
const INSTRUMENT_ID_TO_KEY_MAP: Record<string, string> = {
  '550e8400-e29b-41d4-a716-446655440001': 'piano',     // ピアノ
  '550e8400-e29b-41d4-a716-446655440002': 'guitar',    // ギター
  '550e8400-e29b-41d4-a716-446655440003': 'violin',    // バイオリン
  '550e8400-e29b-41d4-a716-446655440004': 'flute',     // フルート
  '550e8400-e29b-41d4-a716-446655440005': 'trumpet',   // トランペット
  '550e8400-e29b-41d4-a716-446655440006': 'drums',     // ドラム
  '550e8400-e29b-41d4-a716-446655440007': 'saxophone', // サックス
  '550e8400-e29b-41d4-a716-446655440008': 'horn',      // ホルン
  '550e8400-e29b-41d4-a716-446655440009': 'clarinet',  // クラリネット
  '550e8400-e29b-41d4-a716-446655440010': 'trombone',  // トロンボーン
  '550e8400-e29b-41d4-a716-446655440011': 'cello',     // チェロ
  '550e8400-e29b-41d4-a716-446655440012': 'bassoon',   // ファゴット
  '550e8400-e29b-41d4-a716-446655440013': 'oboe',      // オーボエ
  '550e8400-e29b-41d4-a716-446655440014': 'harp',      // ハープ
  '550e8400-e29b-41d4-a716-446655440015': 'contrabass', // コントラバス
  '550e8400-e29b-41d4-a716-446655440016': 'other',     // その他
  '550e8400-e29b-41d4-a716-446655440018': 'viola',     // ヴィオラ
  '550e8400-e29b-41d4-a716-446655440019': 'koto',      // 琴
  '550e8400-e29b-41d4-a716-446655440020': 'synthesizer', // シンセサイザー
  '550e8400-e29b-41d4-a716-446655440021': 'taiko',     // 太鼓
};

/**
 * 楽器ID（UUID）から楽器キーに変換
 * @param instrumentId 楽器ID（UUID）
 * @param defaultKey デフォルトの楽器キー（見つからない場合）
 * @returns 楽器キー
 */
export const getInstrumentKeyFromId = (instrumentId: string | null | undefined, defaultKey: string = 'other'): string => {
  if (!instrumentId) return defaultKey;
  return INSTRUMENT_ID_TO_KEY_MAP[instrumentId] || defaultKey;
};

/**
 * 楽器キーから楽器ID（UUID）に変換（逆引き）
 * @param instrumentKey 楽器キー
 * @returns 楽器ID（UUID）またはnull
 */
export const getInstrumentIdFromKey = (instrumentKey: string): string | null => {
  const entry = Object.entries(INSTRUMENT_ID_TO_KEY_MAP).find(([_, key]) => key === instrumentKey);
  return entry ? entry[0] : null;
};

/**
 * すべての楽器IDマッピングを取得（デバッグ用）
 */
export const getAllInstrumentMappings = (): Record<string, string> => {
  return { ...INSTRUMENT_ID_TO_KEY_MAP };
};

/**
 * 楽器名（英語）から絵文字を取得
 * @param nameEn 楽器名（英語）
 * @param defaultEmoji デフォルトの絵文字（見つからない場合）
 * @returns 絵文字
 */
export const getInstrumentEmoji = (nameEn: string, defaultEmoji: string = '🎵'): string => {
  if (!nameEn) return defaultEmoji;
  return INSTRUMENT_NAME_TO_EMOJI_MAP[nameEn] || defaultEmoji;
};

/**
 * selectedInstrumentから楽器IDを統一的な方法で取得
 * すべての場所で同じロジックを使用するための共通関数
 * @param selectedInstrument selectedInstrument（string型のID文字列）
 * @returns 楽器ID（string）またはnull（空文字列や未設定の場合）
 */
export const getInstrumentId = (selectedInstrument: string | null | undefined): string | null => {
  return selectedInstrument && selectedInstrument.trim() !== '' 
    ? selectedInstrument 
    : null;
};

/**
 * 有効な楽器IDを取得（統一的なフォールバック処理）
 * 
 * 優先順位:
 * 1. InstrumentThemeContext の selectedInstrument
 * 2. user.selected_instrument_id（認証情報から）
 * 3. null
 * 
 * これにより、InstrumentThemeContext がタイムアウトした場合でも、
 * user.selected_instrument_id をフォールバックとして使用できます。
 * 
 * @param selectedInstrument InstrumentThemeContext から取得した楽器ID
 * @param userSelectedInstrumentId user.selected_instrument_id（認証情報から）
 * @returns 有効な楽器ID（string）またはnull
 */
export const getEffectiveInstrumentId = (
  selectedInstrument: string | null | undefined,
  userSelectedInstrumentId?: string | null | undefined
): string | null => {
  // 優先順位1: InstrumentThemeContext の selectedInstrument
  const contextId = getInstrumentId(selectedInstrument);
  if (contextId) {
    return contextId;
  }
  
  // 優先順位2: user.selected_instrument_id（認証情報から）
  const userId = getInstrumentId(userSelectedInstrumentId);
  if (userId) {
    return userId;
  }
  
  // 優先順位3: null
  return null;
};
