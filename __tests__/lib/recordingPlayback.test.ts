import { detectAudioFormat, mimeFromBlobType, mimeForFormat } from '@/lib/recordingPlayback';

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
