import { Platform } from 'react-native';
import logger from './logger';
import { ErrorHandler } from './errorHandler';
import audioResourceManager from './audioResourceManager';

// Web環境ではexpo-audioをインポートしない
let AudioRecorder: any = null;
let useAudioRecorder: any = null;

if (Platform.OS !== 'web') {
  try {
    const audioModule = require('expo-audio');
    AudioRecorder = audioModule.AudioRecorder;
    useAudioRecorder = audioModule.useAudioRecorder;
  } catch (error) {
    logger.warn('expo-audio not available:', error);
  }
}

type SttResult = { text: string };

// Web Audio API用のインターフェース
interface WebAudioRecorder {
  start(): Promise<void>;
  stop(): Promise<Blob>;
  dispose(): void;
}

// Web Audio APIを使った音声録音クラス
class WebAudioRecorderImpl implements WebAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private readonly OWNER_NAME = 'SttService';

  async start(): Promise<void> {
    try {
      // リソース管理サービスからマイクアクセスを取得（排他制御）
      // STT用に16000Hzに最適化
      this.stream = await audioResourceManager.acquireMicrophone(this.OWNER_NAME, {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // STT用に16000Hzに変更
        } 
      });

      // MediaRecorderの設定
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000,
      };

      // サポートされているMIMEタイプを確認
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // フォールバック
        this.mediaRecorder = new MediaRecorder(this.stream);
      } else {
        this.mediaRecorder = new MediaRecorder(this.stream, options);
      }

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(200); // 200ms間隔でデータを収集（軽量化）
    } catch (error) {
      ErrorHandler.handle(error, 'Web音声録音開始', true);
      throw new Error('マイクアクセスが拒否されました。ブラウザの設定でマイクの許可を確認してください。');
    }
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('録音が開始されていません'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  dispose(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    // リソース管理サービスからマイクを解放
    audioResourceManager.releaseMicrophone(this.OWNER_NAME);
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

export class SttService {
  static async requestMicPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      try {
        // Web環境でのマイク権限確認
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // テスト後すぐに停止
        return true;
      } catch (error) {
        ErrorHandler.handle(error, 'Webマイク権限', false);
        return false;
      }
    }
    // expo-audioでは権限の要求は自動的に行われる
    return true;
  }

  static async recordAudio(maxSeconds: number = 10): Promise<{ uri: string; dispose: () => Promise<void> }> {
    if (Platform.OS === 'web') {
      // Web環境での音声録音
      const webRecorder = new WebAudioRecorderImpl();
      
      try {
        await webRecorder.start();
        
        // 指定時間録音
        await new Promise((r) => setTimeout(r, Math.max(1, Math.min(maxSeconds, 30)) * 1000));
        
        const audioBlob = await webRecorder.stop();
        
        // BlobをURLに変換
        const uri = URL.createObjectURL(audioBlob);
        
        const dispose = async () => {
          webRecorder.dispose();
          URL.revokeObjectURL(uri);
        };
        
        return { uri, dispose };
      } catch (error) {
        webRecorder.dispose();
        throw error;
      }
    }
    
    if (!AudioRecorder) throw new Error('Native recording not available');
    
    const recorder = new AudioRecorder();
    await recorder.prepareToRecordAsync();
    await recorder.startAsync();
    
    await new Promise((r) => setTimeout(r, Math.max(1, Math.min(maxSeconds, 30)) * 1000));
    
    const uri = await recorder.stopAsync();
    const dispose = async () => {
      try { await recorder.stopAsync(); } catch {}
    };
    return { uri, dispose };
  }

  static async transcribe(uri: string): Promise<SttResult> {
    const apiUrl = process.env.EXPO_PUBLIC_WHISPER_API_URL || 'https://api.openai.com/v1/audio/transcriptions';
    const apiKey = process.env.EXPO_PUBLIC_WHISPER_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) throw new Error('STT API key not configured');

    let blob: Blob;
    
    if (Platform.OS === 'web') {
      // Web環境ではBlob URLから直接Blobを取得
      const response = await fetch(uri);
      blob = await response.blob();
    } else {
      // ネイティブ環境では従来通り
      const file: any = await fetch(uri);
      blob = await file.blob();
    }

    const form = new FormData();
    
    // Web環境ではwebm形式、ネイティブではm4a形式
    const fileName = Platform.OS === 'web' ? 'recording.webm' : 'recording.m4a';
    form.append('file', blob as any, fileName);
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');
    form.append('language', 'ja');

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: apiUrl.includes('openai.com') ? { Authorization: `Bearer ${apiKey}` } : { 'x-api-key': apiKey },
      body: form as any,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`STT failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    const text: string = json.text || json.data?.text || '';
    return { text };
  }
}


