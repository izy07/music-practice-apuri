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
 * すべてのプラットフォームでboxShadowを使用（shadow*プロパティは非推奨のため）
 * iOSとAndroidではboxShadowがサポートされていない場合のフォールバックとして、従来の方法も提供
 */
export function createShadowStyle(params: ShadowStyleParams): ViewStyle {
  const {
    shadowColor = '#000',
    shadowOffset = { width: 0, height: 2 },
    shadowOpacity = 0.1,
    shadowRadius = 4,
    elevation = 2,
  } = params;

  // rgba色に変換するヘルパー関数
  const convertToRgba = (color: string, opacity: number): string => {
    if (color === '#000' || color === 'black') {
      return `rgba(0, 0, 0, ${opacity})`;
    }
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    if (color.startsWith('rgba(')) {
      return color;
    }
    // 16進数カラーをrgbaに変換
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return `rgba(0, 0, 0, ${opacity})`;
  };

  const offsetX = shadowOffset.width || 0;
  const offsetY = shadowOffset.height || 2;
  const color = shadowColor || '#000';
  const opacity = shadowOpacity || 0.1;
  const radius = shadowRadius || 4;
  const rgbaColor = convertToRgba(color, opacity);
  
  // boxShadow文字列を生成
  const boxShadowValue = `${offsetX}px ${offsetY}px ${radius}px ${rgbaColor}`;

  // すべてのプラットフォームでboxShadowを使用（非推奨のshadow*プロパティは使用しない）
  if (Platform.OS === 'web') {
    // Web環境ではboxShadowを使用
    return {
      boxShadow: boxShadowValue,
      elevation, // フォールバック用
    } as any;
  } else if (Platform.OS === 'ios') {
    // iOSでもboxShadowのみを使用（shadow*プロパティは非推奨のため使用しない）
    // React Nativeの新しいアーキテクチャではboxShadowがサポートされている
    return {
      boxShadow: boxShadowValue,
      // フォールバックとしてelevationは使用しない（iOSではboxShadowが優先される）
    } as any;
  } else {
    // Androidではelevationを使用（boxShadowはサポートされていない可能性がある）
    return {
      elevation,
    } as any;
  }
}

