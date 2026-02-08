import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, Trash2, Star, StarOff, Calendar, Clock, Music, ArrowLeft, Video, Search, X } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { listAllRecordings, deleteRecording } from '@/lib/database';
import { useSubscription } from '@/hooks/useSubscription';
import { canAccessFeature } from '@/lib/subscriptionService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { safeGoBack } from '@/lib/navigationUtils';
import { createShadowStyle } from '@/lib/shadowStyles';
import { getEffectiveInstrumentId } from '@/lib/instrumentUtils';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';

const { width } = Dimensions.get('window');

interface Recording {
  id: string;
  title: string | null;
  file_path: string;
  duration_seconds: number;
  is_favorite: boolean;
  recorded_at: string;
  created_at: string;
  recording_type?: 'performance' | 'lesson'; // 録音種類
  auto_delete_at?: string | null; // 自動削除予定日
}

type TimeFilter = 'all' | '1week' | '1month' | '3months' | '6months' | '1year';

export default function RecordingsLibraryScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const { entitlement, loading: entitlementLoading, error: subscriptionError, errorMessage: subscriptionErrorMessage, refresh: refreshSubscription } = useSubscription();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0); // 現在の再生位置（秒）
  const [duration, setDuration] = useState<number>(0); // 録音の総時間（秒）
  const [isSeeking, setIsSeeking] = useState<boolean>(false); // シーク中かどうか
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recordingTypeFilter, setRecordingTypeFilter] = useState<'all' | 'performance' | 'lesson'>('all'); // 録音種類フィルター
  const scrollViewRef = useRef<ScrollView>(null);
  const progressSliderRefs = useRef<{ [key: string]: HTMLInputElement | null }>({}); // プログレスバーのinput要素の参照

  // 録音種類フィルターはクライアント側でフィルタリングするため、再読み込み不要
  // 初回読み込みと楽器変更時のみデータを読み込む

  // Audioオブジェクトのクリーンアップ（メモリリーク防止）
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = ''; // リソースを解放
        setAudioElement(null);
        logger.debug('Audioオブジェクトをクリーンアップ');
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    };
  }, [audioElement]);

  // 再生位置の更新（timeupdateイベント）
  useEffect(() => {
    if (!audioElement || !playingRecording) {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    // 初期のdurationを設定（InfinityやNaNを除外）
    if (audioElement.duration && isFinite(audioElement.duration) && !isNaN(audioElement.duration) && audioElement.duration > 0) {
      setDuration(audioElement.duration);
    } else if (playingRecording) {
      // durationが取得できない場合、録音データから取得を試みる
      const recording = recordings.find(r => r.id === playingRecording);
      if (recording?.duration_seconds && isFinite(recording.duration_seconds) && !isNaN(recording.duration_seconds)) {
        setDuration(recording.duration_seconds);
      }
    }

    // timeupdateイベントで再生位置を更新
    const handleTimeUpdate = () => {
      if (!isSeeking && audioElement) {
        const current = audioElement.currentTime;
        if (isFinite(current) && !isNaN(current) && current >= 0) {
          setCurrentTime(current);
        }
        const dur = audioElement.duration;
        if (dur && isFinite(dur) && !isNaN(dur) && dur > 0) {
          setDuration(dur);
        }
      }
    };

    // durationchangeイベントで総時間を更新
    const handleDurationChange = () => {
      const dur = audioElement.duration;
      if (dur && isFinite(dur) && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      }
    };

    // loadedmetadataイベントで総時間を更新
    const handleLoadedMetadata = () => {
      const dur = audioElement.duration;
      if (dur && isFinite(dur) && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      }
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('durationchange', handleDurationChange);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('durationchange', handleDurationChange);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioElement, playingRecording, isSeeking]);

  // Web環境でのプログレスバーinput要素の作成と更新
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    if (!playingRecording) {
      // 再生が停止したら、すべてのinput要素を削除
      Object.keys(progressSliderRefs.current).forEach((recordingId) => {
        const slider = progressSliderRefs.current[recordingId];
        if (slider && slider.parentNode) {
          slider.parentNode.removeChild(slider);
          progressSliderRefs.current[recordingId] = null;
        }
      });
      return;
    }

    // 現在再生中の録音のプログレスバーを作成/更新
    const containerId = `progress-slider-container-${playingRecording}`;
    
    // まず、他の録音のスライダーをクリーンアップ（重複を防ぐ）
    Object.keys(progressSliderRefs.current).forEach((recordingId) => {
      if (recordingId !== playingRecording) {
        const otherSlider = progressSliderRefs.current[recordingId];
        if (otherSlider && otherSlider.parentNode) {
          const cleanup = (otherSlider as any)._cleanup;
          if (cleanup) {
            cleanup();
          }
          otherSlider.parentNode.removeChild(otherSlider);
          progressSliderRefs.current[recordingId] = null;
        }
      }
    });
    
    // 少し待ってからコンテナを取得（Reactのレンダリング完了を待つ）
    const timeoutId = setTimeout(() => {
    const container = document.getElementById(containerId);
    if (!container) {
          logger.debug('プログレスバーコンテナが見つかりません:', containerId);
        return;
    }

      // 既存のスライダーが別のコンテナにある場合は削除
    let slider = progressSliderRefs.current[playingRecording];
      if (slider && slider.parentNode && slider.parentNode !== container) {
        const cleanup = (slider as any)._cleanup;
        if (cleanup) {
          cleanup();
        }
        slider.parentNode.removeChild(slider);
        slider = null;
        progressSliderRefs.current[playingRecording] = null;
      }

    // durationが有効な値であることを確認（InfinityやNaNを除外）
    const rawDuration = duration || recordings.find(r => r.id === playingRecording)?.duration_seconds || 0;
    const totalDuration = isFinite(rawDuration) && !isNaN(rawDuration) && rawDuration > 0 ? rawDuration : 0;

    if (!slider) {
      // 新しいinput要素を作成
      slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = String(totalDuration);
      slider.step = '0.1';
      slider.style.width = '100%';
      slider.style.height = '6px';
      slider.style.borderRadius = '3px';
      slider.style.outline = 'none';
      slider.style.cursor = 'pointer';
      slider.style.webkitAppearance = 'none';
      slider.style.appearance = 'none';
        slider.style.position = 'relative';
        slider.style.zIndex = '1';
      container.appendChild(slider);
      progressSliderRefs.current[playingRecording] = slider;

      // イベントハンドラーを設定
      const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const newTime = parseFloat(target.value);
          if (isFinite(newTime) && !isNaN(newTime) && newTime >= 0) {
        setCurrentTime(newTime);
        if (audioElement) {
          audioElement.currentTime = newTime;
            }
        }
      };

      const handleMouseDown = () => {
        setIsSeeking(true);
      };

      const handleMouseUp = () => {
        setIsSeeking(false);
      };

      const handleTouchStart = () => {
        setIsSeeking(true);
      };

      const handleTouchEnd = () => {
        setIsSeeking(false);
      };

      slider.addEventListener('input', handleInput);
      slider.addEventListener('mousedown', handleMouseDown);
      slider.addEventListener('mouseup', handleMouseUp);
        slider.addEventListener('touchstart', handleTouchStart);
        slider.addEventListener('touchend', handleTouchEnd);

      // クリーンアップ関数を保存
      (slider as any)._cleanup = () => {
        slider.removeEventListener('input', handleInput);
        slider.removeEventListener('mousedown', handleMouseDown);
        slider.removeEventListener('mouseup', handleMouseUp);
        slider.removeEventListener('touchstart', handleTouchStart);
        slider.removeEventListener('touchend', handleTouchEnd);
      };
    }

    // 値とスタイルを更新（シーク中でない場合のみ）
      if (!isSeeking && slider) {
      // totalDurationが有効な値であることを確認
      const validDuration = isFinite(totalDuration) && !isNaN(totalDuration) && totalDuration > 0 ? totalDuration : 0;
      slider.max = String(validDuration);
      const validCurrentTime = isFinite(currentTime) && !isNaN(currentTime) && currentTime >= 0 ? currentTime : 0;
      slider.value = String(validCurrentTime);
        
    // 進捗率の計算（有効な値であることを確認）
    const progressPercent = validDuration > 0 ? Math.min(100, Math.max(0, (validCurrentTime / validDuration) * 100)) : 0;
    slider.style.background = `linear-gradient(to right, ${currentTheme.primary} 0%, ${currentTheme.primary} ${progressPercent}%, rgba(0, 0, 0, 0.1) ${progressPercent}%, rgba(0, 0, 0, 0.1) 100%)`;
      }
    }, 50); // レンダリング完了を待つ時間を短縮

    // クリーンアップ
    return () => {
      clearTimeout(timeoutId);
      const slider = progressSliderRefs.current[playingRecording];
      if (slider) {
        const cleanup = (slider as any)._cleanup;
        if (cleanup) {
          cleanup();
        }
        if (slider.parentNode) {
          slider.parentNode.removeChild(slider);
          progressSliderRefs.current[playingRecording] = null;
        }
      }
    };
  }, [playingRecording, currentTime, duration, audioElement, recordings, currentTheme.primary, isSeeking]);

  // 画面がフォーカスされた時にデータを再読み込み（楽器変更時のみ）
  useFocusEffect(
    React.useCallback(() => {
      // 楽器が変更された場合のみ再読み込み（フィルター変更時はuseEffectで処理）
      loadRecordings();
    }, [entitlement, selectedInstrument])
  );

  const loadRecordings = async () => {
    try {
      setLoading(true); // 読み込み開始時に明示的に設定
      logger.debug('録音ライブラリ読み込み開始', {
        hasEntitlement: !!entitlement,
        entitlementValue: entitlement,
        isWeb: typeof window !== 'undefined',
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
      });
      
      // 機能アクセスチェック（フリープランでも制限内で使用可能）
      const canAccess = canAccessFeature('recordings', entitlement);
      logger.debug('録音機能アクセス可否:', canAccess);
      
      if (!canAccess) {
        logger.debug('録音ライブラリアクセス拒否');
        setRecordings([]);
        setLoading(false);
        return;
      }
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        logger.error('認証エラー:', authError);
        ErrorHandler.handle(authError, '認証確認', true);
        setRecordings([]);
        setLoading(false);
        return;
      }
      
      if (user) {
        // 統一的な楽器ID取得（selectedInstrumentとuser.selected_instrument_idの両方を考慮）
        const instrumentId = getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id);
        logger.debug('録音データ取得開始', { userId: user.id, instrumentId, selectedInstrument, userSelectedInstrumentId: user?.selected_instrument_id });
        
        // すべての録音データを取得（録音種類フィルターはクライアント側で適用）
        const { data, error } = await listAllRecordings(user.id, instrumentId, undefined, null);
        if (error) {
          logger.error('録音データ取得エラー:', error);
          ErrorHandler.handle(error, '録音データ読み込み', true);
          // エラー時も空配列を設定してUIを更新
          setRecordings([]);
        } else {
          logger.debug('録音データ取得成功:', data?.length || 0, '件');
          // データを更新（0件の場合は空配列を設定）
          setRecordings(data || []);
        }
      } else {
        logger.debug('ユーザー情報なし');
        setRecordings([]);
      }
    } catch (error) {
      logger.error('録音ライブラリ読み込み例外:', error);
      ErrorHandler.handle(error, '録音ライブラリ読み込み', true);
      // エラー時も空配列を設定してUIを更新
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecordings();
    setRefreshing(false);
  };

  const toggleFavorite = async (recordingId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('recordings')
        .update({ is_favorite: !currentFavorite })
        .eq('id', recordingId);

      if (error) {
        throw error;
      }

      // ローカル状態を更新
      setRecordings(prev => 
        prev.map(rec => 
          rec.id === recordingId 
            ? { ...rec, is_favorite: !currentFavorite }
            : rec
        )
      );
    } catch (error) {
      ErrorHandler.handle(error, 'お気に入り更新', true);
      Alert.alert('エラー', 'お気に入りの更新に失敗しました');
    }
  };

  const deleteRecordingItem = async (recordingId: string) => {
    logger.debug('削除ボタンがタップされました:', recordingId);
    
    Alert.alert(
      '録音削除',
      'この録音を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              logger.debug('削除処理開始:', recordingId);
              const { error } = await deleteRecording(recordingId);
              if (error) {
                ErrorHandler.handle(error, '録音削除', true);
                throw error;
              }

              // ローカル状態から削除
              setRecordings(prev => prev.filter(rec => rec.id !== recordingId));
              logger.debug('削除完了');
              Alert.alert('成功', '録音を削除しました');
            } catch (error) {
              ErrorHandler.handle(error, '録音削除', true);
              Alert.alert('エラー', '録音の削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const isVideoUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  const playRecording = async (recording: Recording) => {
    // 動画URLの場合はブラウザで開く
    if (isVideoUrl(recording.file_path)) {
      if (typeof window !== 'undefined') {
        window.open(recording.file_path, '_blank');
      }
      return;
    }

    if (playingRecording === recording.id) {
      // 現在再生中の録音を停止
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setPlayingRecording(null);
      setAudioElement(null);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    try {
      // 他の録音を停止
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      logger.debug('録音再生開始:', recording.file_path);

      // ファイルパスの検証
      if (!recording.file_path || recording.file_path.trim() === '') {
        logger.error('録音再生エラー: ファイルパスが空です');
        Alert.alert('エラー', '録音ファイルのパスが無効です');
        return;
      }

      // 新しい録音を再生
      let publicUrl: string;
      
      try {
        const urlResult = supabase.storage
          .from('recordings')
          .getPublicUrl(recording.file_path);
        
        publicUrl = urlResult.data.publicUrl;
        logger.debug('録音URL取得成功:', { 
          filePath: recording.file_path, 
          publicUrl,
          supabaseUrl: (supabase as any).supabaseUrl || 'unknown',
          isGitHubPages: typeof window !== 'undefined' && window.location.hostname.includes('github.io')
        });
      } catch (urlError) {
        logger.error('録音URL取得エラー:', {
          error: urlError,
          filePath: recording.file_path,
          supabaseUrl: (supabase as any).supabaseUrl || 'unknown'
        });
        Alert.alert('エラー', '録音ファイルのURLを取得できませんでした');
        return;
      }

      // publicUrlの検証
      if (!publicUrl || publicUrl.trim() === '') {
        logger.error('録音再生エラー: publicUrlが空です', { filePath: recording.file_path, publicUrl });
        Alert.alert('エラー', '録音ファイルのURLを取得できませんでした');
        return;
      }

      // Web環境（特にGitHub Pages）では、常にfetch + Blob URL方式を使用（CORS問題を根本的に回避）
      const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
      const isGitHubPages = isWeb && window.location.hostname.includes('github.io');
      
      if (isWeb) {
        // Web環境では常にfetch + Blob URL方式を使用（フォールバックなし）
        let blobUrl: string | null = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            logger.debug(`録音データをfetchで取得します (試行 ${retryCount + 1}/${maxRetries}):`, {
              publicUrl,
              isGitHubPages,
              hostname: window.location.hostname,
              retryCount
            });
            
            // fetchリクエスト（リトライ時は少し待機）
            if (retryCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
            
            const response = await fetch(publicUrl, {
              method: 'GET',
              headers: {
                'Accept': 'audio/*',
                'Cache-Control': 'no-cache', // キャッシュを無効化
              },
              mode: 'cors', // CORSモードを明示的に指定
              credentials: 'omit', // 認証情報を送信しない
              cache: 'no-store', // キャッシュを無効化
            });
            
            logger.debug('fetchレスポンス:', {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length'),
              cors: response.headers.get('access-control-allow-origin'),
            });
            
            if (!response.ok) {
              const errorText = await response.text().catch(() => 'レスポンス本文を取得できませんでした');
              throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}, body: ${errorText.substring(0, 200)}`);
            }
            
            // レスポンスが空でないことを確認
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) === 0) {
              throw new Error('レスポンスが空です');
            }
            
            const blob = await response.blob();
            
            // Blobが空でないことを確認
            if (blob.size === 0) {
              throw new Error('Blobが空です');
            }
            
            logger.debug('Blob作成成功:', {
              blobSize: blob.size,
              blobType: blob.type || 'application/octet-stream',
              isGitHubPages
            });
            
            blobUrl = URL.createObjectURL(blob);
            logger.debug('Blob URLを作成しました:', blobUrl);
            
            // Blob URLが確実に作成されていることを確認
            if (!blobUrl || typeof blobUrl !== 'string' || blobUrl.trim() === '') {
              throw new Error('Blob URLの作成に失敗しました');
            }
            
            // Audio要素を作成（Blob URLを使用してCSPエラーを回避）
            const audio = new Audio();
            // Blob URLを設定（CSPエラーを回避するため、src属性を直接設定）
            // blobUrlが有効であることを確認してから設定
            if (blobUrl && typeof blobUrl === 'string' && blobUrl.trim() !== '') {
            audio.src = blobUrl;
            audio.preload = 'auto';
            // crossOriginを設定（念のため）
            audio.crossOrigin = 'anonymous';
            
              // src属性が正しく設定されたことを確認
              if (!audio.src || audio.src === '' || audio.src === 'null' || audio.src === 'undefined') {
                throw new Error(`Audio要素のsrc属性の設定に失敗しました: ${audio.src}`);
              }
            } else {
              throw new Error('Blob URLが無効です');
            }
            
            // エラーハンドリングを設定（Blob URL解放を含む）
            const cleanup = () => {
              if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                blobUrl = null;
              }
            };
            
            audio.onended = () => {
              logger.debug('録音再生終了');
              cleanup();
              setPlayingRecording(null);
              setAudioElement(null);
              setCurrentTime(0);
              setDuration(0);
            };
            
            audio.onerror = (e) => {
              const currentSrc = audio.src;
              const errorMessage = audio.error 
                ? `エラーコード: ${audio.error.code}, メッセージ: ${audio.error.message || '不明なエラー'}`
                : '不明なエラー';
              
              // srcが空の場合、再設定を試みる
              if ((!currentSrc || currentSrc === '' || currentSrc === 'null' || currentSrc === 'undefined') && blobUrl) {
                logger.warn('audio.srcが空のため、再設定を試みます', { blobUrl, currentSrc });
                try {
                  audio.src = blobUrl;
                  audio.load();
                  return; // 再設定後はエラーハンドリングをスキップ
                } catch (retryError) {
                  logger.error('audio.srcの再設定に失敗しました', { retryError, blobUrl });
                }
              }
              
              logger.error('録音再生エラー:', {
                error: errorMessage,
                filePath: recording.file_path,
                publicUrl,
                blobUrl,
                currentSrc,
                errorCode: audio.error?.code,
                errorMessage: audio.error?.message,
                networkState: audio.networkState,
                readyState: audio.readyState,
                isGitHubPages,
                srcIsEmpty: !currentSrc || currentSrc === '' || currentSrc === 'null' || currentSrc === 'undefined'
              });
              
              cleanup();
              
              // エラーメッセージを改善
              let alertMessage = '録音の再生に失敗しました。';
              if (audio.error?.code === 4) {
                alertMessage += '\n\nCORSエラーが発生しました。Supabase StorageのCORS設定を確認してください。';
              } else if (audio.networkState === 3) {
                alertMessage += '\n\nネットワークエラーが発生しました。インターネット接続を確認してください。';
              } else {
                alertMessage += '\n\nファイルが見つからない可能性があります。';
              }
              
              Alert.alert('再生エラー', alertMessage);
              setPlayingRecording(null);
              setAudioElement(null);
            };
            
            // ロードイベントを追加
            audio.onloadeddata = () => {
              logger.debug('録音データのロード完了');
            };
            
            audio.onloadstart = () => {
              logger.debug('録音データのロード開始', {
                src: audio.src,
                blobUrl,
                srcIsEmpty: !audio.src || audio.src === '' || audio.src === 'null' || audio.src === 'undefined'
              });
              // srcが空の場合は再設定を試みる
              if ((!audio.src || audio.src === '' || audio.src === 'null' || audio.src === 'undefined') && blobUrl) {
                logger.warn('audio.srcが空のため、再設定を試みます', { blobUrl });
                audio.src = blobUrl;
              }
            };
            
            audio.oncanplay = () => {
              logger.debug('録音データの再生準備完了');
            };
            
            // 再生を開始
            await audio.play();
            logger.debug('録音再生中（Blob URL使用）', { isGitHubPages });
            setPlayingRecording(recording.id);
            setAudioElement(audio);
            
            // 成功したらループを抜ける
            break;
          } catch (fetchError) {
            retryCount++;
            logger.error(`fetchで録音データを取得できませんでした (試行 ${retryCount}/${maxRetries}):`, {
              error: fetchError,
              errorMessage: fetchError instanceof Error ? fetchError.message : String(fetchError),
              errorStack: fetchError instanceof Error ? fetchError.stack : undefined,
              publicUrl,
              isGitHubPages,
              hostname: window.location.hostname,
              retryCount
            });
            
            // 最後の試行でも失敗した場合
            if (retryCount >= maxRetries) {
              logger.error('すべてのリトライが失敗しました', {
                error: fetchError,
                blobUrl: null, // エラー時はblobUrlがnullのまま
                publicUrl,
                isGitHubPages
              });
              Alert.alert(
                '再生エラー',
                '録音の再生に失敗しました。\n\n考えられる原因:\n- ネットワーク接続の問題\n- Supabase StorageのCORS設定の問題\n- ファイルが存在しない\n\nインターネット接続とSupabase Storageの設定を確認してください。'
              );
              return;
            }
          }
        }
      } else {
        // モバイル環境（通常は使用されないが、念のため）
        logger.warn('モバイル環境での録音再生はサポートされていません');
        Alert.alert('エラー', '録音再生はWeb環境でのみ利用できます');
      }
    } catch (error) {
      logger.error('録音再生エラー:', error);
      ErrorHandler.handle(error, '録音再生', false);
      Alert.alert('エラー', '録音の再生に失敗しました');
    }
  };

  const formatDuration = (seconds: number) => {
    // Infinity、NaN、または無効な値の場合は0:00を返す
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 時間フィルター、録音種類フィルター、検索クエリに基づいて録音をフィルタリング
  const getFilteredRecordings = (filter: TimeFilter = timeFilter) => {
    let filtered = recordings;

    // 録音種類フィルター適用（クライアント側でフィルタリング）
    if (recordingTypeFilter !== 'all') {
      filtered = filtered.filter(recording => {
        return recording.recording_type === recordingTypeFilter;
      });
    }

    // 時間フィルター適用
    if (filter !== 'all') {
      const now = new Date();
      let filterDate: Date;

      switch (filter) {
        case '1week':
          filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          filterDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '3months':
          filterDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case '6months':
          filterDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          break;
        case '1year':
          filterDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default:
          filterDate = new Date(0);
      }

      filtered = filtered.filter(recording => {
        const recordedDate = new Date(recording.recorded_at);
        return recordedDate >= filterDate;
      });
    }

    // 検索クエリ適用
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(recording => {
        const title = (recording.title || '').toLowerCase();
        return title.includes(query);
      });
    }

    return filtered;
  };

  // 指定された期間の録音を表示（7日前から最新まで）
  const handleTimeFilter = (filter: TimeFilter) => {
    setTimeFilter(filter);
    // フィルター適用後、先頭にスクロール
    if (typeof window !== 'undefined' && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ 
          y: 0, 
          animated: true 
        });
      }, 100);
    }
  };

  const sortedRecordings = [...getFilteredRecordings()].sort((a, b) => {
    // 「全て」以外のフィルターの場合は、古い順（昇順）で表示（最新が下に来る）
    // 「全て」の場合は、お気に入りを優先、次に録音日時で降順（新しいものが上）
    if (timeFilter === 'all') {
      // お気に入りを優先、次に録音日時で降順
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
    } else {
      // 時間フィルター適用時は、録音日時で昇順（古いものが上、最新が下）
      return new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime();
    }
  });

  // エンタイトルメントの読み込み中はローディング画面を表示
  if (entitlementLoading || loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
        <InstrumentHeader />
        <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
          <Text style={[styles.loadingText, { color: currentTheme.text }]}>
            録音データを読み込み中...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // サブスクリプションエラーが発生した場合はエラーを表示
  if (!entitlementLoading && subscriptionError && subscriptionErrorMessage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}> 
        <InstrumentHeader />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: '#DC2626' }]}>⚠️ エラーが発生しました</Text>
          <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary, marginTop: 8 }]}>
            {subscriptionErrorMessage}
          </Text>
          <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary, marginTop: 16, fontSize: 12 }]}>
            サブスクリプション情報の読み込みに失敗しました。もう一度お試しください。
          </Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: currentTheme.primary, marginTop: 24 }]}
            onPress={async () => {
              await refreshSubscription();
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 機能アクセス不可の場合のゲート表示（通常は表示されない、フリープランでも制限内で使用可能）
  // このチェックは、entitlementが取得できない場合などのエラー時のフォールバック
  if (!entitlementLoading && !loading && !canAccessFeature('recordings', entitlement)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} > 
        <InstrumentHeader />
        <View style={styles.emptyContainer}>
          <Music size={64} color={currentTheme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>プレミアム限定</Text>
          <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary }]}>録音ライブラリはプレミアムでご利用いただけます</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: currentTheme.primary }]}
            onPress={() => router.push('/(tabs)/pricing-plans')}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>料金プランを見る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => safeGoBack(router, '/(tabs)/settings', true)} // 確実にsettings画面に戻る
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={currentTheme.text} />
              <Text style={[styles.backButtonText, { color: currentTheme.text }]}>戻る</Text>
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: currentTheme.text }]}>
                録音ライブラリ
              </Text>
              <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
                {sortedRecordings.length}件の録音
                {((timeFilter !== 'all' || searchQuery.trim() !== '') && recordings.length !== sortedRecordings.length) ? ` (全${recordings.length}件)` : null}
              </Text>
            </View>
          </View>
        </View>

        {/* 検索バー */}
        <View style={[styles.searchContainer, { backgroundColor: currentTheme.surface }]}>
          {Platform.OS === 'web' ? (
            <Text style={[styles.searchIconText, { color: currentTheme.textSecondary }]}>🔍</Text>
          ) : (
            <Search size={20} color={currentTheme.textSecondary} />
          )}
          <TextInput
            style={[styles.searchInput, { color: currentTheme.text }]}
            placeholder="タイトルで検索..."
            placeholderTextColor={currentTheme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            nativeID="recordings-search-input"
            accessibilityLabel="録音検索"
          />
          {searchQuery.trim() && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              {Platform.OS === 'web' ? (
                <Text style={[styles.clearIconText, { color: currentTheme.textSecondary }]}>✕</Text>
              ) : (
                <X size={18} color={currentTheme.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* 録音種類フィルター */}
        <View style={[styles.timeFilterContainer, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.timeFilterTitle, { color: currentTheme.text }]}>
            録音種類
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeFilterButtons}
          >
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                {
                  backgroundColor: recordingTypeFilter === 'all' ? currentTheme.primary : currentTheme.secondary,
                }
              ]}
              onPress={() => {
                setRecordingTypeFilter('all');
                // フィルター適用後、先頭にスクロール
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ 
                    y: 0, 
                    animated: true 
                  });
                }, 100);
              }}
            >
              <Text style={[
                styles.timeFilterButtonText,
                { color: recordingTypeFilter === 'all' ? currentTheme.surface : currentTheme.text }
              ]}>
                全て
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                {
                  backgroundColor: recordingTypeFilter === 'performance' ? currentTheme.primary : currentTheme.secondary,
                }
              ]}
              onPress={() => {
                setRecordingTypeFilter('performance');
                // フィルター適用後、先頭にスクロール
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ 
                    y: 0, 
                    animated: true 
                  });
                }, 100);
              }}
            >
              <Text style={[
                styles.timeFilterButtonText,
                { color: recordingTypeFilter === 'performance' ? currentTheme.surface : currentTheme.text }
              ]}>
                演奏録音
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                {
                  backgroundColor: recordingTypeFilter === 'lesson' ? currentTheme.primary : currentTheme.secondary,
                }
              ]}
              onPress={() => {
                setRecordingTypeFilter('lesson');
                // フィルター適用後、先頭にスクロール
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ 
                    y: 0, 
                    animated: true 
                  });
                }, 100);
              }}
            >
              <Text style={[
                styles.timeFilterButtonText,
                { color: recordingTypeFilter === 'lesson' ? currentTheme.surface : currentTheme.text }
              ]}>
                レッスン録音
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 聴き比べモード：時間フィルター */}
        <View style={[styles.timeFilterContainer, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.timeFilterTitle, { color: currentTheme.text }]}>
            聴き比べモード
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeFilterButtons}
          >
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                {
                  backgroundColor: timeFilter === 'all' ? currentTheme.primary : currentTheme.secondary,
                }
              ]}
              onPress={() => setTimeFilter('all')}
            >
              <Text style={[
                styles.timeFilterButtonText,
                { color: timeFilter === 'all' ? currentTheme.surface : currentTheme.text }
              ]}>
                全て
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                {
                  backgroundColor: timeFilter === '1week' ? currentTheme.primary : currentTheme.secondary,
                }
              ]}
              onPress={() => handleTimeFilter('1week')}
            >
              <Text style={[
                styles.timeFilterButtonText,
                { color: timeFilter === '1week' ? currentTheme.surface : currentTheme.text }
              ]}>
                1週間前
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                {
                  backgroundColor: timeFilter === '1month' ? currentTheme.primary : currentTheme.secondary,
                }
              ]}
              onPress={() => handleTimeFilter('1month')}
            >
              <Text style={[
                styles.timeFilterButtonText,
                { color: timeFilter === '1month' ? currentTheme.surface : currentTheme.text }
              ]}>
                1ヶ月前
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                {
                  backgroundColor: timeFilter === '3months' ? currentTheme.primary : currentTheme.secondary,
                }
              ]}
              onPress={() => handleTimeFilter('3months')}
            >
              <Text style={[
                styles.timeFilterButtonText,
                { color: timeFilter === '3months' ? currentTheme.surface : currentTheme.text }
              ]}>
                3ヶ月前
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                {
                  backgroundColor: timeFilter === '6months' ? currentTheme.primary : currentTheme.secondary,
                }
              ]}
              onPress={() => handleTimeFilter('6months')}
            >
              <Text style={[
                styles.timeFilterButtonText,
                { color: timeFilter === '6months' ? currentTheme.surface : currentTheme.text }
              ]}>
                半年前
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeFilterButton,
                {
                  backgroundColor: timeFilter === '1year' ? currentTheme.primary : currentTheme.secondary,
                }
              ]}
              onPress={() => handleTimeFilter('1year')}
            >
              <Text style={[
                styles.timeFilterButtonText,
                { color: timeFilter === '1year' ? currentTheme.surface : currentTheme.text }
              ]}>
                1年前
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 録音リスト */}
        <View style={styles.recordingsContainer}>
          {sortedRecordings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
                0件です
              </Text>
            </View>
          ) : (
            sortedRecordings.map((recording) => (
                <View
                  key={recording.id}
                  style={[styles.recordingCard, { backgroundColor: currentTheme.surface }]}
                >
                  <View style={styles.recordingHeader}>
                    <View style={styles.recordingInfo}>
                      <View style={styles.titleContainer}>
                        {isVideoUrl(recording.file_path) && (
                          <Video
                            size={16}
                            color={currentTheme.primary}
                            style={styles.mediaIcon}
                          />
                        )}
                        <Text style={[styles.recordingTitle, { color: currentTheme.text }]}>
                          {recording.title || (isVideoUrl(recording.file_path) ? '無題の動画' : '無題の録音')}
                        </Text>
                      </View>
                      <View style={styles.recordingMeta}>
                        <View style={styles.metaItem}>
                          <Calendar size={14} color={currentTheme.textSecondary} />
                          <Text style={[styles.metaText, { color: currentTheme.textSecondary }]}>
                            {formatDate(recording.recorded_at)}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Clock size={14} color={currentTheme.textSecondary} />
                          <Text style={[styles.metaText, { color: currentTheme.textSecondary }]}>
                            {formatDuration(recording.duration_seconds)}
                          </Text>
                        </View>
                      </View>
                      {/* レッスン録音の削除予定日表示 */}
                      {recording.recording_type === 'lesson' && recording.auto_delete_at && !recording.is_favorite && (
                        <View style={styles.recordingMeta}>
                          <Text style={[styles.deleteWarningText, { color: currentTheme.textSecondary }]}>
                            ※ この録音は{formatDate(recording.auto_delete_at)}に自動削除されます
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.recordingActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => toggleFavorite(recording.id, recording.is_favorite)}
                      >
                        {recording.is_favorite ? (
                          <Star size={20} color="#FFD700" fill="#FFD700" />
                        ) : (
                          <StarOff size={20} color={currentTheme.textSecondary} />
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => playRecording(recording)}
                      >
                        {playingRecording === recording.id ? (
                          <Pause size={20} color={currentTheme.primary} />
                        ) : (
                          <Play size={20} color={currentTheme.primary} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* プログレスバー（再生中の場合のみ表示） */}
                  {playingRecording === recording.id && !isVideoUrl(recording.file_path) && (
                    <View style={[styles.progressContainer, { borderTopColor: currentTheme.secondary }]}>
                      {Platform.OS === 'web' && typeof window !== 'undefined' ? (
                        <View>
                          {Platform.OS === 'web' && typeof document !== 'undefined' ? (
                            <View
                              // @ts-ignore - Web環境ではid属性を使用
                              id={`progress-slider-container-${recording.id}`}
                              style={{ marginBottom: 8, height: 6 }}
                            />
                          ) : (
                            <View style={{ marginBottom: 8, height: 6 }} />
                          )}
                          <View style={styles.timeContainer}>
                            <Text style={[styles.timeText, { color: currentTheme.textSecondary }]}>
                              {formatDuration(isFinite(currentTime) && !isNaN(currentTime) ? Math.floor(currentTime) : 0)}
                            </Text>
                            <Text style={[styles.timeText, { color: currentTheme.textSecondary }]}>
                              {formatDuration((() => {
                                const d = duration || recording.duration_seconds || 0;
                                return isFinite(d) && !isNaN(d) ? d : 0;
                              })())}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.progressBarWrapper, { backgroundColor: currentTheme.secondary }]}
                            onPress={(e) => {
                              if (audioElement && playingRecording === recording.id) {
                                const totalDuration = duration || recording.duration_seconds || 0;
                                if (totalDuration > 0 && e.nativeEvent) {
                                  const { locationX } = e.nativeEvent;
                                  const containerWidth = (e.target as any)?.offsetWidth || (e.currentTarget as any)?.offsetWidth || width - 32;
                                  const newTime = (locationX / containerWidth) * totalDuration;
                                  const clampedTime = Math.max(0, Math.min(totalDuration, newTime));
                                  audioElement.currentTime = clampedTime;
                                  setCurrentTime(clampedTime);
                                }
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.progressBar, { 
                              width: `${(() => {
                                const d = isFinite(duration) && !isNaN(duration) && duration > 0 ? duration : 0;
                                const ct = isFinite(currentTime) && !isNaN(currentTime) && currentTime >= 0 ? currentTime : 0;
                                return d > 0 ? Math.min(100, Math.max(0, (ct / d) * 100)) : 0;
                              })()}%`,
                              backgroundColor: currentTheme.primary 
                            }]} />
                          </TouchableOpacity>
                          <View style={styles.timeContainer}>
                            <Text style={[styles.timeText, { color: currentTheme.textSecondary }]}>
                              {formatDuration(isFinite(currentTime) && !isNaN(currentTime) ? Math.floor(currentTime) : 0)}
                            </Text>
                            <Text style={[styles.timeText, { color: currentTheme.textSecondary }]}>
                              {formatDuration((() => {
                                const d = duration || recording.duration_seconds || 0;
                                return isFinite(d) && !isNaN(d) ? d : 0;
                              })())}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColorは各SafeAreaViewでテーマ色を指定
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  header: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: -4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomBackButton: {
    marginTop: 16,
    marginBottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  bottomBackButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  timeFilterContainer: {
    marginBottom: 4,
    padding: 6,
    borderRadius: 14,
    elevation: 2,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  timeFilterTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeFilterButtons: {
    flexDirection: 'row',
    gap: 4,
    paddingRight: 8,
  },
  timeFilterButton: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeFilterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordingsContainer: {
    paddingBottom: 20,
  },
  recordingCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    elevation: 4,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordingInfo: {
    flex: 1,
    marginRight: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingLeft: 8,
  },
  mediaIcon: {
    marginRight: 6,
  },
  recordingTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  recordingMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
  deleteWarningText: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 14,
    opacity: 0.75,
    fontStyle: 'italic',
  },
    fontSize: 14,
    fontWeight: '400',
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: -6,
    marginBottom: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
  },
  searchIconText: {
    fontSize: 18,
    lineHeight: 18,
  },
  clearButton: {
    padding: 4,
  },
  clearIconText: {
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  progressBarWrapper: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});


