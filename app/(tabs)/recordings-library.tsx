import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import {
  prepareWebRecordingAudio,
  alertRecordingPlaybackError,
  createPlayableRecordingObjectUrl,
} from '@/lib/recordingPlayback';
import { trackFeatureAction } from '@/lib/featureUsageService';
import { FEATURE_IDS } from '@/lib/featureUsageEvents';
import { getInstrumentId } from '@/lib/instrumentUtils';

// expo-audio（ネイティブ再生）
let useAudioPlayer: (() => {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
  replace: (source: string) => void;
  currentTime: number;
  duration: number;
  playing: boolean;
}) | null = null;

if (Platform.OS !== 'web') {
  try {
    useAudioPlayer = require('expo-audio').useAudioPlayer;
  } catch (error) {
    logger.warn('expo-audio を読み込めません', error);
  }
}

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
  const mobileAudioPlayer = useAudioPlayer && Platform.OS !== 'web' ? useAudioPlayer() : null;
  const mobileTimePollRef = useRef<NodeJS.Timeout | null>(null);

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
      if (mobileAudioPlayer) {
        mobileAudioPlayer.pause();
        void mobileAudioPlayer.seekTo(0);
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      if (mobileTimePollRef.current) {
        clearInterval(mobileTimePollRef.current);
        mobileTimePollRef.current = null;
      }
    };
  }, [audioElement, mobileAudioPlayer]);

  // ネイティブ再生位置のポーリング
  useEffect(() => {
    if (Platform.OS === 'web' || !mobileAudioPlayer || !playingRecording) {
      if (mobileTimePollRef.current) {
        clearInterval(mobileTimePollRef.current);
        mobileTimePollRef.current = null;
      }
      return;
    }

    mobileTimePollRef.current = setInterval(() => {
      if (!isSeeking && mobileAudioPlayer) {
        const ct = mobileAudioPlayer.currentTime;
        if (isFinite(ct) && ct >= 0) setCurrentTime(ct);
        const dur = mobileAudioPlayer.duration;
        if (isFinite(dur) && dur > 0) setDuration(dur);
      }
    }, 250);

    return () => {
      if (mobileTimePollRef.current) {
        clearInterval(mobileTimePollRef.current);
        mobileTimePollRef.current = null;
      }
    };
  }, [mobileAudioPlayer, playingRecording, isSeeking]);

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

  // Web環境でのプログレスバー: 作成は再生開始時のみ（currentTimeごとに破棄しない＝点滅防止）
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    if (!playingRecording) {
      Object.keys(progressSliderRefs.current).forEach((recordingId) => {
        const slider = progressSliderRefs.current[recordingId];
        if (slider) {
          const cleanup = (slider as any)._cleanup;
          if (cleanup) cleanup();
          if (slider.parentNode) {
            slider.parentNode.removeChild(slider);
          }
          progressSliderRefs.current[recordingId] = null;
        }
      });
      return;
    }

    const containerId = `progress-slider-container-${playingRecording}`;
    const recordingId = playingRecording;

    Object.keys(progressSliderRefs.current).forEach((id) => {
      if (id !== recordingId) {
        const otherSlider = progressSliderRefs.current[id];
        if (otherSlider) {
          const cleanup = (otherSlider as any)._cleanup;
          if (cleanup) cleanup();
          if (otherSlider.parentNode) {
            otherSlider.parentNode.removeChild(otherSlider);
          }
          progressSliderRefs.current[id] = null;
        }
      }
    });

    const timeoutId = setTimeout(() => {
      const container = document.getElementById(containerId);
      if (!container) {
        logger.debug('プログレスバーコンテナが見つかりません:', containerId);
        return;
      }

      let slider = progressSliderRefs.current[recordingId];
      if (slider && slider.parentNode && slider.parentNode !== container) {
        const cleanup = (slider as any)._cleanup;
        if (cleanup) cleanup();
        slider.parentNode.removeChild(slider);
        slider = null;
        progressSliderRefs.current[recordingId] = null;
      }

      const rawDuration =
        duration ||
        recordings.find((r) => r.id === recordingId)?.duration_seconds ||
        0;
      const totalDuration =
        isFinite(rawDuration) && !isNaN(rawDuration) && rawDuration > 0 ? rawDuration : 1;

      if (!slider) {
        slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = String(totalDuration);
        slider.step = '0.1';
        slider.value = '0';
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
        progressSliderRefs.current[recordingId] = slider;

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
        const handleMouseDown = () => setIsSeeking(true);
        const handleMouseUp = () => setIsSeeking(false);
        const handleTouchStart = () => setIsSeeking(true);
        const handleTouchEnd = () => setIsSeeking(false);

        slider.addEventListener('input', handleInput);
        slider.addEventListener('mousedown', handleMouseDown);
        slider.addEventListener('mouseup', handleMouseUp);
        slider.addEventListener('touchstart', handleTouchStart);
        slider.addEventListener('touchend', handleTouchEnd);

        (slider as any)._cleanup = () => {
          slider?.removeEventListener('input', handleInput);
          slider?.removeEventListener('mousedown', handleMouseDown);
          slider?.removeEventListener('mouseup', handleMouseUp);
          slider?.removeEventListener('touchstart', handleTouchStart);
          slider?.removeEventListener('touchend', handleTouchEnd);
        };
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      const slider = progressSliderRefs.current[recordingId];
      if (!slider) return;
      // 同じ録音のまま audioElement だけ変わった場合は破棄しない（点滅防止）
      // playingRecording が変わった／停止したときは次の effect か停止分岐で片付ける
    };
  }, [playingRecording, audioElement]);

  // 再生停止時にスライダーを全削除
  useEffect(() => {
    if (playingRecording) return;
    Object.keys(progressSliderRefs.current).forEach((id) => {
      const slider = progressSliderRefs.current[id];
      if (!slider) return;
      const cleanup = (slider as any)._cleanup;
      if (cleanup) cleanup();
      if (slider.parentNode) {
        slider.parentNode.removeChild(slider);
      }
      progressSliderRefs.current[id] = null;
    });
  }, [playingRecording]);

  // プログレスバーの値・見た目だけ更新（要素は破棄しない）
  useEffect(() => {
    if (Platform.OS !== 'web' || !playingRecording || isSeeking) {
      return;
    }
    const slider = progressSliderRefs.current[playingRecording];
    if (!slider) return;

    const rawDuration =
      duration ||
      recordings.find((r) => r.id === playingRecording)?.duration_seconds ||
      0;
    const validDuration =
      isFinite(rawDuration) && !isNaN(rawDuration) && rawDuration > 0 ? rawDuration : 0;
    const validCurrentTime =
      isFinite(currentTime) && !isNaN(currentTime) && currentTime >= 0 ? currentTime : 0;

    if (validDuration > 0) {
      slider.max = String(validDuration);
    }
    slider.value = String(validCurrentTime);
    const progressPercent =
      validDuration > 0
        ? Math.min(100, Math.max(0, (validCurrentTime / validDuration) * 100))
        : 0;
    slider.style.background = `linear-gradient(to right, ${currentTheme.primary} 0%, ${currentTheme.primary} ${progressPercent}%, rgba(0, 0, 0, 0.1) ${progressPercent}%, rgba(0, 0, 0, 0.1) 100%)`;
  }, [playingRecording, currentTime, duration, recordings, currentTheme.primary, isSeeking]);

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

    const runDelete = async () => {
      try {
        logger.debug('削除処理開始:', recordingId);

        // 再生中なら停止（iOS/Android/Web 共通）
        if (playingRecording === recordingId) {
          try {
            if (Platform.OS === 'web' && audioElement) {
              audioElement.pause();
              audioElement.src = '';
            } else if (mobileAudioPlayer) {
              mobileAudioPlayer.pause();
              void mobileAudioPlayer.seekTo(0);
            }
          } catch (stopError) {
            logger.warn('削除前の再生停止に失敗（続行）:', stopError);
          }
          setPlayingRecording(null);
          setCurrentTime(0);
        }

        const { error } = await deleteRecording(recordingId);
        if (error) {
          ErrorHandler.handle(error, '録音削除', true);
          Alert.alert('エラー', error instanceof Error ? error.message : '録音の削除に失敗しました');
          return;
        }

        setRecordings((prev) => prev.filter((rec) => rec.id !== recordingId));
        logger.debug('削除完了');
      } catch (error) {
        ErrorHandler.handle(error, '録音削除', true);
        Alert.alert(
          'エラー',
          error instanceof Error ? error.message : '録音の削除に失敗しました'
        );
      }
    };

    // Web は confirm、iOS/Android は Alert（Expo では window があっても confirm 不可）
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm('この録音を削除しますか？この操作は取り消せません。');
      if (confirmed) {
        await runDelete();
      }
      return;
    }

    Alert.alert(
      '録音削除',
      'この録音を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            void runDelete();
          },
        },
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
      if (Platform.OS === 'web' && audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      } else if (Platform.OS !== 'web' && mobileAudioPlayer) {
        mobileAudioPlayer.pause();
        await mobileAudioPlayer.seekTo(0);
      }
      setPlayingRecording(null);
      setAudioElement(null);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    try {
      if (Platform.OS === 'web' && audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      } else if (Platform.OS !== 'web' && mobileAudioPlayer) {
        mobileAudioPlayer.pause();
        await mobileAudioPlayer.seekTo(0);
      }

      logger.debug('録音再生開始:', recording.file_path);

      if (!recording.file_path || recording.file_path.trim() === '') {
        logger.error('録音再生エラー: ファイルパスが空です');
        Alert.alert('エラー', '録音ファイルのパスが無効です');
        return;
      }

      if (recording.duration_seconds && isFinite(recording.duration_seconds)) {
        setDuration(recording.duration_seconds);
      }

      if (Platform.OS === 'web') {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          Alert.alert('エラー', '録音再生はWeb環境でのみ利用できます');
          return;
        }

        const { audio, cleanup } = await prepareWebRecordingAudio(recording.file_path, {
          onEnded: () => {
            setPlayingRecording(null);
            setAudioElement(null);
            setCurrentTime(0);
            setDuration(0);
          },
          onError: (detail) => {
            Alert.alert('再生エラー', `録音の再生に失敗しました。\n${detail}`);
            setPlayingRecording(null);
            setAudioElement(null);
          },
        });

        try {
          await audio.play();
        } catch (playError) {
          cleanup();
          throw playError;
        }
        setPlayingRecording(recording.id);
        setAudioElement(audio);
      } else {
        if (!mobileAudioPlayer) {
          Alert.alert('エラー', 'この端末では録音再生を利用できません');
          return;
        }

        let playUrl: string;
        try {
          const prepared = await createPlayableRecordingObjectUrl(recording.file_path);
          playUrl = prepared.objectUrl;
        } catch (prepError) {
          alertRecordingPlaybackError(prepError);
          return;
        }

        mobileAudioPlayer.replace(playUrl);
        mobileAudioPlayer.play();
        setPlayingRecording(recording.id);
        setCurrentTime(0);
      }

      void trackFeatureAction(
        user?.id,
        FEATURE_IDS.recordingsLibrary,
        'play',
        { platform: Platform.OS, recordingId: recording.id },
        getInstrumentId(selectedInstrument)
      );
    } catch (error) {
      logger.error('録音再生エラー:', error);
      alertRecordingPlaybackError(error);
      setPlayingRecording(null);
      setAudioElement(null);
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

    // 時間フィルター適用（聴き比べ：「○以上前」の録音のみ = その時点より前の録音）
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

      // その日付以前の録音のみ表示（例: 半年前 → 現在から6ヶ月以上前の録音のみ）
      filtered = filtered.filter(recording => {
        const recordedDate = new Date(recording.recorded_at);
        return recordedDate <= filterDate;
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

  // 聴き比べ：選択期間「○以上前」の録音のみ表示。フィルター適用後、先頭にスクロール
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

  // 聴き比べモード時は「古い順」、全ての時は「お気に入り優先・新しい順」。フィルターと並びを useMemo で明示的に依存
  const sortedRecordings = useMemo(() => {
    const filtered = getFilteredRecordings(timeFilter);
    const safeTime = (r: Recording) => {
      const t = new Date(r.recorded_at).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    return [...filtered].sort((a, b) => {
      if (timeFilter === 'all') {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return safeTime(b) - safeTime(a); // 新しい順
      }
      // 聴き比べモード（1週間前〜1年前）：古い順（昇順）、最新が下
      return safeTime(a) - safeTime(b);
    });
  }, [recordings, timeFilter, searchQuery, recordingTypeFilter]);

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
        <View style={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={[styles.backButton, { zIndex: 1 }]}
              onPress={() => safeGoBack(router, '/(tabs)/settings', true)} // 確実にsettings画面に戻る
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={currentTheme.text} />
              <Text style={[styles.backButtonText, { color: currentTheme.text }]}>戻る</Text>
            </TouchableOpacity>
            
            <View style={styles.headerContent} pointerEvents="box-none">
              <Text style={[styles.title, { color: currentTheme.text }]}>
                録音ライブラリ
              </Text>
              <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
                {`${sortedRecordings.length}件の録音${(timeFilter !== 'all' || searchQuery.trim() !== '') && recordings.length !== sortedRecordings.length ? ` (全${recordings.length}件)` : ''}`}
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
          {searchQuery.trim() ? (
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
          ) : null}
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
                        accessibilityLabel="お気に入り"
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
                        accessibilityLabel="再生"
                      >
                        {playingRecording === recording.id ? (
                          <Pause size={20} color={currentTheme.primary} />
                        ) : (
                          <Play size={20} color={currentTheme.primary} />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => deleteRecordingItem(recording.id)}
                        accessibilityLabel="削除"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={20} color="#DC2626" />
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
                              const totalDuration = duration || recording.duration_seconds || 0;
                              if (totalDuration <= 0 || playingRecording !== recording.id || !e.nativeEvent) return;
                              const { locationX } = e.nativeEvent;
                              const containerWidth = (e.target as any)?.offsetWidth || (e.currentTarget as any)?.offsetWidth || width - 32;
                              const newTime = (locationX / containerWidth) * totalDuration;
                              const clampedTime = Math.max(0, Math.min(totalDuration, newTime));
                              if (Platform.OS === 'web' && audioElement) {
                                audioElement.currentTime = clampedTime;
                              } else if (Platform.OS !== 'web' && mobileAudioPlayer) {
                                void mobileAudioPlayer.seekTo(clampedTime);
                              }
                              setCurrentTime(clampedTime);
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
    position: 'relative',
    minHeight: 44,
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
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


