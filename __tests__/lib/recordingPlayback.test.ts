import {
  detectAudioFormat,
  mimeFromBlobType,
  mimeForFormat,
  shouldIgnoreRecordingAudioError,
} from '@/lib/recordingPlayback';

describe('recordingPlayback', () => {
  it('detects WebM magic bytes', () => {
    const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00]);
    expect(detectAudioFormat(bytes)).toBe('webm');
    expect(mimeForFormat('webm')).toBe('audio/webm');
  });

  it('detects WAV (RIFF) magic bytes', () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
    expect(detectAudioFormat(bytes)).toBe('wav');
  });

  it('ignores playback errors after intentional mid-playback stop', () => {
    expect(
      shouldIgnoreRecordingAudioError(
        {
          error: { code: 4, message: 'MEDIA_ELEMENT_ERROR' } as MediaError,
          paused: true,
          ended: false,
          currentTime: 0,
          duration: 30,
        },
        { disposed: false, endedNotified: false, hasPlayed: true }
      )
    ).toBe(true);
  });

  it('does not ignore errors before playback starts', () => {
    expect(
      shouldIgnoreRecordingAudioError(
        {
          error: { code: 4, message: 'MEDIA_ELEMENT_ERROR' } as MediaError,
          paused: true,
          ended: false,
          currentTime: 0,
          duration: 0,
        },
        { disposed: false, endedNotified: false, hasPlayed: false }
      )
    ).toBe(false);
  });

  it('maps MediaRecorder blob types to extensions', () => {
    expect(mimeFromBlobType('audio/webm;codecs=opus')).toEqual({
      extension: 'webm',
      contentType: 'audio/webm',
    });
    expect(mimeFromBlobType('audio/mp4')).toEqual({
      extension: 'm4a',
      contentType: 'audio/mp4',
    });
  });
});
