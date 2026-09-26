import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import {
  alertRecordingPlaybackError,
  createPlayableRecordingObjectUrl,
  prepareWebRecordingAudio,
} from '@/lib/recordingPlayback';

type RecordingLike = {
  id: string;
  file_path: string;
};

let useAudioPlayerHook:
  | (() => {
      play: () => void;
      pause: () => void;
      seekTo: (seconds: number) => Promise<void>;
      replace: (source: string) => void;
    })
  | null = null;

if (Platform.OS !== 'web') {
  try {
    useAudioPlayerHook = require('expo-audio').useAudioPlayer;
  } catch {
    useAudioPlayerHook = null;
  }
}

/** 比較モーダル等での短いインライン再生 */
export function useInlineRecordingPlayer() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const webCleanupRef = useRef<(() => void) | null>(null);
  const nativePlayer = useAudioPlayerHook ? useAudioPlayerHook() : null;

  const stop = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (webCleanupRef.current) {
        webCleanupRef.current();
        webCleanupRef.current = null;
      }
    } else if (nativePlayer) {
      nativePlayer.pause();
      await nativePlayer.seekTo(0);
    }
    setPlayingId(null);
  }, [nativePlayer]);

  useEffect(() => {
    return () => {
      if (webCleanupRef.current) {
        webCleanupRef.current();
        webCleanupRef.current = null;
      }
    };
  }, []);

  const play = useCallback(
    async (recording: RecordingLike) => {
      if (!recording.file_path?.trim()) {
        Alert.alert('再生できません', '録音ファイルが見つかりません。');
        return;
      }

      if (playingId === recording.id) {
        await stop();
        return;
      }

      await stop();

      try {
        if (Platform.OS === 'web') {
          const { audio, cleanup } = await prepareWebRecordingAudio(recording.file_path, {
            onEnded: () => {
              webCleanupRef.current = null;
              setPlayingId(null);
            },
            onError: (detail) => {
              webCleanupRef.current = null;
              alertRecordingPlaybackError(detail);
              setPlayingId(null);
            },
          });
          webCleanupRef.current = cleanup;
          await audio.play();
          setPlayingId(recording.id);
          return;
        }

        if (!nativePlayer) {
          Alert.alert('再生できません', 'この端末では録音再生を利用できません。');
          return;
        }

        const prepared = await createPlayableRecordingObjectUrl(recording.file_path);
        nativePlayer.replace(prepared.objectUrl);
        nativePlayer.play();
        setPlayingId(recording.id);
      } catch (e) {
        alertRecordingPlaybackError(e);
        setPlayingId(null);
      }
    },
    [nativePlayer, playingId, stop]
  );

  return { playingId, play, stop };
}
