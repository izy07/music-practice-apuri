/**
 * ネイティブ（iOS/Android）向けチューナーエンジン
 *
 * PCM を短いホップで受け取り、Web と同じ長さの解析窓（リングバッファ）で
 * combineAlgorithms を回す。短い単発バッファのまま検出していたのが低音精度の根因。
 */
import { Platform } from 'react-native';
import { combineAlgorithms, TUNER_ANALYSIS } from '@/lib/tunerAudioProcessor';
import logger from '@/lib/logger';

export type NativeTunerFrequencyCallback = (frequency: number) => void;

type NativeAudioApiModule = {
  AudioRecorder: new () => {
    onAudioReady: (
      options: { sampleRate: number; bufferLength: number; channelCount: number },
      callback: (event: { buffer: Float32Array | number[]; numFrames: number }) => void
    ) => void;
    clearOnAudioReady: () => void;
    start: () => void;
    stop: () => void;
    disconnect: () => void;
  };
  AudioManager: {
    requestRecordingPermissions: () => Promise<boolean>;
    setAudioSessionOptions?: (options: {
      iosCategory?: string;
      iosMode?: string;
      iosOptions?: string[];
    }) => Promise<void>;
  };
};

let cachedModule: NativeAudioApiModule | null | undefined;

const loadNativeAudioApi = (): NativeAudioApiModule | null => {
  if (Platform.OS === 'web') return null;
  if (cachedModule !== undefined) return cachedModule;
  try {
    cachedModule = require('react-native-audio-api') as NativeAudioApiModule;
  } catch (error) {
    logger.warn('react-native-audio-api を読み込めません', error);
    cachedModule = null;
  }
  return cachedModule;
};

export const isNativeTunerSupported = (): boolean => loadNativeAudioApi() !== null;

export class NativeTunerEngine {
  private recorder: InstanceType<NativeAudioApiModule['AudioRecorder']> | null = null;
  private sampleRate = TUNER_ANALYSIS.SAMPLE_RATE;
  private running = false;
  private ring = new Float32Array(TUNER_ANALYSIS.WINDOW_SAMPLES);
  private writePos = 0;
  private filled = 0;
  private analysisWindow = new Float32Array(TUNER_ANALYSIS.WINDOW_SAMPLES);

  async start(onFrequency: NativeTunerFrequencyCallback): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('NativeTunerEngine は Web では使用できません');
    }

    const api = loadNativeAudioApi();
    if (!api) {
      throw new Error('ネイティブオーディオ API が利用できません');
    }

    const granted = await api.AudioManager.requestRecordingPermissions();
    if (!granted) {
      throw new Error('マイク権限が拒否されました');
    }

    if (api.AudioManager.setAudioSessionOptions) {
      await api.AudioManager.setAudioSessionOptions({
        iosCategory: 'playAndRecord',
        iosMode: 'measurement',
        iosOptions: ['defaultToSpeaker', 'allowBluetooth'],
      });
    }

    await this.stop();
    this.resetRing();

    const recorder = new api.AudioRecorder();
    const hopSamples = TUNER_ANALYSIS.HOP_SAMPLES;

    recorder.onAudioReady(
      { sampleRate: this.sampleRate, bufferLength: hopSamples, channelCount: 1 },
      ({ buffer }) => {
        if (!this.running) return;
        const samples =
          buffer instanceof Float32Array ? buffer : new Float32Array(buffer as number[]);
        this.appendSamples(samples);
        const window = this.copyAnalysisWindow();
        if (!window) return;
        const frequency = combineAlgorithms(window, this.sampleRate);
        if (frequency > 0) {
          onFrequency(frequency);
        }
      }
    );

    recorder.start();
    this.recorder = recorder;
    this.running = true;
    logger.debug('NativeTunerEngine started', {
      windowSamples: TUNER_ANALYSIS.WINDOW_SAMPLES,
      hopSamples,
      sampleRate: this.sampleRate,
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (!this.recorder) {
      this.resetRing();
      return;
    }
    try {
      this.recorder.stop();
      this.recorder.clearOnAudioReady();
      this.recorder.disconnect();
    } catch (error) {
      logger.debug('NativeTunerEngine stop error:', error);
    }
    this.recorder = null;
    this.resetRing();
  }

  private resetRing(): void {
    this.ring.fill(0);
    this.writePos = 0;
    this.filled = 0;
  }

  private appendSamples(chunk: Float32Array): void {
    const n = this.ring.length;
    for (let i = 0; i < chunk.length; i++) {
      this.ring[this.writePos] = chunk[i];
      this.writePos = (this.writePos + 1) % n;
      if (this.filled < n) this.filled += 1;
    }
  }

  /** リング内の最古〜最新を連続配列に展開。窓が埋まるまで null */
  private copyAnalysisWindow(): Float32Array | null {
    const n = this.ring.length;
    if (this.filled < n) return null;
    const out = this.analysisWindow;
    const start = this.writePos; // 次に書く位置 = 最古
    const firstLen = n - start;
    out.set(this.ring.subarray(start), 0);
    if (start > 0) {
      out.set(this.ring.subarray(0, start), firstLen);
    }
    return out;
  }
}
