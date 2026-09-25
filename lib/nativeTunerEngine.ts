/**
 * ネイティブ（iOS/Android）向けチューナーエンジン
 *
 * PCM を短いホップで受け取り、Web と同じ長さの解析窓（リングバッファ）で
 * combineAlgorithms を回す。
 */
import { Platform } from 'react-native';
import { combineAlgorithms, TUNER_ANALYSIS } from '@/lib/tunerAudioProcessor';
import logger from '@/lib/logger';
import {
  emptyTunerDiag,
  tunerDiagLog,
  type TunerDiagSnapshot,
} from '@/lib/tunerDiagnostics';

export type NativeTunerFrequencyCallback = (frequency: number) => void;

export type NativeTunerOptions = {
  sampleRate?: number;
  windowSamples?: number;
  hopSamples?: number;
};

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
  private windowSamples = TUNER_ANALYSIS.WINDOW_SAMPLES;
  private hopSamples = TUNER_ANALYSIS.HOP_SAMPLES;
  private running = false;
  private busy = false;
  private generation = 0;
  private ring = new Float32Array(TUNER_ANALYSIS.WINDOW_SAMPLES);
  private writePos = 0;
  private filled = 0;
  private analysisWindow = new Float32Array(TUNER_ANALYSIS.WINDOW_SAMPLES);
  private snapshot = new Float32Array(TUNER_ANALYSIS.WINDOW_SAMPLES);
  private stats = emptyTunerDiag();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private loggedFirstCallback = false;
  private loggedWindowReady = false;

  configure(options: NativeTunerOptions): void {
    this.sampleRate = options.sampleRate ?? TUNER_ANALYSIS.SAMPLE_RATE;
    this.windowSamples = options.windowSamples ?? TUNER_ANALYSIS.WINDOW_SAMPLES;
    this.hopSamples = options.hopSamples ?? TUNER_ANALYSIS.HOP_SAMPLES;
    this.resetRing();
  }

  async start(
    onFrequency: NativeTunerFrequencyCallback,
    options?: NativeTunerOptions
  ): Promise<void> {
    if (options) this.configure(options);

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
    this.stats = emptyTunerDiag();
    this.loggedFirstCallback = false;
    this.loggedWindowReady = false;

    const recorder = new api.AudioRecorder();

    recorder.onAudioReady(
      { sampleRate: this.sampleRate, bufferLength: this.hopSamples, channelCount: 1 },
      ({ buffer, numFrames }) => {
        if (!this.running) return;
        const samples =
          buffer instanceof Float32Array ? buffer : new Float32Array(buffer as number[]);
        this.stats.callbacks += 1;
        this.stats.lastChunk = samples.length;
        if (!this.loggedFirstCallback) {
          this.loggedFirstCallback = true;
          tunerDiagLog('first-callback', {
            samples: samples.length,
            numFrames,
            hop: this.hopSamples,
            window: this.windowSamples,
          });
        }
        this.appendSamples(samples);
        // 解析中のホップは捨てる。キューに積むと JS が戻りきらず画面が固まる。
        if (this.busy) {
          this.stats.droppedBusy += 1;
          return;
        }
        if (!this.copyAnalysisWindow()) {
          this.stats.waitingWindow += 1;
          return;
        }
        if (!this.loggedWindowReady) {
          this.loggedWindowReady = true;
          tunerDiagLog('window-ready', {
            callbacks: this.stats.callbacks,
            filled: this.filled,
          });
        }
        this.scheduleAnalysis(onFrequency);
      }
    );

    this.recorder = recorder;
    this.running = true;
    recorder.start();
    this.heartbeat = setInterval(() => {
      this.stats.busy = this.busy;
      tunerDiagLog('beat', { ...this.stats });
    }, 1000);
    tunerDiagLog('started', {
      windowSamples: this.windowSamples,
      hopSamples: this.hopSamples,
      sampleRate: this.sampleRate,
      platform: Platform.OS,
    });
  }

  getDiagnostics(): TunerDiagSnapshot {
    return { ...this.stats, busy: this.busy };
  }

  async stop(): Promise<void> {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
    if (this.running || this.stats.callbacks > 0) {
      tunerDiagLog('stopped', { ...this.stats, busy: this.busy });
    }
    this.generation += 1;
    this.running = false;
    this.busy = false;
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
    this.ring = new Float32Array(this.windowSamples);
    this.analysisWindow = new Float32Array(this.windowSamples);
    this.snapshot = new Float32Array(this.windowSamples);
    this.ring.fill(0);
    this.writePos = 0;
    this.filled = 0;
  }

  /** 解析を次のタスクに渡し、オーディオコールバックをすぐ返す。 */
  private scheduleAnalysis(onFrequency: NativeTunerFrequencyCallback): void {
    const n = this.ring.length;
    if (this.snapshot.length !== n) {
      this.snapshot = new Float32Array(n);
    }
    this.snapshot.set(this.analysisWindow);
    const samples = this.snapshot;
    const sampleRate = this.sampleRate;
    const generation = this.generation;
    this.busy = true;
    this.stats.scheduled += 1;
    this.stats.busy = true;
    const queuedAt = Date.now();
    setTimeout(() => {
      const startedAt = Date.now();
      try {
        if (!this.running || generation !== this.generation) return;
        const level = measureLevel(samples);
        this.stats.lastRms = level.rms;
        this.stats.lastPeak = level.peak;
        const frequency = combineAlgorithms(samples, sampleRate);
        const elapsed = Date.now() - startedAt;
        const queueDelay = startedAt - queuedAt;
        this.stats.completed += 1;
        this.stats.lastAnalysisMs = elapsed;
        if (elapsed > this.stats.maxAnalysisMs) this.stats.maxAnalysisMs = elapsed;
        this.stats.lastFrequency = frequency > 0 ? frequency : 0;
        if (this.stats.completed === 1 || elapsed >= 50 || queueDelay >= 200) {
          tunerDiagLog('analysis', {
            n: this.stats.completed,
            ms: elapsed,
            queueDelay,
            frequency: Number(frequency.toFixed(2)),
            rms: Number(level.rms.toFixed(4)),
            peak: Number(level.peak.toFixed(3)),
          });
        }
        if (frequency > 0 && this.running && generation === this.generation) {
          onFrequency(frequency);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.stats.lastError = message;
        tunerDiagLog('analysis-error', { message });
      } finally {
        if (generation === this.generation) {
          this.busy = false;
          this.stats.busy = false;
        }
      }
    }, 0);
  }

  private appendSamples(chunk: Float32Array): void {
    const n = this.ring.length;
    for (let i = 0; i < chunk.length; i++) {
      this.ring[this.writePos] = chunk[i];
      this.writePos = (this.writePos + 1) % n;
      if (this.filled < n) this.filled += 1;
    }
  }

  private copyAnalysisWindow(): Float32Array | null {
    const n = this.ring.length;
    if (this.filled < n) return null;
    const out = this.analysisWindow;
    const start = this.writePos;
    const firstLen = n - start;
    out.set(this.ring.subarray(start), 0);
    if (start > 0) {
      out.set(this.ring.subarray(0, start), firstLen);
    }
    return out;
  }
}

const measureLevel = (samples: Float32Array): { rms: number; peak: number } => {
  let sum = 0;
  let peak = 0;
  let count = 0;
  for (let i = 0; i < samples.length; i += 16) {
    const value = samples[i];
    sum += value * value;
    const abs = value < 0 ? -value : value;
    if (abs > peak) peak = abs;
    count += 1;
  }
  return { rms: count > 0 ? Math.sqrt(sum / count) : 0, peak };
};
