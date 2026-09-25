/**
 * ネイティブ向け録音再生 URL 解決
 */
import { createPlayableRecordingObjectUrl } from '@/lib/recordingPlayback';

export const resolveRecordingPlayUrl = async (filePathOrUrl: string): Promise<string> => {
  if (filePathOrUrl.startsWith('file://') || filePathOrUrl.startsWith('http')) {
    return filePathOrUrl;
  }
  const { objectUrl } = await createPlayableRecordingObjectUrl(filePathOrUrl);
  return objectUrl;
};
