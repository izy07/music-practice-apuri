import { Platform, ViewStyle } from 'react-native';

interface ShadowStyleParams {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

/**
 * iOS、Android、Webのすべてのプラットフォームでシャドウスタイルを適用するためのユーティリティ関数
 * iOSではshadowColor, shadowOffset, shadowOpacity, shadowRadiusを使用
 * Androidではelevationを使用
 * WebではboxShadowを使用（shadow*プロパティは非推奨のため）
 */
export function createShadowStyle(params: ShadowStyleParams): ViewStyle {
  const {
    shadowColor = '#000',
    shadowOffset = { width: 0, height: 2 },
    shadowOpacity = 0.1,
    shadowRadius = 4,
    elevation = 2,
  } = params;

  if (Platform.OS === 'web') {
    // Web環境ではboxShadowを使用
    const offsetX = shadowOffset.width || 0;
    const offsetY = shadowOffset.height || 2;
    const color = shadowColor || '#000';
    const opacity = shadowOpacity || 0.1;
    const radius = shadowRadius || 4;
    
    // rgba色に変換
    const rgbaColor = color === '#000' 
      ? `rgba(0, 0, 0, ${opacity})`
      : color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${rgbaColor}`,
      elevation, // フォールバック用
    } as any;
  } else if (Platform.OS === 'ios') {
    return {
      shadowColor,
      shadowOffset,
      shadowOpacity,
      shadowRadius,
    };
  } else {
    // Android
    return {
      elevation,
    };
  }
}

