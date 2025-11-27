// Web環境でのExpoパッケージの読み込み制御
import { Platform } from 'react-native';
import logger from './logger';

// Web環境で問題を起こす可能性のあるExpoパッケージのリスト
const WEB_INCOMPATIBLE_PACKAGES = [
  'expo-camera',
  'expo-audio',
  'expo-haptics',
  'expo-sensors',
  'expo-speech',
  'expo-tracking-transparency',
  'expo-document-picker',
  'expo-file-system',
];

// Web環境で安全にパッケージを読み込む関数
export function safeRequire(moduleName: string): any {
  if (Platform.OS === 'web' && WEB_INCOMPATIBLE_PACKAGES.includes(moduleName)) {
    logger.warn(`Package ${moduleName} is not compatible with web platform`);
    return null;
  }
  
  try {
    return require(moduleName);
  } catch (error) {
    logger.warn(`Failed to load module ${moduleName}:`, error);
    return null;
  }
}

// Web環境で安全にパッケージから特定のエクスポートを取得する関数
export function safeImport(moduleName: string, exportName: string): any {
  const module = safeRequire(moduleName);
  if (!module) return null;
  
  try {
    return module[exportName];
  } catch (error) {
    logger.warn(`Failed to get ${exportName} from ${moduleName}:`, error);
    return null;
  }
}


