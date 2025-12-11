/**
 * オーディオリソース管理サービス
 * AudioContext、マイクストリーム、オシレーターの排他制御を提供
 */

interface MicrophoneOptions {
  audio: {
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    sampleRate?: number;
  };
}

class AudioResourceManager {
  private static instance: AudioResourceManager;
  private audioContext: AudioContext | null = null;
  private audioContextOwner: string | null = null;
  private microphoneStream: MediaStream | null = null;
  private microphoneOwner: string | null = null;
  private oscillators: Map<string, OscillatorNode[]> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AudioResourceManager {
    if (!AudioResourceManager.instance) {
      AudioResourceManager.instance = new AudioResourceManager();
    }
    return AudioResourceManager.instance;
  }

  /**
   * AudioContextを取得（排他制御）
   */
  async acquireAudioContext(owner: string): Promise<AudioContext | null> {
    // 同じオーナーが既にAudioContextを使用している場合は、既存のものを返す
    if (this.audioContextOwner === owner && this.audioContext) {
      return this.audioContext;
    }

    // 異なるオーナーが使用している場合はエラー
    if (this.audioContextOwner && this.audioContextOwner !== owner) {
      throw new Error(`AudioContextは既に${this.audioContextOwner}によって使用されています`);
    }

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.audioContextOwner = owner;
      } catch (error) {
        console.error('AudioContextの作成に失敗:', error);
        return null;
      }
    }

    return this.audioContext;
  }

  /**
   * マイクストリームを取得（排他制御）
   */
  async acquireMicrophone(owner: string, options: MicrophoneOptions): Promise<MediaStream> {
    if (this.microphoneOwner && this.microphoneOwner !== owner) {
      throw new Error(`マイクは既に${this.microphoneOwner}によって使用されています。他の機能（チューナー、録音、クイック記録など）がマイクを使用している可能性があります。`);
    }

    if (!this.microphoneStream) {
      try {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia(options);
        this.microphoneOwner = owner;
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          throw new Error('マイク権限が拒否されました。ブラウザの設定でマイクの使用を許可してください。');
        } else if (error.name === 'NotFoundError') {
          throw new Error('マイクが見つかりません。マイクが接続されていることを確認してください。');
        } else if (error.name === 'NotSupportedError') {
          throw new Error('このブラウザではマイク機能を利用できません。');
        } else {
          throw error;
        }
      }
    }

    return this.microphoneStream;
  }

  /**
   * オシレーターを登録
   */
  registerOscillator(owner: string, oscillator: OscillatorNode): void {
    if (!this.oscillators.has(owner)) {
      this.oscillators.set(owner, []);
    }
    this.oscillators.get(owner)?.push(oscillator);
  }

  /**
   * オシレーターを登録解除
   */
  unregisterOscillator(owner: string, oscillator: OscillatorNode): void {
    const ownerOscillators = this.oscillators.get(owner);
    if (ownerOscillators) {
      const index = ownerOscillators.indexOf(oscillator);
      if (index > -1) {
        ownerOscillators.splice(index, 1);
      }
      if (ownerOscillators.length === 0) {
        this.oscillators.delete(owner);
      }
    }
  }

  /**
   * マイクストリームを解放
   */
  releaseMicrophone(owner: string): void {
    if (this.microphoneOwner === owner) {
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(track => track.stop());
        this.microphoneStream = null;
      }
      this.microphoneOwner = null;
    }
  }

  /**
   * AudioContextを解放
   */
  releaseAudioContext(owner: string): void {
    if (this.audioContextOwner === owner) {
      // オシレーターを停止
      const ownerOscillators = this.oscillators.get(owner);
      if (ownerOscillators) {
        ownerOscillators.forEach(osc => {
          try {
            osc.stop();
          } catch (e) {
            // 既に停止している場合は無視
          }
        });
        this.oscillators.delete(owner);
      }

      if (this.audioContext) {
        this.audioContext.close().catch(() => {
          // エラーは無視
        });
        this.audioContext = null;
      }
      this.audioContextOwner = null;
    }
  }

  /**
   * 指定オーナーのすべてのリソースを解放
   */
  releaseAllResources(owner: string): void {
    this.releaseMicrophone(owner);
    this.releaseAudioContext(owner);
  }

  /**
   * すべてのリソースを強制解放（緊急時用）
   */
  forceReleaseAll(): void {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    this.microphoneOwner = null;

    // すべてのオシレーターを停止
    this.oscillators.forEach(oscillators => {
      oscillators.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // 既に停止している場合は無視
        }
      });
    });
    this.oscillators.clear();

    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        // エラーは無視
      });
      this.audioContext = null;
    }
    this.audioContextOwner = null;
  }
}

export default AudioResourceManager.getInstance();


