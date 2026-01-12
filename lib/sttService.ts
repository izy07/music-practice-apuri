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

  static async recordAudio(
    maxSeconds: number = 10,
    onProgress?: (seconds: number) => void,
    stopSignal?: { shouldStop: boolean }
  ): Promise<{ uri: string; dispose: () => Promise<void> }> {
    if (Platform.OS === 'web') {
      // Web環境での音声録音
      const webRecorder = new WebAudioRecorderImpl();
      
      try {
        await webRecorder.start();
        
        // 指定時間録音（手動停止対応）
        const startTime = Date.now();
        const maxMs = Math.max(1, Math.min(maxSeconds, 30)) * 1000;
        
        while (Date.now() - startTime < maxMs) {
          if (stopSignal?.shouldStop) {
            break;
          }
          await new Promise((r) => setTimeout(r, 100)); // 100msごとにチェック
          
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          if (onProgress) {
            onProgress(elapsed);
          }
        }
        
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
    
    // ネイティブ環境でも手動停止対応
    const startTime = Date.now();
    const maxMs = Math.max(1, Math.min(maxSeconds, 30)) * 1000;
    
    while (Date.now() - startTime < maxMs) {
      if (stopSignal?.shouldStop) {
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (onProgress) {
        onProgress(elapsed);
      }
    }
    
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

    let res: Response;
    try {
      res = await fetch(apiUrl, {
        method: 'POST',
        headers: apiUrl.includes('openai.com') ? { Authorization: `Bearer ${apiKey}` } : { 'x-api-key': apiKey },
        body: form as any,
      });
    } catch (fetchError: any) {
      logger.error('STT API リクエストエラー:', {
        error: fetchError,
        message: fetchError?.message,
        name: fetchError?.name,
        stack: fetchError?.stack,
        apiUrl: apiUrl.substring(0, 50) + '...', // URLの一部のみログに記録
        hasApiKey: !!apiKey,
      });
      throw new Error(`STT API リクエストに失敗しました: ${fetchError?.message || String(fetchError)}`);
    }

    if (!res.ok) {
      let errorText: string;
      try {
        errorText = await res.text();
      } catch (textError) {
        errorText = `レスポンスの読み取りに失敗: ${textError}`;
      }
      
      logger.error('STT API エラーレスポンス:', {
        status: res.status,
        statusText: res.statusText,
        errorText: errorText.substring(0, 500), // 最初の500文字のみ
        apiUrl: apiUrl.substring(0, 50) + '...',
      });
      
      // エラーメッセージを解析
      let errorMessage = `STT failed: ${res.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        } else {
          errorMessage = errorText.substring(0, 200);
        }
      } catch {
        errorMessage = errorText.substring(0, 200);
      }
      
      throw new Error(errorMessage);
    }
    
    let json: any;
    try {
      json = await res.json();
    } catch (parseError: any) {
      logger.error('STT API レスポンスのパースエラー:', {
        error: parseError,
        status: res.status,
      });
      throw new Error(`STT API レスポンスの解析に失敗しました: ${parseError?.message || String(parseError)}`);
    }
    
    const text: string = json.text || json.data?.text || '';
    if (!text) {
      logger.warn('STT API レスポンスにテキストが含まれていません:', json);
    }
    return { text };
  }
}


