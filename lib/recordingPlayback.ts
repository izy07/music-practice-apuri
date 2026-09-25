import { Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';

/**
 * 録音ファイルの拡張子/MIMEを、実データに合わせて扱うためのユーティリティ。
 * 過去データは `.wav` 拡張子でも中身が WebM のものが多く、拡張子頼りだと再生に失敗する。
 */

export type DetectedAudioFormat = 'webm' | 'wav' | 'mp4' | 'ogg' | 'unknown';

const WEBM_MAGIC = [0x1a, 0x45, 0xdf, 0xa3];
const WAV_MAGIC = [0x52, 0x49, 0x46, 0x46]; // RIFF
const MP4_FTYP = [0x66, 0x74, 0x79, 0x70]; // ftyp at offset 4
const OGG_MAGIC = [0x4f, 0x67, 0x67, 0x53]; // OggS

export function mimeFromBlobType(blobType: string | undefined | null): {
  extension: string;
  contentType: string;
} {
  const type = (blobType || '').toLowerCase();
  if (type.includes('webm')) {
    return { extension: 'webm', contentType: 'audio/webm' };
  }
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) {
    return { extension: 'm4a', contentType: 'audio/mp4' };
  }
  if (type.includes('ogg')) {
    return { extension: 'ogg', contentType: 'audio/ogg' };
  }
  if (type.includes('wav') || type.includes('wave')) {
    return { extension: 'wav', contentType: 'audio/wav' };
  }
  // MediaRecorder 既定は webm が多い
  return { extension: 'webm', contentType: 'audio/webm' };
}

export function detectAudioFormat(bytes: Uint8Array): DetectedAudioFormat {
  if (bytes.length >= 4) {
    if (WEBM_MAGIC.every((b, i) => bytes[i] === b)) return 'webm';
    if (WAV_MAGIC.every((b, i) => bytes[i] === b)) return 'wav';
    if (OGG_MAGIC.every((b, i) => bytes[i] === b)) return 'ogg';
  }
  if (bytes.length >= 8 && MP4_FTYP.every((b, i) => bytes[4 + i] === b)) {
    return 'mp4';
  }
  return 'unknown';
}

export function mimeForFormat(format: DetectedAudioFormat, fallback?: string): string {
  switch (format) {
    case 'webm':
      return 'audio/webm';
    case 'wav':
      return 'audio/wav';
    case 'mp4':
      return 'audio/mp4';
    case 'ogg':
      return 'audio/ogg';
    default:
      return fallback || 'application/octet-stream';
  }
}

function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS/i.test(ua);
}

function canPlayWebmNatively(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const audio = document.createElement('audio');
    const webm = audio.canPlayType('audio/webm; codecs="opus"') || audio.canPlayType('audio/webm');
    return webm === 'probably' || webm === 'maybe';
  } catch {
    return !isSafariBrowser();
  }
}

/**
 * Storage パスまたは既存URLから、再生用の Blob URL を作る。
 * 呼び出し側は再生終了/エラー時に revokeObjectURL すること。
 */
export async function createPlayableRecordingObjectUrl(
  filePathOrUrl: string
): Promise<{ objectUrl: string; format: DetectedAudioFormat; contentType: string }> {
  if (!filePathOrUrl || filePathOrUrl.trim() === '') {
    throw new Error('録音ファイルのパスが無効です');
  }

  // すでに blob:/data: の場合はそのまま
  if (filePathOrUrl.startsWith('blob:') || filePathOrUrl.startsWith('data:')) {
    return {
      objectUrl: filePathOrUrl,
      format: 'unknown',
      contentType: 'application/octet-stream',
    };
  }

  let fetchUrl = filePathOrUrl;

  // Storage パス → public URL（バケットは public）
  if (!filePathOrUrl.startsWith('http://') && !filePathOrUrl.startsWith('https://')) {
    const { data: publicData } = supabase.storage.from('recordings').getPublicUrl(filePathOrUrl);
    fetchUrl = publicData.publicUrl;

    // public 取得に失敗しうる環境向けに署名URLもフォールバック（成功しても public を優先）
    if (!fetchUrl) {
      try {
        const { data: signed, error: signedError } = await supabase.storage
          .from('recordings')
          .createSignedUrl(filePathOrUrl, 60 * 60);
        if (!signedError && signed?.signedUrl) {
          fetchUrl = signed.signedUrl;
        }
      } catch (signedCatch) {
        logger.debug('署名URL取得をスキップ', signedCatch);
      }
    }
  }

  if (!fetchUrl) {
    throw new Error('録音ファイルのURLを取得できませんでした');
  }

  const response = await fetch(fetchUrl, {
    method: 'GET',
    headers: { Accept: 'audio/*,*/*' },
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `録音ファイルの取得に失敗しました (HTTP ${response.status})${body ? `: ${body.slice(0, 120)}` : ''}`
    );
  }

  const buffer = await response.arrayBuffer();
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('録音ファイルが空です');
  }

  const bytes = new Uint8Array(buffer);
  const format = detectAudioFormat(bytes);
  const headerType = response.headers.get('content-type') || undefined;
  const contentType = mimeForFormat(format, headerType);

  if (format === 'webm' && !canPlayWebmNatively()) {
    throw new Error(
      'この録音は WebM 形式のため、現在のブラウザでは再生できません。Chrome または Edge で開くか、Safari の場合は今後の録音（m4a）をご利用ください。'
    );
  }

  const blob = new Blob([buffer], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);

  logger.debug('再生用 ObjectURL 作成', {
    format,
    contentType,
    size: buffer.byteLength,
    pathPreview: filePathOrUrl.slice(0, 60),
  });

  return { objectUrl, format, contentType };
}

