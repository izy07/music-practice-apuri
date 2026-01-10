/**
 * イベントの色定義
 */

export type EventColor = 'red' | 'green' | 'blue' | 'orange' | 'purple';

export interface EventColorOption {
  value: EventColor;
  label: string;
  color: string;
  description: string;
}

export const EVENT_COLORS: Record<EventColor, EventColorOption> = {
  red: {
    value: 'red',
    label: '演奏会',
    color: '#FF4444',
    description: '演奏会、コンサート、発表会など',
  },
  green: {
    value: 'green',
    label: 'メンテナンス',
    color: '#4CAF50',
    description: '楽器のメンテナンス、調整など',
  },
  blue: {
    value: 'blue',
    label: 'レッスン',
    color: '#2196F3',
    description: 'レッスン、練習会など',
  },
  orange: {
    value: 'orange',
    label: '練習',
    color: '#FF9800',
    description: '練習、合奏練習など',
  },
  purple: {
    value: 'purple',
    label: 'その他',
    color: '#9C27B0',
    description: 'その他のイベント',
  },
};

export const DEFAULT_EVENT_COLOR: EventColor = 'blue';

/**
 * 色の値から色オプションを取得
 */
export const getEventColorOption = (color: EventColor | string | null | undefined): EventColorOption => {
  if (!color || !(color in EVENT_COLORS)) {
    return EVENT_COLORS[DEFAULT_EVENT_COLOR];
  }
  return EVENT_COLORS[color as EventColor];
};

/**
 * 色の値から色コードを取得
 */
export const getEventColorCode = (color: EventColor | string | null | undefined): string => {
  return getEventColorOption(color).color;
};

