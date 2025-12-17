import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { Mic, MicOff, Play, Pause, Square, Star, Trash2, Save } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { uploadRecordingBlob, saveRecording } from '@/lib/database';
import { useRouter } from 'expo-router';
import { ErrorHandler } from '@/lib/errorHandler';
import logger from '@/lib/logger';
import audioResourceManager from '@/lib/audioResourceManager';

const { width } = Dimensions.get('window');

interface AudioRecorderProps {
  visible: boolean;
  onSave: (audioData: {
    title: string;
    memo: string;
    isFavorite: boolean;
    duration: number;
    audioUrl: string;
    recordingId?: string; // 保存された録音ID（オプション）
    recordingType?: 'performance' | 'lesson'; // 録音種類
  }) => void;
  onClose: () => void;
  onRecordingSaved?: () => void; // 録音保存後のコールバック
  onBack?: () => void; // 戻るボタンのカスタム動作
  selectedDate?: Date | null; // 保存日（未指定なら現在時刻）
}

export default function AudioRecorder({ visible, onSave, onClose, onRecordingSaved, onBack, selectedDate }: AudioRecorderProps) {
  const { currentTheme } = useInstrumentTheme();
  const router = useRouter();
  const OWNER_NAME = 'AudioRecorder';
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [songs, setSongs] = useState<Array<{id: string, title: string, artist: string}>>([]);
  const [showSongSelector, setShowSongSelector] = useState(false);
  const [recordingType, setRecordingType] = useState<'performance' | 'lesson'>('performance'); // 録音種類
  
  // Web Audio API用の参照
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false); // 最新のisRecording状態を保持

  // 録音時間の制限（1時間 = 3600秒）
  const MAX_RECORDING_TIME = 3600;

  // isRecordingの最新値をrefに保持
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // コンポーネントのクリーンアップ（アンマウント時のみ実行）
  useEffect(() => {
    return () => {
      logger.debug('AudioRecorderコンポーネントがアンマウントされます');
      
      // 録音を停止（refを使用して最新の状態を確認）
      if (isRecordingRef.current && mediaRecorderRef.current) {
        logger.debug('コンポーネントアンマウント時に録音を停止します');
        // stopRecordingを直接呼ばず、手動でクリーンアップ
        try {
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        } catch (error) {
          logger.warn('MediaRecorder stop error during cleanup:', error);
        }
        setIsRecording(false);
        isRecordingRef.current = false;
      }
      
      // 録音タイマーのクリア
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // オーディオ要素のクリア
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }
      
      // MediaRecorderの完全なクリーンアップ
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        } catch (error) {
          logger.warn('MediaRecorder stop error during cleanup:', error);
        }
        mediaRecorderRef.current = null;
      }
      
      // オーディオチャンクのクリア
      if (audioChunksRef.current.length > 0) {
        audioChunksRef.current = [];
      }
      
      // オーディオBlobのクリア
      if (audioBlobRef.current) {
        audioBlobRef.current = null;
      }
      
      // マイクストリームの解放
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        microphoneStreamRef.current = null;
      }
      
      // リソース管理サービスからリソースを解放
      audioResourceManager.releaseAllResources(OWNER_NAME);
    };
  }, []); // 依存配列を空にして、アンマウント時のみ実行

  // 楽曲リストを読み込み
  useEffect(() => {
    if (visible) {
      loadSongs();
    }
  }, [visible]);

  // 楽曲リストを読み込む
  const loadSongs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('my_songs')
          .select('id, title, artist')
          .eq('user_id', user.id)
          .order('title', { ascending: true });

        if (error) {
          // Error loading songs
        } else {
          setSongs(data || []);
        }
      }
    } catch (error) {
      // Error loading songs
    }
  };

  // 録音開始
  const startRecording = async () => {
    try {
      logger.debug('録音開始ボタンが押されました');
      
      if (Platform.OS !== 'web') {
        Alert.alert('録音機能', '録音機能はWeb環境でのみ利用できます');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        logger.error('navigator.mediaDevicesが利用できません');
        Alert.alert('エラー', 'このブラウザでは録音機能を利用できません');
        return;
      }

      logger.debug('navigator.mediaDevicesが利用可能です');

      // マイク権限の事前確認
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        logger.debug('マイク権限状態:', permission.state);
        if (permission.state === 'denied') {
          Alert.alert('マイク権限が必要', 'ブラウザの設定でマイクの使用を許可してください');
          return;
        }
      } catch (permissionError) {
        logger.debug('Permission API not supported, proceeding with getUserMedia');
      }

      // リソース管理サービスからマイクアクセスを取得（排他制御）
      let stream: MediaStream;
      try {
        logger.debug('マイクアクセスを取得中...');
        stream = await audioResourceManager.acquireMicrophone(OWNER_NAME, {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
          }
        });
        microphoneStreamRef.current = stream;
        logger.debug('マイクアクセスを取得しました');
      } catch (error: any) {
        logger.error('マイクアクセスの取得エラー:', error);
        const errorMessage = error?.message || 'マイクアクセスの取得に失敗しました';
        const errorName = error?.name || '';
        const errorCode = error?.code || '';
        
        if (errorMessage.includes('既に') || errorName === 'NotAllowedError') {
          Alert.alert('マイク使用中', errorMessage + '\n\n他の機能（チューナー、クイック記録など）がマイクを使用している可能性があります。');
        } else if (errorName === 'NotAllowedError' || errorCode === 'NotAllowedError') {
          Alert.alert('マイク権限が拒否されました', 'ブラウザの設定でマイクの使用を許可してください。\n\n設定方法:\n1. ブラウザのアドレスバーのアイコンをクリック\n2. マイクの許可を選択\n3. ページを再読み込みしてください。');
        } else if (errorName === 'NotFoundError' || errorCode === 'NotFoundError') {
          Alert.alert('マイクが見つかりません', 'マイクが接続されていることを確認してください。');
        } else {
          Alert.alert('マイクエラー', errorMessage + '\n\nエラーコード: ' + errorCode);
        }
        return;
      }
      
      // サポートされているMIMEタイプを確認
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }

      // MediaRecorderの初期化
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 録音開始時刻を記録
      const startTime = Date.now();

      // MediaRecorderのイベントリスナーを適切に管理
      const handleDataAvailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          logger.debug('録音データを受信しました', {
            chunkSize: event.data.size,
            totalChunks: audioChunksRef.current.length,
            totalSize: audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
          });
        } else {
          logger.debug('空の録音データを受信しました');
        }
      };

      const handleStop = () => {
        logger.debug('MediaRecorder stopイベントが発火しました', {
          chunksCount: audioChunksRef.current.length,
          totalSize: audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          recorderState: mediaRecorder.state
        });
        
        // 録音状態を先に更新
        setIsRecording(false);
        isRecordingRef.current = false;
        
        // チャンクのコピーを作成（クリーンアップ前に保存）
        const chunksCopy = [...audioChunksRef.current];
        
        try {
          // 録音データが空の場合は警告のみ（即座に停止した場合など）
          if (chunksCopy.length === 0) {
            logger.warn('録音データが空です。録音時間が短すぎる可能性があります。');
            const actualDuration = Math.round((Date.now() - startTime) / 1000);
            if (actualDuration < 1) {
              logger.warn('録音時間が1秒未満です');
            }
            // クリーンアップのみ実行
            cleanupAfterRecording();
            return;
          }
          
          const audioBlob = new Blob(chunksCopy, { type: mimeType || 'audio/webm' });
          audioBlobRef.current = audioBlob;
          const newAudioUrl = URL.createObjectURL(audioBlob);
          
          logger.debug('録音データを作成しました', {
            blobSize: audioBlob.size,
            blobType: audioBlob.type,
            audioUrl: newAudioUrl.substring(0, 50) + '...'
          });
          
          setAudioUrl(newAudioUrl);
          
          // 実際の録音時間を計算（開始時刻からの経過時間）
          const dateBasedDuration = Math.round((Date.now() - startTime) / 1000);
          setRecordingDuration(dateBasedDuration);
          
          logger.debug('録音が完了しました', {
            duration: dateBasedDuration,
            audioUrl: newAudioUrl.substring(0, 50) + '...'
          });
          
          // Audio要素からより正確なdurationを取得（非同期で更新、エラーは無視）
          // 即座にDate.now()ベースの値を設定し、後でAudio要素のdurationで更新する可能性がある
          (async function updateDurationFromAudio() {
            try {
              const audio = new Audio(newAudioUrl);
              
              // メタデータの読み込み完了を待つ
              await new Promise<void>((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                  reject(new Error('タイムアウト'));
                }, 3000);
                
                audio.addEventListener('loadedmetadata', () => {
                  clearTimeout(timeoutId);
                  resolve();
                }, { once: true });
                
                audio.addEventListener('error', () => {
                  clearTimeout(timeoutId);
                  reject(new Error('Audio読み込みエラー'));
                }, { once: true });
                
                // メタデータの読み込みを開始
                audio.load();
              });
              
              const duration = audio.duration;
              if (isFinite(duration) && duration > 0) {
                // Audio要素のdurationは秒単位（小数）なので、四捨五入して整数秒に変換
                const roundedDuration = Math.round(duration);
                logger.debug('Audio要素から取得した録音時間', {
                  rawDuration: duration,
                  roundedDuration: roundedDuration,
                  dateBasedDuration: dateBasedDuration
                });
                
                // 実際のdurationとDate.now()ベースの値に大きな差がある場合のみ更新
                // （小さな差の場合はDate.now()ベースの値を維持）
                if (Math.abs(roundedDuration - dateBasedDuration) > 1) {
                  setRecordingDuration(roundedDuration);
                  logger.debug('録音時間をAudio要素のdurationに更新', {
                    old: dateBasedDuration,
                    new: roundedDuration
                  });
                }
              } else {
                logger.debug('Audio要素のdurationが無効なため、Date.now()ベースの値を維持', {
                  duration,
                  dateBasedDuration
                });
              }
              
              // クリーンアップ（URLは後で使用するため、ここでは削除しない）
              audio.src = '';
            } catch (error) {
              logger.debug('Audio要素からの録音時間取得に失敗、Date.now()ベースの値を維持', {
                error,
                dateBasedDuration
              });
            }
          })();
        } catch (error) {
          logger.error('録音データの処理エラー:', error);
          Alert.alert('録音エラー', '録音データの処理に失敗しました');
        } finally {
          cleanupAfterRecording();
        }
        
        // クリーンアップ関数
        function cleanupAfterRecording() {
          // ストリームを停止
          try {
            stream.getTracks().forEach(track => {
              track.stop();
              track.enabled = false;
            });
          } catch (error) {
            logger.warn('ストリーム停止エラー:', error);
          }
          
          // MediaRecorderのイベントリスナーを削除
          try {
            mediaRecorder.removeEventListener('dataavailable', handleDataAvailable);
            mediaRecorder.removeEventListener('stop', handleStop);
            mediaRecorder.removeEventListener('error', handleError);
          } catch (error) {
            logger.warn('イベントリスナー削除エラー:', error);
          }
          
          // MediaRecorderのクリーンアップ
          if (mediaRecorderRef.current === mediaRecorder) {
            mediaRecorderRef.current = null;
          }
          
          // チャンクのクリア（Blob作成後なので安全）
          audioChunksRef.current = [];
        }
      };

      const handleError = (event: Event) => {
        const errorEvent = event as ErrorEvent;
        logger.error('MediaRecorderエラー:', {
          error: errorEvent.error,
          message: errorEvent.message,
          recorderState: mediaRecorder.state,
          streamActive: stream.active
        });
        ErrorHandler.handle(event, 'MediaRecorder', true);
        Alert.alert('録音エラー', `録音中にエラーが発生しました: ${errorEvent.message || '不明なエラー'}`);
        setIsRecording(false);
        isRecordingRef.current = false;
        
        // エラー時のクリーンアップ
        try {
          mediaRecorder.removeEventListener('dataavailable', handleDataAvailable);
          mediaRecorder.removeEventListener('stop', handleStop);
          mediaRecorder.removeEventListener('error', handleError);
        } catch (e) {
          logger.warn('イベントリスナーの削除エラー:', e);
        }
        
        // ストリームのクリーンアップ
        if (microphoneStreamRef.current) {
          microphoneStreamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
          microphoneStreamRef.current = null;
        }
        audioResourceManager.releaseMicrophone(OWNER_NAME);
      };

      // イベントリスナーを追加
      mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
      mediaRecorder.addEventListener('stop', handleStop);
      mediaRecorder.addEventListener('error', handleError);

      // 録音開始
      logger.debug('MediaRecorderを開始します...', {
        recorderState: mediaRecorder.state,
        streamActive: stream.active,
        streamTracks: stream.getTracks().length
      });
      try {
        mediaRecorder.start(200); // 200ms間隔でデータを取得（軽量化）
        
        // 状態を更新（refも更新）
        setIsRecording(true);
        isRecordingRef.current = true;
        setRecordingTime(0);
        setRecordingDuration(0);
        audioChunksRef.current = [];
        
        logger.debug('録音を開始しました', {
          recorderState: mediaRecorder.state,
          isRecording: true
        });

        // より正確な録音時間のカウント（Date.now()ベース）: 更新頻度を緩和
        recordingIntervalRef.current = window.setInterval(() => {
          const elapsedTime = Math.round((Date.now() - startTime) / 1000);
          setRecordingTime(elapsedTime);
          
          // 最大時間の1秒前に達したら自動的に録音を停止開始（最大時間を超えないようにする）
          // Math.roundによる丸め誤差とMediaRecorder停止処理の遅延を考慮して1秒前に停止開始
          if (elapsedTime >= MAX_RECORDING_TIME - 1) {
            logger.debug('録音時間が最大時間に近づきました。自動停止を開始します。', {
              elapsedTime,
              maxTime: MAX_RECORDING_TIME,
              stopAt: MAX_RECORDING_TIME - 1
            });
            // タイマーを即座にクリア（重複停止を防止）
            if (recordingIntervalRef.current) {
              clearInterval(recordingIntervalRef.current);
              recordingIntervalRef.current = null;
            }
            // 停止処理を開始（MediaRecorderの停止処理には時間がかかるため、早めに開始）
            stopRecording('auto');
          }
        }, 250); // UI更新を250ms間隔にしてCPU負荷を軽減
      } catch (startError: any) {
        logger.error('MediaRecorder.start()エラー:', startError);
        Alert.alert('録音開始エラー', '録音を開始できませんでした。\n\nエラー: ' + (startError?.message || '不明なエラー'));
        // エラー時のクリーンアップ
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        audioResourceManager.releaseMicrophone(OWNER_NAME);
        setIsRecording(false);
        return;
      }

    } catch (error: any) {
      logger.error('録音開始処理のエラー:', error);
      ErrorHandler.handle(error, 'Recording start', true);
      
      // エラー時のクリーンアップ
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        audioResourceManager.releaseMicrophone(OWNER_NAME);
      }
      setIsRecording(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          Alert.alert('マイク権限が必要', 'ブラウザの設定でマイクの使用を許可してください。\n\n設定方法:\n1. ブラウザのアドレスバーのアイコンをクリック\n2. マイクの許可を選択\n3. ページを再読み込みしてください。');
        } else if (error.name === 'NotFoundError') {
          Alert.alert('マイクが見つかりません', 'マイクが接続されているか確認してください。');
        } else if (error.name === 'NotSupportedError') {
          Alert.alert('録音機能がサポートされていません', 'このブラウザでは録音機能を利用できません。');
        } else {
          Alert.alert('エラー', `録音を開始できませんでした。\n\nエラー: ${error.message || '不明なエラー'}`);
        }
      } else {
        Alert.alert('エラー', `録音を開始できませんでした。\n\nエラー: ${error?.message || '不明なエラー'}`);
      }
    }
  };

  // 録音停止
  const stopRecording = (cause: 'auto' | 'manual' = 'manual') => {
    logger.debug('🛑 stopRecordingが呼ばれました:', { 
      cause,
      isRecordingRef: isRecordingRef.current,
      hasRecorder: !!mediaRecorderRef.current,
      recorderState: mediaRecorderRef.current?.state
    });
    
    // refを使用して最新の状態を確認（非同期の状態更新に対応）
    if (!isRecordingRef.current || !mediaRecorderRef.current) {
      logger.debug('録音は既に停止しています', {
        isRecordingRef: isRecordingRef.current,
        hasRecorder: !!mediaRecorderRef.current
      });
      return;
    }

    logger.debug('🛑 録音を停止します:', { 
      cause,
      recorderState: mediaRecorderRef.current?.state,
      isRecording: isRecordingRef.current,
      chunksCount: audioChunksRef.current.length
    });
    
    // タイマーを最優先でクリア（重複停止を防止）
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
      logger.debug('録音タイマーをクリアしました');
    }

    // MediaRecorderの状態を厳密にチェックして停止
    try {
      const recorder = mediaRecorderRef.current;
      const currentState = recorder.state;
      
      logger.debug('MediaRecorderの状態を確認:', { 
        state: currentState,
        chunksCount: audioChunksRef.current.length,
        totalSize: audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
      });
      
      // 'recording'状態の場合のみ停止処理を実行
      // 'inactive'や'paused'の場合は既に停止しているため、何もしない
      if (currentState === 'recording') {
        logger.debug('MediaRecorderを停止します:', { state: currentState });
        recorder.stop();
        logger.debug('MediaRecorder.stop()を呼びました。handleStopイベントを待機します...');
      } else {
        logger.debug('MediaRecorderは既に停止しています:', { state: currentState });
        // 既に停止している場合は、状態を更新してクリーンアップ
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    } catch (error) {
      logger.error('録音停止エラー:', error);
      ErrorHandler.handle(error, '録音停止', false);
      setIsRecording(false);
      isRecordingRef.current = false;
    }

    // マイクストリームの解放（リソース管理サービス経由）
    if (microphoneStreamRef.current) {
      try {
        microphoneStreamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        microphoneStreamRef.current = null;
      } catch (error) {
        logger.warn('マイクストリームの解放エラー:', error);
      }
    }
    
    // リソース管理サービスからマイクを解放
    audioResourceManager.releaseMicrophone(OWNER_NAME);

    // 停止時の通知（自動停止の場合のみ）
    if (cause === 'auto') {
      const maxMinutes = Math.floor(MAX_RECORDING_TIME / 60);
      Alert.alert(
        '録音停止',
        `最大${maxMinutes}分に達したため自動停止しました`
      );
    }
  };

  // 再生開始
  const startPlayback = async () => {
    if (!audioUrl) {
      logger.warn('再生エラー: audioUrlが設定されていません');
      Alert.alert('再生エラー', '再生する録音データがありません');
      return;
    }

    if (Platform.OS !== 'web') {
      Alert.alert('再生機能', '再生機能はWeb環境でのみ利用できます');
      return;
    }

    try {
      // 既存のAudio要素がある場合は削除
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }

      // ファイルパスの検証
      if (!audioUrl || audioUrl.trim() === '') {
        logger.error('再生エラー: audioUrlが空です');
        Alert.alert('再生エラー', '再生する録音データがありません');
        return;
      }

      // audioUrlがSupabase Storageのパスの場合は、publicUrlを取得
      let playbackUrl = audioUrl;
      if (audioUrl && !audioUrl.startsWith('http') && !audioUrl.startsWith('blob:') && !audioUrl.startsWith('data:')) {
        // Supabase Storageのパスの場合
        logger.debug('Supabase Storageから録音URLを取得します', { filePath: audioUrl });
        const { data: { publicUrl } } = supabase.storage
          .from('recordings')
          .getPublicUrl(audioUrl);
        playbackUrl = publicUrl;
        logger.debug('録音URLを取得しました', { publicUrl });
      }

      // publicUrlの検証
      if (!playbackUrl || playbackUrl.trim() === '') {
        logger.error('再生エラー: playbackUrlが空です', { audioUrl, playbackUrl });
        Alert.alert('再生エラー', '録音ファイルのURLを取得できませんでした');
        return;
      }

      logger.debug('Audio要素を作成します', { playbackUrl: playbackUrl.substring(0, 50) + '...' });
      const audioElement = new Audio(playbackUrl);
      // src属性を明示的に設定（念のため）
      audioElement.src = playbackUrl;
      audioElementRef.current = audioElement;

      // エラーハンドリング
      audioElement.onerror = (error) => {
        logger.error('Audio再生エラー:', error);
        Alert.alert('再生エラー', '音声の再生に失敗しました');
        setIsPlaying(false);
        audioElementRef.current = null;
      };

      // 再生終了時の処理
      audioElement.onended = () => {
        logger.debug('再生が終了しました');
        setIsPlaying(false);
      };

      // 再生開始
      logger.debug('音声再生を開始します');
      await audioElement.play();
      setIsPlaying(true);
      logger.debug('音声再生を開始しました');
    } catch (error: any) {
      logger.error('再生開始エラー:', error);
      const errorMessage = error?.message || '不明なエラー';
      Alert.alert('再生エラー', `音声の再生に失敗しました: ${errorMessage}`);
      setIsPlaying(false);
      if (audioElementRef.current) {
        audioElementRef.current = null;
      }
    }
  };

  // 再生停止
  const stopPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // 録音保存（データベースに保存）
  const handleSave = async () => {
    if (isSavingRef.current) {
      logger.warn('既に保存処理中です');
      return;
    }
    
    if (!audioUrl || !audioBlobRef.current) {
      Alert.alert('エラー', '録音データがありません');
      return;
    }

    if (!title.trim()) {
      setTitle('録音'); // デフォルトタイトルを設定
    }

    logger.debug('録音保存処理開始');
    setIsSaving(true);
    isSavingRef.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        setIsSaving(false);
        isSavingRef.current = false;
        return;
      }

      // 録音時間を確実に設定
      const finalDuration = recordingDuration > 0 ? recordingDuration : recordingTime;

      // 1. 音声ファイルをSupabase Storageにアップロード
      let filePath = null;
      try {
        const { path, error: uploadError } = await uploadRecordingBlob(
          user.id,
          audioBlobRef.current,
          'wav'
        );

        if (uploadError) {
          // ファイルアップロードに失敗した場合でも録音データは保存する
          filePath = null;
        } else {
          filePath = path;
        }
      } catch (uploadError) {
        // ファイルアップロードエラーでも続行
        filePath = null;
      }

      // 2. 録音レコードをデータベースに保存（ファイルパスなしでも保存）
      const recordingTitle = title.trim() || '録音'; // タイトルが空の場合はデフォルトを使用
      // 現在選択されている楽器IDを取得
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('selected_instrument_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const instrumentId = profile?.selected_instrument_id || null;
      
      const recordedAt = selectedDate ? new Date(selectedDate) : new Date();
      logger.debug('録音保存開始:', {
        title: recordingTitle,
        instrumentId,
        duration: finalDuration,
        hasFilePath: !!filePath,
        recordedAt: recordedAt.toISOString()
      });
      
      const { data: savedRecording, error: saveError } = await saveRecording({
        user_id: user.id,
        instrument_id: instrumentId, // 現在の楽器IDを追加
        song_id: selectedSongId, // 選択された楽曲IDを追加
        title: recordingTitle,
        memo: memo.trim(),
        file_path: filePath || '', // ファイルパスがnullの場合は空文字列を使用
        duration_seconds: finalDuration,
        is_favorite: isFavorite,
        recorded_at: recordedAt.toISOString(),
        recording_type: recordingType, // 録音種類を追加
      });

      if (saveError) {
        ErrorHandler.handle(saveError, '録音保存', true);
        throw saveError;
      }

      logger.debug('録音保存成功:', savedRecording);

      // 3. カレンダーデータ更新のためのカスタムイベントを発火
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('practiceRecordUpdated', {
          detail: { 
            action: 'recording_saved', 
            date: recordedAt,
            recordingId: savedRecording?.id 
          }
        }));
      }

      // 4. 録音データをonSaveコールバックに渡す（モーダル内に表示するため）
      const audioData = {
        title: recordingTitle,
        memo: memo.trim(),
        isFavorite: isFavorite,
        duration: finalDuration,
        audioUrl: filePath || audioUrl || '', // 保存されたファイルパスまたは元のURL
        recordingId: savedRecording?.id, // 保存された録音ID
        recordingType: recordingType // 録音種類を追加
      };
      
      // onSaveコールバックを呼び出して録音データを渡す
      onSave(audioData);

      // 5. 録音動画ライブラリに保存（ローカル状態の更新）
      // 録音データをローカル状態に追加（必要に応じて）
      if (onRecordingSaved) {
        try {
          await onRecordingSaved();
        } catch (error) {
          console.error('onRecordingSavedコールバックエラー:', error);
        }
      }

      // 成功メッセージ（ファイルアップロードの状況に応じて）
      const successMessage = filePath 
        ? '録音データが録音ライブラリとSupabaseに保存されました' 
        : '録音記録が録音ライブラリとSupabaseに保存されました（音声ファイルのアップロードは失敗）';
      
      // 録音モーダルを閉じる（親モーダルは開いたまま）
      onClose();

    } catch (error) {
      console.error('録音保存エラー:', error);
      ErrorHandler.handle(error, 'recording_save');
    } finally {
      // 保存状態を必ずリセット
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  // 録音削除
  const handleDelete = () => {
    Alert.alert(
      '録音削除',
      'この録音を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            if (audioUrl) {
              URL.revokeObjectURL(audioUrl);
            }
            setAudioUrl(null);
            setTitle('');
            setMemo('');
            setIsFavorite(false);
            setRecordingTime(0);
            setRecordingDuration(0);
            audioBlobRef.current = null;
          }
        }
      ]
    );
  };

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (onBack) {
              onBack(); // カスタムの戻る動作
            } else {
              onClose(); // デフォルトの動作
            }
          }}
        >
          <Text style={[styles.backButtonText, { color: currentTheme.text }]}>← 戻る</Text>
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: currentTheme.text }]}>
          演奏録音・再生
        </Text>
        
        <View style={styles.closeButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 録音コントロール（録音前のみ表示、録音後は非表示） */}
        {!audioUrl && (
          <View style={styles.recordingSection}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              録音コントロール
            </Text>
            
            <View style={styles.recordingControls}>
              {!isRecording ? (
                <TouchableOpacity
                  style={[styles.recordButton, { backgroundColor: currentTheme.primary }]}
                  onPress={() => {
                    logger.debug('録音ボタンがタップされました');
                    startRecording();
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Mic size={24} color="#FFFFFF" />
                  <Text style={styles.recordButtonText}>録音開始</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.stopButton, { backgroundColor: '#FF4444' }]}
                  onPress={() => stopRecording('manual')}
                >
                  <MicOff size={24} color="#FFFFFF" />
                  <Text style={styles.stopButtonText}>録音停止</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 録音時間表示 */}
            <View style={styles.timeDisplay}>
              <Text style={[styles.timeText, { color: currentTheme.text }]}>
                {isRecording ? '録音中: ' : '録音時間: '}
                {isRecording ? formatTime(recordingTime) : formatTime(recordingDuration)}
              </Text>
              {isRecording && (
                <Text style={[styles.maxTimeText, { color: currentTheme.textSecondary }]}>
                  最大: {formatTime(MAX_RECORDING_TIME)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* 録音データ表示 */}
        {audioUrl && (
          <View style={styles.audioSection}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              録音データ
            </Text>
            
            <View style={styles.audioInfo}>
              <Text style={[styles.audioDuration, { color: currentTheme.textSecondary }]}>
                録音時間: {formatTime(recordingDuration)}
              </Text>
            </View>

            {/* 再生コントロール */}
            <View style={styles.playbackControls}>
              {!isPlaying ? (
                <TouchableOpacity
                  style={[styles.playButton, { backgroundColor: currentTheme.primary }]}
                  onPress={startPlayback}
                >
                  <Play size={20} color="#FFFFFF" />
                  <Text style={styles.playButtonText}>再生</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.pauseButton, { backgroundColor: '#FF9800' }]}
                  onPress={stopPlayback}
                >
                  <Pause size={20} color="#FFFFFF" />
                  <Text style={styles.pauseButtonText}>停止</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* メタデータ入力 */}
        {audioUrl && (
          <View style={styles.metadataSection}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              録音情報
            </Text>
            
            {/* 録音種類選択 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.text }]}>録音種類</Text>
              <View style={styles.recordingTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.recordingTypeButton,
                    {
                      backgroundColor: recordingType === 'performance' 
                        ? currentTheme.primary 
                        : currentTheme.secondary,
                    }
                  ]}
                  onPress={() => setRecordingType('performance')}
                >
                  <Text style={[
                    styles.recordingTypeButtonText,
                    { color: recordingType === 'performance' ? currentTheme.surface : currentTheme.text }
                  ]}>
                    演奏録音
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.recordingTypeButton,
                    {
                      backgroundColor: recordingType === 'lesson' 
                        ? currentTheme.primary 
                        : currentTheme.secondary,
                    }
                  ]}
                  onPress={() => setRecordingType('lesson')}
                >
                  <Text style={[
                    styles.recordingTypeButtonText,
                    { color: recordingType === 'lesson' ? currentTheme.surface : currentTheme.text }
                  ]}>
                    レッスン録音
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* タイトル入力 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.text }]}>タイトル（省略可）</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: currentTheme.secondary,
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text
                }]}
                value={title}
                onChangeText={setTitle}
                placeholder="録音のタイトルを入力（省略可）"
                placeholderTextColor={currentTheme.textSecondary}
              />
            </View>

            {/* メモ入力 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.text }]}>メモ</Text>
              <TextInput
                style={[styles.textArea, { 
                  borderColor: currentTheme.secondary,
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text
                }]}
                value={memo}
                onChangeText={setMemo}
                placeholder="録音についてのメモを入力"
                placeholderTextColor={currentTheme.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* お気に入り設定 */}
            <View style={styles.favoriteSection}>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => setIsFavorite(!isFavorite)}
              >
                <Star 
                  size={24} 
                  color={isFavorite ? '#FFD700' : '#CCCCCC'} 
                  fill={isFavorite ? '#FFD700' : 'none'}
                />
                <Text style={[styles.favoriteText, { color: currentTheme.text }]}>
                  {isFavorite ? 'お気に入り' : 'お気に入りに追加'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* アクションボタン */}
        {audioUrl && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#FF4444' }]}
              onPress={handleDelete}
              disabled={isSaving}
            >
              <Trash2 size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>削除</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.saveButton, 
                { backgroundColor: currentTheme.primary },
                isSaving && styles.disabledButton
              ]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={isSaving ? 1 : 0.7}
            >
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {isSaving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  recordingSection: {
    marginBottom: 24,
  },
  recordingControls: {
    alignItems: 'center',
    marginBottom: 16,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    minWidth: 180,
    justifyContent: 'center',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    minWidth: 180,
    justifyContent: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timeDisplay: {
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  maxTimeText: {
    fontSize: 14,
  },
  audioSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 4,
  },
  audioInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  audioDuration: {
    fontSize: 16,
    fontWeight: '500',
  },
  playbackControls: {
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
    minWidth: 120,
    justifyContent: 'center',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
    minWidth: 120,
    justifyContent: 'center',
  },
  pauseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  metadataSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
  },
  favoriteSection: {
    marginTop: 8,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  recordingTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  recordingTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
