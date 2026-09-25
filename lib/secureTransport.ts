/**
 * 転送時暗号化（TLS/HTTPS）の単一ソース。
 * Play / App Store のデータセーフティ「転送時に暗号化」に対応するため、
 * 本番リリースではユーザーデータを平文 HTTP で送らない。
 */

import { Platform } from 'react-native';

/** リリースビルド（ストア配布・本番 Web）かどうか */
export function isReleaseTransportEnforced(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return false;
  }
  return process.env.NODE_ENV === 'production';
}

/**
 * ユーザーデータ送信先 URL が HTTPS か検証する。
 * ローカル `file:` / `content:` / `blob:` / 相対パスは端末内のため許可。
 */
export function assertEncryptedInTransit(
  url: string,
  context: string
): void {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    throw new Error(`[secureTransport] ${context}: URL が空です`);
  }

  const lower = trimmed.toLowerCase();

  // 端末内・メモリ上の参照はネットワーク転送ではない
  if (
    lower.startsWith('file:') ||
    lower.startsWith('content:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:') ||
    lower.startsWith('asset:') ||
    (!lower.includes('://') && !lower.startsWith('//'))
  ) {
    return;
  }

  if (lower.startsWith('https://')) {
    return;
  }

  // 開発時のみ localhost への HTTP を許可（ローカル Supabase）
  if (!isReleaseTransportEnforced()) {
    if (
      lower.startsWith('http://127.0.0.1') ||
      lower.startsWith('http://localhost') ||
      lower.startsWith('http://10.0.2.2') // Android エミュレータ → ホスト
    ) {
      return;
    }
  }

  throw new Error(
    `[secureTransport] ${context}: ユーザーデータの転送は HTTPS（TLS）必須です。拒否された URL: ${trimmed.slice(0, 64)}`
  );
}

/** API ベース URL（Supabase 等）用。リリースでは必ず https:// */
export function requireHttpsApiBaseUrl(url: string, context: string): string {
  const trimmed = (url || '').trim().replace(/\/$/, '');
  assertEncryptedInTransit(trimmed, context);
  if (isReleaseTransportEnforced() && !trimmed.toLowerCase().startsWith('https://')) {
    throw new Error(
      `[secureTransport] ${context}: 本番の API ベース URL は https:// で始まる必要があります`
    );
  }
  return trimmed;
}

export function describeTransportPolicy(): string {
  return [
    'ユーザーデータのネットワーク転送は TLS（HTTPS）で暗号化されます。',
    `platform=${Platform.OS}`,
    `releaseEnforced=${isReleaseTransportEnforced()}`,
  ].join(' ');
}
