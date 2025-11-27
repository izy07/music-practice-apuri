/**
 * テーマ色のみを取得する軽量フック
 * 
 * InstrumentThemeContextへの依存を最小限に抑え、
 * 色情報のみが必要な場合に使用
 * パフォーマンス向上と結合度削減を目的とする
 */

import { useMemo } from 'react';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

/**
 * テーマ色のみを取得するフック
 * 
 * 色情報のみが必要で、楽器選択やその他の機能が不要な場合に使用
 * 再レンダリングを最小限に抑えます
 */
export function useThemeColors() {
  const { currentTheme } = useInstrumentTheme();
  
  return useMemo(() => ({
    primary: currentTheme?.primary || '#6366f1',
    secondary: currentTheme?.secondary || '#8b5cf6',
    accent: currentTheme?.accent || '#ec4899',
    background: currentTheme?.background || '#ffffff',
    surface: currentTheme?.surface || '#ffffff',
    text: currentTheme?.text || '#1f2937',
    textSecondary: currentTheme?.textSecondary || '#6b7280',
  }), [
    currentTheme?.primary,
    currentTheme?.secondary,
    currentTheme?.accent,
    currentTheme?.background,
    currentTheme?.surface,
    currentTheme?.text,
    currentTheme?.textSecondary,
  ]);
}

/**
 * 特定の色のみを取得するフック
 * 
 * 1つの色のみが必要な場合に使用
 */
export function useThemeColor(colorKey: 'primary' | 'secondary' | 'accent' | 'background' | 'surface' | 'text' | 'textSecondary') {
  const { currentTheme } = useInstrumentTheme();
  
  return useMemo(() => {
    const defaultColors: Record<string, string> = {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      background: '#ffffff',
      surface: '#ffffff',
      text: '#1f2937',
      textSecondary: '#6b7280',
    };
    
    return currentTheme?.[colorKey] || defaultColors[colorKey] || '#6366f1';
  }, [currentTheme, colorKey]);
}

