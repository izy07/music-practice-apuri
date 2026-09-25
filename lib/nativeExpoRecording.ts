/**
 * expo-audio によるネイティブ録音ヘルパー（AudioRecorder コンポーネントから利用）
 */
import { Platform } from 'react-native';
import logger from '@/lib/logger';

type ExpoAudioModule = {
  AudioModule: {
    requestRecordingPermissionsAsync: () => Promise<{ granted: boolean }>;
  };
  setAudioModeAsync: (mode: {
    playsInSilentMode?: boolean;
    allowsRecording?: boolean;
  }) => Promise<void>;
  RecordingPresets: {
    HIGH_QUALITY: Record<string, unknown>;
  };
  useAudioRecorder: (options: Record<string, unknown>) => ExpoAudioRecorder;
};

export interface ExpoAudioRecorder {
  uri: string | null;
  prepareToRecordAsync: () => Promise<void>;
  record: () => void;
  stop: () => Promise<void>;
  getStatus?: () => { durationMillis?: number };
}

let expoAudio: ExpoAudioModule | null = null;

export const getExpoAudioModule = (): ExpoAudioModule | null => {
  if (Platform.OS === 'web') return null;
  if (expoAudio) return expoAudio;
  try {
    expoAudio = require('expo-audio') as ExpoAudioModule;
  } catch (error) {
    logger.warn('expo-audio を読み込めません', error);
    expoAudio = null;
  }
  return expoAudio;
};

export const requestNativeRecordingPermission = async (): Promise<boolean> => {
  const mod = getExpoAudioModule();
  if (!mod) return false;
  const status = await mod.AudioModule.requestRecordingPermissionsAsync();
  return status.granted;
};

export const configureNativeRecordingMode = async (): Promise<void> => {
  const mod = getExpoAudioModule();
  if (!mod) return;
  await mod.setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
  });
};

export const uriToBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`録音ファイルの読み込みに失敗しました (HTTP ${response.status})`);
  }
  return response.blob();
};