export type WebAudioPlaybackHandles = {
  audio: HTMLAudioElement;
  objectUrl: string;
  cleanup: () => void;
};

/**
 * Web 向け: 録音をロードして再生可能な Audio 要素を返す（まだ play しない場合もある）。
 */
export async function prepareWebRecordingAudio(
  filePathOrUrl: string,
  handlers?: {
    onEnded?: () => void;
    onError?: (message: string) => void;
  }
): Promise<WebAudioPlaybackHandles> {
  if (Platform.OS !== 'web') {
    throw new Error('録音再生はWeb環境でのみ利用できます');
  }

  const { objectUrl, format } = await createPlayableRecordingObjectUrl(filePathOrUrl);
  const audio = new Audio();
  // blob: URL に crossOrigin を付けると一部環境で再生が壊れるため設定しない
  audio.preload = 'auto';

  // cleanup / 意図的な破棄で発火する error を無視するためのフラグ
  let disposed = false;
  let endedNotified = false;

  const detachHandlers = () => {
    audio.onerror = null;
    audio.onended = null;
    audio.ontimeupdate = null;
    audio.onloadedmetadata = null;
  };

  const releaseMedia = () => {
    try {
      audio.pause();
    } catch {
      // ignore
    }
    // src 削除・revoke は次タスクへ遅延（同期実行だと終了直後に偽 error が飛ぶことがある）
    setTimeout(() => {
      try {
        audio.removeAttribute('src');
      } catch {
        // ignore
      }
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    }, 0);
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    detachHandlers();
    releaseMedia();
  };

  const notifyEnded = () => {
    if (endedNotified) return;
    endedNotified = true;
    cleanup();
    handlers?.onEnded?.();
  };

  /** WebM などでは再生成功後の終端で error が飛ぶことがある */
  const looksLikeSuccessfulEnd = (): boolean => {
    if (audio.ended) return true;
    const t = audio.currentTime;
    const d = audio.duration;
    if (!isFinite(t) || t <= 0.05) return false;
    // duration が取れる場合: 終端付近
    if (isFinite(d) && d > 0 && t >= d - 0.35) return true;
    // duration が Infinity/不明（WebM でよくある）: 少しでも再生されていれば終端エラーとみなす
    if (!isFinite(d) || d <= 0) return t > 0.2;
    return false;
  };

  audio.onended = () => {
    notifyEnded();
  };

  audio.onerror = () => {
    if (disposed || endedNotified) return;

    // 再生中断（abort）は無視
    if (audio.error?.code === 1) {
      logger.debug('録音 Audio 中断（無視）', { format });
      return;
    }

    // 再生できていたのに終了時だけ error が来るケース → 正常終了扱い
    if (looksLikeSuccessfulEnd()) {
      logger.debug('再生終端の偽エラーを無視（正常終了扱い）', {
        format,
        currentTime: audio.currentTime,
        duration: audio.duration,
        ended: audio.ended,
        errorCode: audio.error?.code,
      });
      notifyEnded();
      return;
    }

    const detail = audio.error
      ? `コード ${audio.error.code}: ${audio.error.message || '不明'}`
      : '不明なエラー';
    logger.error('録音 Audio 要素エラー', { detail, format, objectUrl });
    cleanup();
    handlers?.onError?.(detail);
  };

  // src 設定だけで読み込み開始（余分な load() は abort→偽エラーの原因になる）
  audio.src = objectUrl;

  return { audio, objectUrl, cleanup };
}

export function alertRecordingPlaybackError(error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '録音の再生に失敗しました';
  Alert.alert('再生エラー', message);
}
