/**
 * 起動フェーズの診断情報（本番でも画面に表示する）
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type StartupPhase =
  | 'entry'
  | 'layout-mount'
  | 'auth-init'
  | 'nav-ready'
  | 'routed'
  | 'failed';

let phase: StartupPhase = 'entry';
let failureMessage: string | null = null;

export function setStartupPhase(next: StartupPhase): void {
  phase = next;
}

export function setStartupFailure(message: string): void {
  phase = 'failed';
  failureMessage = message;
}

export function getStartupPhase(): StartupPhase {
  return phase;
}

export function getStartupFailure(): string | null {
  return failureMessage;
}

/** ビルド識別子（テスターが「本当に新しい版か」を確認できる） */
export function getBuildStamp(): string {
  const version = Constants.expoConfig?.version ?? '?';
  const androidVc = Constants.expoConfig?.android?.versionCode;
  const profile = process.env.EAS_BUILD_PROFILE ?? 'local';
  const nativeModules = Constants.expoConfig?.extra?.nativeModules as
    | { easBuildProfile?: string }
    | undefined;

  const parts = [
    `v${version}`,
    androidVc != null ? `build ${androidVc}` : null,
    Platform.OS,
    __DEV__ ? 'dev' : 'release',
    profile !== 'local' ? profile : null,
    nativeModules?.easBuildProfile && nativeModules.easBuildProfile !== 'local'
      ? `prof:${nativeModules.easBuildProfile}`
      : null,
  ].filter(Boolean);
  return parts.join(' · ');
}
