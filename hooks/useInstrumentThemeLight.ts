/**
 * 軽量版楽器テーマフック
 * 
 * InstrumentThemeContextへの依存を削減し、必要な情報のみを取得
 * パフォーマンス向上と結合度削減を目的とする
 */

import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useMemo } from 'react';

/**
 * 軽量版楽器テーマフック
 * 
 * テーマ情報が不要な画面では、このフックを使用することで
 * 不要な再レンダリングを防ぎます
 */
export function useInstrumentThemeLight() {
  const theme = useInstrumentTheme();
  
  // 必要な情報のみをメモ化して返す
  return useMemo(() => ({
    // 最小限の情報のみを公開
    selectedInstrument: theme.selectedInstrument,
    primaryColor: theme.currentTheme?.primary || '#6366f1',
    hasInstrument: !!theme.selectedInstrument && theme.selectedInstrument.trim() !== '',
  }), [
    theme.selectedInstrument,
    theme.currentTheme?.primary,
  ]);
}

/**
 * 楽器選択状態のみを取得するフック
 * 
 * テーマ情報が不要で、楽器選択状態のみ知りたい場合に使用
 */
export function useInstrumentSelection() {
  const theme = useInstrumentTheme();
  
  return useMemo(() => ({
    selectedInstrument: theme.selectedInstrument,
    hasInstrument: !!theme.selectedInstrument && theme.selectedInstrument.trim() !== '',
  }), [theme.selectedInstrument]);
}

/**
 * 色情報のみを取得するフック
 * 
 * テーマ情報は不要で、色のみ必要な場合に使用
 */
export function useInstrumentColors() {
  const theme = useInstrumentTheme();
  
  return useMemo(() => ({
    primary: theme.currentTheme?.primary || '#6366f1',
    secondary: theme.currentTheme?.secondary || '#8b5cf6',
    accent: theme.currentTheme?.accent || '#ec4899',
  }), [
    theme.currentTheme?.primary,
    theme.currentTheme?.secondary,
    theme.currentTheme?.accent,
  ]);
}

