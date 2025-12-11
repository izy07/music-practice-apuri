import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { X, Save, Mic, Video, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AudioRecorder from './AudioRecorder';
import { supabase } from '@/lib/supabase';
import { formatLocalDate, formatMinutesToHours } from '@/lib/dateUtils';
import { uploadRecordingBlob, saveRecording, deletePracticeSession, deleteRecording, getRecordingsByDate } from '@/lib/database';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { getPracticeSessionsByDate } from '@/repositories/practiceSessionRepository';
import { cleanContentFromTimeDetails } from '@/lib/utils/contentCleaner';
import logger from '@/lib/logger';
import { disableBackgroundFocus, enableBackgroundFocus } from '@/lib/modalFocusManager';
import { getInstrumentId } from '@/lib/instrumentUtils';

// ドラムロール風のボタンベースピッカー（Web環境対応）
function WheelPicker({ value, onChange, max, highlightColor }: { value: number; onChange: (v: number) => void; max: number; highlightColor: string }) {
  const itemHeight = 40;
  const list = Array.from({ length: max + 1 }, (_, i) => i);

  const handleValueChange = (newValue: number) => {
    // 循環式：0未満の場合はmaxに、maxを超える場合は0に
    let clamped = newValue;
    if (newValue < 0) {
      clamped = max;
    } else if (newValue > max) {
      clamped = 0;
    } else {
      clamped = newValue;
    }
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  return (
    <View style={{ width: 80, height: itemHeight * 3, overflow: 'hidden', borderRadius: 8 }}>
      {/* ハイライト背景 */}
      <View style={{ position: 'absolute', top: itemHeight, left: 0, right: 0, height: itemHeight, borderRadius: 8, backgroundColor: highlightColor + '20' }} />
      
      {/* 背景の数字表示（ドラムロール風の見た目・タップ可能） */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
        {list.map((n) => (
          <TouchableOpacity
            key={`wheel-picker-item-${n}`}
            style={{ 
              position: 'absolute',
              top: n * itemHeight, 
              left: 0, 
              right: 0, 
              height: itemHeight, 
              alignItems: 'center', 
              justifyContent: 'center',
              opacity: Math.abs(n - value) <= 1 ? 0.4 : 0.15,
              zIndex: n === value ? 3 : 2
            }}
            onPress={() => handleValueChange(n)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, fontWeight: '500', color: '#999' }}>
              {String(n).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 上向き矢印ボタン */}
      <TouchableOpacity 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          height: itemHeight, 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 10
        }}
        onPress={() => handleValueChange(value - 1)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 18, color: highlightColor }}>▲</Text>
      </TouchableOpacity>

      {/* 中央の値表示 */}
      <View style={{ 
        position: 'absolute', 
        top: itemHeight, 
        left: 0, 
        right: 0, 
        height: itemHeight, 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 5,
        pointerEvents: 'none'
      }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: highlightColor }}>
          {String(value).padStart(2, '0')}
        </Text>
      </View>

      {/* 下向き矢印ボタン */}
      <TouchableOpacity 
        style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: itemHeight, 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 10
        }}
        onPress={() => handleValueChange(value + 1)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 18, color: highlightColor }}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

interface PracticeRecordModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSave?: (minutes: number, content?: string, audioUrl?: string, videoUrl?: string) => void | Promise<void>;
  onRecordingSaved?: () => void; // 録音保存後のコールバック
  onRefresh?: number; // データ再読み込みのトリガー（数値が変更されると再読み込み）
}

const PracticeRecordModal = memo(function PracticeRecordModal({ 
  visible, 
  onClose, 
  selectedDate,
  onSave,
  onRecordingSaved,
  onRefresh
}: PracticeRecordModalProps) {
  const router = useRouter();
  const { selectedInstrument, currentTheme } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const [minutes, setMinutes] = useState('');
  const [content, setContent] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [audioTitle, setAudioTitle] = useState('');
  const [audioMemo, setAudioMemo] = useState('');
  const [isAudioFavorite, setIsAudioFavorite] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [existingRecord, setExistingRecord] = useState<{
    id: string;
    minutes: number;
    content: string | null;
  } | null>(null);
  const [timerMinutes, setTimerMinutes] = useState<number>(0); // タイマーで計測した時間
  const [existingRecording, setExistingRecording] = useState<{
    id: string;
    title: string;
    duration: number;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [practiceBreakdown, setPracticeBreakdown] = useState<Array<{ method: string; minutes: number }>>([]);
  const [isRecordingJustSaved, setIsRecordingJustSaved] = useState(false); // 録音保存直後フラグ
  const [formStateBeforeRecording, setFormStateBeforeRecording] = useState<{
    minutes: string;
    content: string;
    existingRecording: typeof existingRecording;
  } | null>(null); // 録音画面に移動する前のフォーム状態と録音状態
  
  // 開始時刻・終了時刻の状態（デフォルト値を設定）
  const [startTime, setStartTime] = useState<{ hours: number; minutes: number } | null>({ hours: 13, minutes: 0 });
  const [endTime, setEndTime] = useState<{ hours: number; minutes: number } | null>({ hours: 18, minutes: 0 });
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');
  const [timePickerHours, setTimePickerHours] = useState(0);
  const [timePickerMinutes, setTimePickerMinutes] = useState(0);
  
  // 無限ループを防ぐため、existingRecordingとisRecordingJustSavedの最新値を保持
  const existingRecordingRef = useRef(existingRecording);
  const isRecordingJustSavedRef = useRef(isRecordingJustSaved);
  
  // 時間・分入力欄のref（後方互換性のため残す）
  const hoursInputRef = useRef<TextInput>(null);
  const minutesInputRef = useRef<TextInput>(null);

  // 全角数字を半角数字に変換する関数
  const convertToHalfWidth = (text: string): string => {
    return text.replace(/[０-９]/g, (char) => {
      const fullWidthMap: { [key: string]: string } = {
        '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
        '５': '5', '６': '6', '７': '7', '８': '8', '９': '9'
      };
      return fullWidthMap[char] || char;
    });
  };

  // 開始時刻と終了時刻から練習時間を計算
  const calculateMinutesFromTimes = useCallback((start: { hours: number; minutes: number } | null, end: { hours: number; minutes: number } | null): number => {
    if (!start || !end) return 0;
    
    const startTotalMinutes = start.hours * 60 + start.minutes;
    let endTotalMinutes = end.hours * 60 + end.minutes;
    
    // 終了時刻が開始時刻より前の場合は翌日として扱う
    if (endTotalMinutes <= startTotalMinutes) {
      endTotalMinutes += 24 * 60; // 24時間追加
    }
    
    return endTotalMinutes - startTotalMinutes;
  }, []);

  // 開始時刻または終了時刻が変更されたら練習時間を更新
  useEffect(() => {
    if (startTime && endTime) {
      const calculatedMinutes = calculateMinutesFromTimes(startTime, endTime);
      if (calculatedMinutes > 0) {
        setMinutes(calculatedMinutes.toString());
      }
    }
  }, [startTime, endTime, calculateMinutesFromTimes]);

  // 時刻選択モーダルを開く
  const openTimePicker = (type: 'start' | 'end') => {
    const currentTime = type === 'start' ? startTime : endTime;
    setTimePickerType(type);
    setTimePickerHours(currentTime?.hours || 0);
    setTimePickerMinutes(currentTime?.minutes || 0);
    setShowTimePickerModal(true);
  };

  // 時刻選択を確定
  const confirmTimePicker = () => {
    const selectedTime = { hours: timePickerHours, minutes: timePickerMinutes };
    if (timePickerType === 'start') {
      setStartTime(selectedTime);
    } else {
      setEndTime(selectedTime);
    }
    setShowTimePickerModal(false);
  };

  // 時刻をフォーマット（HH:MM形式）
  const formatTime = (time: { hours: number; minutes: number } | null): string => {
    if (!time) return '--:--';
    return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;
  };
  
  // 最新値を更新
  useEffect(() => {
    existingRecordingRef.current = existingRecording;
  }, [existingRecording]);
  
  useEffect(() => {
    isRecordingJustSavedRef.current = isRecordingJustSaved;
  }, [isRecordingJustSaved]);

  // 練習記録を読み込む（リポジトリを使用）
  const loadPracticeSessions = useCallback(async () => {
    if (!user || !selectedDate) {
      logger.debug('loadPracticeSessions: userまたはselectedDateが未設定', { 
        hasUser: !!user, 
        hasSelectedDate: !!selectedDate 
      });
      return;
    }

    try {
      const practiceDate = formatLocalDate(selectedDate);
      const instrumentId = getInstrumentId(selectedInstrument);
      
      logger.debug('loadPracticeSessions: 練習記録を取得開始', {
        userId: user.id,
        practiceDate,
        instrumentId,
        selectedInstrument
      });

      const { data: sessions, error } = await getPracticeSessionsByDate(
        user.id,
        practiceDate,
        instrumentId
      );

      logger.debug('loadPracticeSessions: 取得結果', {
        sessionsCount: sessions?.length || 0,
        sessions: sessions,
        error: error ? {
          message: error.message,
          code: (error as any)?.code,
          details: (error as any)?.details
        } : null
      });

      if (error) {
        // エラーログを出力（既存記録の読み込み失敗は致命的ではないが、ログは残す）
        logger.warn('loadPracticeSessions: 練習記録の取得に失敗', {
          error: error.message,
          code: (error as any)?.code,
          userId: user.id,
          practiceDate,
          instrumentId
        });
        // エラー時も既存の記録をクリア
        setExistingRecord(null);
        setTimerMinutes(0);
        setMinutes('');
        setContent('');
        setPracticeBreakdown([]);
        return;
      }

      if (sessions && sessions.length > 0) {
        // 基礎練（preset）を除外して、時間記録（manual, voice, timer）のみを取得
        const timeRecords = sessions.filter(s => s.input_method !== 'preset');
        
        // タイマー記録とその他の記録を分離
        const timerSessions = timeRecords.filter(s => s.input_method === 'timer');
        const otherSessions = timeRecords.filter(s => s.input_method !== 'timer');
        
        // タイマー記録の合計時間を計算
        const totalTimerMinutes = timerSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        setTimerMinutes(totalTimerMinutes);
        
        // 練習時間の内訳を計算（基礎練は既に除外済み）
        const breakdown: { [key: string]: number } = {};
        timeRecords.forEach(session => {
          const method = session.input_method || 'manual';
          const methodLabel = 
            method === 'timer' ? 'タイマー' :
            method === 'voice' ? 'クイック記録' :
            '手動入力';
          breakdown[methodLabel] = (breakdown[methodLabel] || 0) + (session.duration_minutes || 0);
        });
        
        const breakdownArray = Object.entries(breakdown)
          .map(([method, minutes]) => ({ method, minutes }))
          .sort((a, b) => b.minutes - a.minutes);
        logger.debug('練習時間の内訳:', breakdownArray);
        setPracticeBreakdown(breakdownArray);
        
        if (timeRecords.length > 0) {
          // 時間記録がある場合（タイマー、クイック、手動入力）
          // すべての時間記録の合計を計算
          const totalMinutes = timeRecords.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
          
          // 既存の記録を設定（合計時間を使用）
          // otherSessionsがある場合は最初のセッションのIDとcontentを使用
          const primarySession = otherSessions.length > 0 ? otherSessions[0] : timerSessions[0];
          
          // クイック記録、タイマー記録のcontentは表示しない
          // 手動入力（manual）のcontentのみを表示
          const manualSessions = timeRecords.filter(s => s.input_method === 'manual');
          const manualContent = manualSessions.length > 0 
            ? manualSessions.map(s => cleanContentFromTimeDetails(s.content)).filter(c => c && c.trim() !== '').join(', ')
            : null;
          
          setExistingRecord({
            id: primarySession.id!,
            minutes: totalMinutes, // すべての時間記録の合計
            content: manualContent || null // 手動入力のcontentのみ
          });
          
          // 既存の記録をフォームに設定（合計時間を表示）
          setMinutes(totalMinutes.toString());
          // 手動入力のcontentのみを表示（クイック記録、タイマー記録のcontentは表示しない）
          setContent(manualContent || '');
        } else {
          // 時間記録がない場合（基礎練のみ、または記録なし）
          setExistingRecord(null);
          setMinutes('');
          setContent('');
        }
      } else {
        logger.debug('loadPracticeSessions: セッションが見つかりませんでした', {
          practiceDate: formatLocalDate(selectedDate),
          instrumentId: getInstrumentId(selectedInstrument)
        });
        setExistingRecord(null);
        setTimerMinutes(0);
        // フォームをリセット
        setMinutes('');
        setContent('');
        // セッションがない場合でも、内訳は空にする
        setPracticeBreakdown([]);
      }
    } catch (error) {
      // エラーログを出力（練習記録の読み込み失敗は致命的ではないが、ログは残す）
      logger.error('loadPracticeSessions: 例外が発生しました', {
        error: error instanceof Error ? error.message : String(error),
        userId: user?.id,
        practiceDate: selectedDate ? formatLocalDate(selectedDate) : null,
        instrumentId: getInstrumentId(selectedInstrument)
      });
      // エラー時も既存の記録をクリア
      setExistingRecord(null);
      setTimerMinutes(0);
      setMinutes('');
      setContent('');
      setPracticeBreakdown([]);
    }
  }, [user, selectedDate, selectedInstrument]);

  // 録音記録を読み込む（簡素化）
  const loadRecording = useCallback(async (savedRecordingId?: string, currentExistingRecording?: typeof existingRecording, currentIsRecordingJustSaved?: boolean) => {
    if (!user || !selectedDate) return;

    try {
      const practiceDate = formatLocalDate(selectedDate);

      // 録音記録を取得（getRecordingsByDateを使用）
      // savedRecordingIdが指定されている場合は、データベース反映を待つためリトライする
      let recordings = null;
      let recordingError = null;
      
      if (savedRecordingId) {
        // 保存直後の場合は、データベース反映を待つため最大3回リトライ
        for (let attempt = 0; attempt < 3; attempt++) {
          const result = await getRecordingsByDate(
        user.id,
        practiceDate,
            getInstrumentId(selectedInstrument)
          );
          recordings = result.data;
          recordingError = result.error;
          
          if (!recordingError && recordings && recordings.length > 0) {
            // 指定されたIDの録音が見つかった場合は終了
            const found = recordings.find(r => r.id === savedRecordingId);
            if (found) {
              logger.debug(`録音記録を読み込みました（試行${attempt + 1}/3）:`, {
                id: found.id,
                savedRecordingId
              });
              break;
            }
          }
          
          // 最後の試行でない場合は待機
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } else {
        const result = await getRecordingsByDate(
          user.id,
          practiceDate,
          getInstrumentId(selectedInstrument)
        );
        recordings = result.data;
        recordingError = result.error;
      }

      if (recordingError) {
        // エラーは無視（既存録音の読み込み失敗は致命的ではない）
        // ただし、savedRecordingIdが指定されている場合は、existingRecordingを保持
        if (savedRecordingId && currentExistingRecording && currentExistingRecording.id === savedRecordingId) {
          logger.debug('録音記録の読み込みエラーですが、既存の録音状態を保持します:', {
            savedRecordingId,
            existingRecordingId: currentExistingRecording.id
          });
        }
        return;
      }

      if (recordings && recordings.length > 0) {
        // 最初の録音を使用（既に日付でフィルタリング済み）
        const matchingRecording = recordings[0];
        
        if (matchingRecording) {
          // 保存した録音IDが指定されている場合、そのIDを優先的に使用
          // または、既にexistingRecordingが設定されている場合（録音保存直後など）は、上書きしない
          // ただし、IDが一致する場合は更新する（データベースから最新情報を取得）
          const shouldUpdate = savedRecordingId 
            ? matchingRecording.id === savedRecordingId
            : (!currentExistingRecording || currentExistingRecording.id === matchingRecording.id);
          
          if (shouldUpdate) {
            setExistingRecording({
              id: matchingRecording.id,
              title: matchingRecording.title || '無題の録音',
              duration: matchingRecording.duration_seconds || 0
            });
            setAudioUrl('');
            logger.debug('録音記録を読み込みました:', {
              id: matchingRecording.id,
              savedRecordingId
            });
          } else if (savedRecordingId && currentExistingRecording && currentExistingRecording.id === savedRecordingId) {
            // savedRecordingIdが指定されているが、データベースから見つからない場合でも、
            // 既にexistingRecordingが設定されている場合は保持する
            logger.debug('録音記録が見つかりませんでしたが、既存の録音状態を保持します:', {
              savedRecordingId,
              existingRecordingId: currentExistingRecording.id,
              foundRecordingId: matchingRecording.id
            });
          }
        } else if (!savedRecordingId && !currentIsRecordingJustSaved) {
          // 日付が一致せず、保存直後でもない場合はクリア
          setExistingRecording(null);
          setAudioUrl('');
        }
      } else {
        // 録音が見つからない場合
        if (savedRecordingId && currentExistingRecording && currentExistingRecording.id === savedRecordingId) {
          // savedRecordingIdが指定されているが、データベースから見つからない場合でも、
          // 既にexistingRecordingが設定されている場合は保持する（データベース反映の遅延を考慮）
          logger.debug('録音記録が見つかりませんでしたが、既存の録音状態を保持します（データベース反映待ち）:', {
            savedRecordingId,
            existingRecordingId: currentExistingRecording.id
          });
        } else if (!savedRecordingId && !currentIsRecordingJustSaved) {
          // 保存直後でもなく、savedRecordingIdも指定されていない場合はクリア
          setExistingRecording(null);
          setAudioUrl('');
        }
      }
    } catch (error) {
      // エラーは無視（録音記録の読み込み失敗は致命的ではない）
      // ただし、savedRecordingIdが指定されている場合は、existingRecordingを保持
      if (savedRecordingId && currentExistingRecording && currentExistingRecording.id === savedRecordingId) {
        logger.debug('録音記録の読み込みエラーですが、既存の録音状態を保持します:', {
          savedRecordingId,
          existingRecordingId: currentExistingRecording.id,
          error
        });
      }
    }
  }, [user, selectedDate, selectedInstrument]);

  // 既存記録を読み込む（統合関数）
  // 注意: existingRecordingとisRecordingJustSavedは依存配列に含めない（無限ループを防ぐため）
  // 代わりに、useRefで最新の値を参照
  const loadExistingRecord = useCallback(async (savedRecordingId?: string) => {
    // useRefで最新の値を取得
    const currentExistingRecording = existingRecordingRef.current;
    const currentIsRecordingJustSaved = isRecordingJustSavedRef.current;
    await Promise.all([
      loadPracticeSessions(),
      loadRecording(savedRecordingId, currentExistingRecording, currentIsRecordingJustSaved)
    ]);
  }, [loadPracticeSessions, loadRecording]);

  // 選択された日付の練習記録を取得
  useEffect(() => {
    if (visible && selectedDate && !showAudioRecorder) {
      // 録音画面から戻ってきた場合
      if (formStateBeforeRecording) {
        // フォーム状態を復元
        setMinutes(formStateBeforeRecording.minutes);
        setContent(formStateBeforeRecording.content);
        // 録音状態も復元
        if (formStateBeforeRecording.existingRecording) {
          setExistingRecording(formStateBeforeRecording.existingRecording);
        }
        // フォーム状態をクリア
        setFormStateBeforeRecording(null);
        // 録音状態を保持してデータを再読み込み
        loadExistingRecord();
      } else {
        // 通常のモーダルオープン時はリセット
        setExistingRecord(null);
        setExistingRecording(null);
        setMinutes('');
        setContent('');
        setAudioUrl('');
        setVideoUrl('');
        setTimerMinutes(0);
        setIsRecordingJustSaved(false); // フラグをリセット
        // データを再読み込み（モーダルが開かれたときに必ず最新データを取得）
        loadExistingRecord();
      }
    }
  }, [visible, selectedDate, showAudioRecorder, loadExistingRecord, formStateBeforeRecording]);

  // 外部からのリフレッシュ要求を処理（クイック記録保存後など）
  useEffect(() => {
    if (visible && selectedDate && onRefresh !== undefined && onRefresh > 0) {
      logger.debug('PracticeRecordModal: 外部からのリフレッシュ要求を受信、データを再読み込みします', onRefresh);
      loadExistingRecord();
    }
  }, [visible, selectedDate, onRefresh, loadExistingRecord]);

  // Webプラットフォームでのフォーカス管理
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (visible) {
        disableBackgroundFocus();
      } else {
        enableBackgroundFocus();
      }
    }
    
    return () => {
      if (Platform.OS === 'web' && !visible) {
        enableBackgroundFocus();
      }
    };
  }, [visible]);


  // 録音のみを保存する関数（練習記録は保存しない）
  const handleAudioOnlySave = async () => {
    if (!audioUrl) {
      Alert.alert('エラー', '録音データがありません');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const recordedAt = selectedDate ? new Date(selectedDate) : new Date();

        // ブラウザのみ: Object URL から Blob を取得してアップロード
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const { path, error: uploadError } = await uploadRecordingBlob(user.id, blob, 'wav');
        if (uploadError || !path) throw uploadError || new Error('upload failed');

        // 録音データをデータベースに保存
        const { data: savedRecording, error: saveError } = await saveRecording({
          user_id: user.id,
          instrument_id: selectedInstrument || null, // 現在の楽器IDを追加
          title: audioTitle || '録音',
          memo: audioMemo || null,
          file_path: path,
          duration_seconds: audioDuration || null,
          is_favorite: isAudioFavorite,
          recorded_at: recordedAt.toISOString(),
        });

        if (saveError) {
          throw saveError;
        }

        // 保存成功時に即座に状態を更新（録音済みを表示するため）
        if (savedRecording) {
          const recordingState = {
            id: savedRecording.id,
            title: audioTitle || '録音',
            duration: audioDuration || 0
          };
          // 即座にexistingRecordingを設定してUIに反映
          setExistingRecording(recordingState);
          setIsRecordingJustSaved(true); // 録音保存直後フラグを設定
          
          // 録音済み情報を表示するため、一時的な録音データはクリア
          // 録音済み表示条件: existingRecording && !audioUrl && !videoUrl
          setAudioUrl(''); // 録音済みとして表示するため、一時的なURLをクリア
          setVideoUrl(''); // 動画URLもクリア
          
          logger.debug('録音情報を即座に状態に設定しました（録音済み状態を表示）:', {
            recordingState,
            audioUrl: '',
            videoUrl: '',
            willShow: true
          });
          setAudioTitle('');
          setAudioMemo('');
          setIsAudioFavorite(false);
          setAudioDuration(0);
          
          // 録音保存後、フォーム状態を復元（録音前に入力していた情報を保持）
          if (formStateBeforeRecording) {
            logger.debug('録音保存後（handleAudioOnlySave）、フォーム状態を復元します', {
              minutes: formStateBeforeRecording.minutes,
              content: formStateBeforeRecording.content ? 'あり' : 'なし'
            });
            setMinutes(formStateBeforeRecording.minutes);
            setContent(formStateBeforeRecording.content);
            // フォーム状態をクリア（復元済み）
            setFormStateBeforeRecording(null);
          }
          
          // コールバックを呼び出す（カレンダーデータの更新はコールバック側で処理）
          onRecordingSaved?.();
          
      // 録音保存後、データを再取得（データベース反映を待つため少し遅延）
          if (visible && selectedDate) {
        // データベース反映を待つため、少し遅延してから読み込む
        // loadExistingRecordは既にloadRecordingを含んでいるので、loadRecordingを個別に呼ぶ必要はない
        setTimeout(async () => {
          // フォーム状態を一時保存（loadExistingRecordで上書きされる可能性があるため）
          const savedMinutes = formStateBeforeRecording?.minutes || minutes;
          const savedContent = formStateBeforeRecording?.content || content;
          
          await loadExistingRecord(savedRecording.id);
          
          // 読み込み後にフォーム状態を復元（既存記録で上書きされた場合でも、ユーザーが入力した情報を優先）
          if (savedMinutes || savedContent) {
            logger.debug('loadExistingRecord後（handleAudioOnlySave）、フォーム状態を復元します', {
              minutes: savedMinutes,
              content: savedContent ? 'あり' : 'なし'
            });
            if (savedMinutes) setMinutes(savedMinutes);
            if (savedContent) setContent(savedContent);
          }
          
          // 読み込み完了後にフラグをリセット
          setIsRecordingJustSaved(false);
        }, 500);
      } else {
        setIsRecordingJustSaved(false);
          }
        } else {
          // 保存に失敗した場合は、フォームをリセットしない
          logger.warn('録音保存は成功しましたが、savedRecordingがnullです');
        }
        
        Alert.alert('保存完了', '録音を保存しました');
      }
    } catch (e) {
      Alert.alert('エラー', '録音の保存に失敗しました');
      logger.error('録音保存エラー:', e);
    }
  };

  const handleAudioSave = async (audioData: {
    title: string;
    memo: string;
    isFavorite: boolean;
    duration: number;
    audioUrl: string;
    recordingId?: string;
  }) => {
    // 録音保存後、existingRecordingの状態を更新して録音情報を表示
    if (audioData.recordingId) {
      // 録音が保存された場合は、即座に状態を直接更新してUIに反映
      setExistingRecording({
        id: audioData.recordingId,
        title: audioData.title,
        duration: audioData.duration
      });
      setIsRecordingJustSaved(true); // 録音保存直後フラグを設定
      // 録音済み情報を表示するため、一時的な録音データはクリア
      // 録音済み表示条件: existingRecording && !audioUrl && !videoUrl
      setAudioUrl(''); // 録音済みとして表示するため、一時的なURLをクリア
      setVideoUrl(''); // 動画URLもクリア
      
      // 録音保存後、フォーム状態を復元（録音前に入力していた情報を保持）
      if (formStateBeforeRecording) {
        logger.debug('録音保存後、フォーム状態を復元します', {
          minutes: formStateBeforeRecording.minutes,
          content: formStateBeforeRecording.content ? 'あり' : 'なし'
        });
        setMinutes(formStateBeforeRecording.minutes);
        setContent(formStateBeforeRecording.content);
        // フォーム状態をクリア（復元済み）
        setFormStateBeforeRecording(null);
      }
      
      setAudioTitle('');
      setAudioMemo('');
      setIsAudioFavorite(false);
      setAudioDuration(0);
      
      logger.debug('録音情報を即座に状態に設定しました（録音済み状態を表示）:', {
        id: audioData.recordingId,
        title: audioData.title,
        duration: audioData.duration,
        audioUrl: '',
        videoUrl: '',
        willShow: true
      });
      
      // 録音保存後、データを再取得（データベース反映を待つため少し遅延）
      if (visible && selectedDate) {
        // データベース反映を待つため、少し遅延してから読み込む
        // loadExistingRecordは既にloadRecordingを含んでいるので、loadRecordingを個別に呼ぶ必要はない
        setTimeout(async () => {
          // フォーム状態を一時保存（loadExistingRecordで上書きされる可能性があるため）
          const savedMinutes = formStateBeforeRecording?.minutes || minutes;
          const savedContent = formStateBeforeRecording?.content || content;
          
          await loadExistingRecord(audioData.recordingId);
          
          // 読み込み後にフォーム状態を復元（既存記録で上書きされた場合でも、ユーザーが入力した情報を優先）
          if (savedMinutes || savedContent) {
            logger.debug('loadExistingRecord後、フォーム状態を復元します', {
              minutes: savedMinutes,
              content: savedContent ? 'あり' : 'なし'
            });
            if (savedMinutes) setMinutes(savedMinutes);
            if (savedContent) setContent(savedContent);
          }
          
          // 読み込み完了後にフラグをリセット
          setIsRecordingJustSaved(false);
        }, 500);
      } else {
        setIsRecordingJustSaved(false);
      }
    } else {
      // 録音IDがない場合（保存前の状態）は、録音情報を表示
      setAudioTitle(audioData.title);
      setAudioMemo(audioData.memo);
      setIsAudioFavorite(audioData.isFavorite);
      setAudioDuration(audioData.duration);
      setAudioUrl(audioData.audioUrl);
    }
    
    setVideoUrl(''); // 録音されたら動画URLをクリア
    setShowAudioRecorder(false);
    
    // コールバックを呼び出してデータを更新
    onRecordingSaved?.();
  };

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    if (url.trim()) {
      setAudioUrl(''); // 動画URLが入力されたら録音をクリア
      setAudioTitle('');
      setAudioMemo('');
      setIsAudioFavorite(false);
      setAudioDuration(0);
    }
  };

  const extractYouTubeId = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) {
        return u.searchParams.get('v');
      }
      if (u.hostname === 'youtu.be') {
        return u.pathname.replace('/', '');
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSaveRecord = async () => {
    const minutesNumber = Number(minutes);
    if (!selectedDate) {
      Alert.alert('エラー', '日付が選択されていません');
      return;
    }
    if (Number.isNaN(minutesNumber) || minutesNumber <= 0) {
      Alert.alert('エラー', '練習時間（分）を正しく入力してください');
      return;
    }
    
    try {
      // タイマー時間を加算した合計時間を計算
      const totalMinutes = minutesNumber + timerMinutes;
      
      // 録音や動画があるかチェック
      const hasMedia = !!(audioUrl || videoUrl);
      
      // 保存処理を実行（完了を待つ）
      await onSave?.(minutesNumber, content?.trim() || undefined, audioUrl || undefined, videoUrl || undefined);
      
      // 保存完了後にカレンダーと統計を更新するイベントを発火
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('practiceRecordUpdated', {
          detail: { 
            action: 'practice_saved',
            minutes: minutesNumber,
            content: content?.trim(),
            date: selectedDate ? formatLocalDate(selectedDate) : new Date().toISOString().split('T')[0],
            verified: true
          }
        });
        window.dispatchEvent(event);
        logger.debug('練習記録保存の即時反映イベントを発火:', { minutes: minutesNumber });
      }
      
      // 録音や動画がある場合のみコールバックを呼び出す
      if (hasMedia) {
        onRecordingSaved?.();
      }
      
      // 保存が完了したらモーダルを閉じる
      onClose();
    } catch (error) {
      Alert.alert('エラー', '練習記録の保存に失敗しました');
      // エラーが発生した場合もモーダルを閉じる（ユーザーにエラーが通知される）
      onClose();
    }
  };

  const handleDeleteRecord = () => {
    logger.debug('削除ボタンが押されました', {
      existingRecord: !!existingRecord,
      existingRecording: !!existingRecording,
      existingRecordId: existingRecord?.id,
      existingRecordingId: existingRecording?.id
    });
    
    // 削除可能な項目を確認
    const canDeletePractice = !!existingRecord;
    const canDeleteRecording = !!existingRecording;

    if (!canDeletePractice && !canDeleteRecording) {
      Alert.alert('情報', '削除できる項目がありません');
      return;
    }

    logger.debug('削除モーダルを表示します', {
      canDeletePractice,
      canDeleteRecording,
      canDeleteBoth: canDeletePractice && canDeleteRecording
    });

    // 削除選択モーダルを表示
    setShowDeleteModal(true);
  };

  const deletePracticeSessionOnly = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        return;
      }

      const practiceDate = formatLocalDate(selectedDate!);
      
      // その日のすべての練習セッションを取得
      let query = supabase
        .from('practice_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('practice_date', practiceDate);
      
      if (selectedInstrument) {
        query = query.eq('instrument_id', selectedInstrument);
      } else {
        query = query.is('instrument_id', null);
      }
      
      const { data: sessions, error: fetchError } = await query;
      
      if (fetchError) {
        Alert.alert('エラー', '練習記録の取得に失敗しました');
        return;
      }
      
      if (!sessions || sessions.length === 0) {
        Alert.alert('情報', '削除する練習記録がありません');
        return;
      }
      
      // すべてのセッションIDを削除（時間詳細も含めてすべて削除）
      const sessionIds = sessions.map(s => s.id);
      const { error } = await supabase
        .from('practice_sessions')
        .delete()
        .in('id', sessionIds);
      
      if (error) {
        Alert.alert('エラー', '練習記録の削除に失敗しました');
        return;
      }

      // ローカル状態をリセット
      setExistingRecord(null);
      setMinutes('');
      setContent('');
      setTimerMinutes(0);
      setPracticeBreakdown([]);

      // コールバックを呼び出してデータを更新
      onRecordingSaved?.();
      
      Alert.alert('削除完了', '練習記録を削除しました', [
        { text: 'OK', onPress: () => onClose() }
      ]);
    } catch (error) {
      console.error('Error deleting practice record:', error);
      Alert.alert('エラー', '練習記録の削除に失敗しました');
    }
  };

  const deleteRecordingOnly = async () => {
    try {
      if (!existingRecording) {
        Alert.alert('情報', '削除できる演奏録音がありません');
        return;
      }

      const { error } = await deleteRecording(existingRecording.id);
      if (error) {
        Alert.alert('エラー', '演奏録音の削除に失敗しました');
        return;
      }

      // ローカル状態をリセット
      setAudioUrl('');
      setExistingRecording(null);
      setAudioTitle('');
      setAudioMemo('');
      setIsAudioFavorite(false);
      setAudioDuration(0);

      // コールバックを呼び出してデータを更新
      onRecordingSaved?.();

      Alert.alert('削除完了', '演奏録音を削除しました', [
        { text: 'OK', onPress: () => {
          // 他の記録がない場合はモーダルを閉じる
          if (!existingRecord) {
            onClose();
          }
        }}
      ]);
    } catch (error) {
      console.error('Error deleting recording:', error);
      Alert.alert('エラー', '演奏録音の削除に失敗しました');
    }
  };

  const deleteBoth = async () => {
    Alert.alert(
      '完全削除の確認',
      '練習記録と演奏録音の両方を削除しますか？この操作は取り消すことができません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: async () => {
          try {
            logger.debug('両方削除を開始します');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              Alert.alert('エラー', 'ログインが必要です');
              return;
            }

            const practiceDate = formatLocalDate(selectedDate!);
            let practiceDeleteSuccess = false;
            let recordingDeleteSuccess = false;
            let practiceDeleteError: any = null;
            let recordingDeleteError: any = null;
            
            // その日のすべての練習セッションを取得
            let query = supabase
              .from('practice_sessions')
              .select('id')
              .eq('user_id', user.id)
              .eq('practice_date', practiceDate);
            
            if (selectedInstrument) {
              query = query.eq('instrument_id', selectedInstrument);
            } else {
              query = query.is('instrument_id', null);
            }
            
            const { data: sessions, error: fetchError } = await query;
            
            if (fetchError) {
              logger.error('練習記録の取得エラー:', fetchError);
              Alert.alert('エラー', '練習記録の取得に失敗しました');
              return;
            }
            
            // すべてのセッションIDを削除（時間詳細も含めてすべて削除）
            if (sessions && sessions.length > 0) {
              const sessionIds = sessions.map(s => s.id);
              logger.debug('練習セッションを削除します:', sessionIds);
              const { error } = await supabase
                .from('practice_sessions')
                .delete()
                .in('id', sessionIds);
              
              if (error) {
                logger.error('練習記録の削除エラー:', error);
                practiceDeleteError = error;
              } else {
                practiceDeleteSuccess = true;
                logger.debug('練習記録の削除に成功しました');
              }
            } else {
              // 削除する練習記録がない場合も成功とみなす
              practiceDeleteSuccess = true;
              logger.debug('削除する練習記録がありません');
            }

            // 録音ファイルも削除
            if (existingRecording) {
              logger.debug('録音を削除します:', existingRecording.id);
              const { error: recordingError } = await deleteRecording(existingRecording.id);
              if (recordingError) {
                logger.error('録音の削除エラー:', recordingError);
                recordingDeleteError = recordingError;
              } else {
                recordingDeleteSuccess = true;
                logger.debug('録音の削除に成功しました');
                setAudioUrl('');
                setExistingRecording(null);
              }
            } else {
              // 削除する録音がない場合も成功とみなす
              recordingDeleteSuccess = true;
              logger.debug('削除する録音がありません');
            }

            // エラーが発生した場合の処理
            if (practiceDeleteError || recordingDeleteError) {
              let errorMessage = '削除処理中にエラーが発生しました:\n';
              if (practiceDeleteError) {
                errorMessage += '・練習記録の削除に失敗\n';
              }
              if (recordingDeleteError) {
                errorMessage += '・録音の削除に失敗\n';
              }
              
              // 部分的に成功した場合は、成功した部分の状態を更新
              if (practiceDeleteSuccess) {
                setExistingRecord(null);
                setMinutes('');
                setContent('');
                setTimerMinutes(0);
                setPracticeBreakdown([]);
              }
              
              Alert.alert('削除エラー', errorMessage);
              return;
            }

            // すべて成功した場合
            // ローカル状態をリセット
            setExistingRecord(null);
            setMinutes('');
            setContent('');
            setVideoUrl('');
            setTimerMinutes(0);
            setPracticeBreakdown([]);

            // コールバックを呼び出してデータを更新
            onRecordingSaved?.();

            logger.debug('両方削除が完了しました');
            Alert.alert('削除完了', '練習記録と演奏録音を削除しました', [
              { text: 'OK', onPress: () => onClose() }
            ]);
          } catch (error) {
            logger.error('両方削除処理エラー:', error);
            Alert.alert('エラー', '削除処理に失敗しました');
          }
        }}
      ]
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View 
        style={styles.container}
        {...(Platform.OS === 'web' ? { 
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': 'practice-record-modal-title',
          'data-modal-content': true
        } : {})}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666666" />
          </TouchableOpacity>
          <Text 
            id="practice-record-modal-title"
            style={styles.title}
          >
            練習記録
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>

          {/* 既存の記録がある場合の表示 */}
          {existingRecord && (
            <View style={styles.existingRecordContainer}>
              <Text style={styles.existingRecordTitle}>既存の記録</Text>
              <View style={styles.existingRecordContent}>
                <Text style={styles.existingRecordText}>
                  練習時間: <Text style={styles.existingRecordHighlight}>{formatMinutesToHours(existingRecord.minutes)}</Text>
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.inputGroup, { marginTop: -16 }]}>
            <Text style={styles.label}>
              練習時間
              {existingRecord && (
                <Text style={[styles.timerIndicator, { color: '#1976D2' }]}>
                  {' '}(既存: {formatMinutesToHours(existingRecord.minutes)} +)
                </Text>
              )}
              {timerMinutes > 0 && (
                <Text style={[styles.timerIndicator, { color: '#4CAF50' }]}>
                  {' '}(タイマー: {formatMinutesToHours(timerMinutes)})
                </Text>
              )}
            </Text>
            
            {/* 練習時間入力（開始時刻・終了時刻） */}
            <View style={styles.customTimeInputContainer}>
              <Text style={[styles.customTimeLabel, { color: currentTheme.text }]}>
                練習時間を入力
              </Text>
              
              {/* 開始時刻・終了時刻ボタン */}
              <View style={styles.timeRangeContainer}>
                <TouchableOpacity
                  style={[
                    styles.timeButtonRow,
                    {
                      backgroundColor: '#FFFFFF',
                      borderBottomColor: currentTheme.secondary,
                    }
                  ]}
                  onPress={() => openTimePicker('start')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeButtonLabel, { color: currentTheme.textSecondary }]}>
                    開始日時
                  </Text>
                  <Text style={[styles.timeButtonValue, { color: currentTheme.text }]}>
                    {formatTime(startTime)}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.timeButtonRow,
                    styles.timeButtonRowLast,
                    {
                      backgroundColor: '#FFFFFF',
                    }
                  ]}
                  onPress={() => openTimePicker('end')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeButtonLabel, { color: currentTheme.textSecondary }]}>
                    終了日時
                  </Text>
                  <Text style={[styles.timeButtonValue, { color: currentTheme.text }]}>
                    {formatTime(endTime)}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* 計算された練習時間の表示 */}
              {(() => {
                const totalMinutes = minutes ? Number(minutes) : 0;
                if (totalMinutes > 0 && !isNaN(totalMinutes) && startTime && endTime) {
                  return (
                    <Text style={[styles.customTimeDisplay, { color: currentTheme.primary }]}>
                      練習時間: {formatMinutesToHours(totalMinutes)}
                    </Text>
                  );
                }
                return null;
              })()}
            </View>
            
            <Text style={styles.hintText}>
              {existingRecord 
                ? '開始時刻と終了時刻を選択してください（+は既存の記録に追加されます）'
                : '開始時刻と終了時刻を選択してください'
              }
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>練習内容</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="今日の練習内容を記録..."
              multiline
              numberOfLines={4}
            />
          </View>

          {/* 演奏記録（録音・動画） */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {selectedDate && formatLocalDate(selectedDate) === formatLocalDate(new Date())
                ? '今日の演奏記録'
                : '演奏記録'}
            </Text>
            
            {/* 録音済み情報がある場合：一つの枠に統合 */}
            {existingRecording && !audioUrl && !videoUrl ? (
              <View style={styles.existingRecordingContainer}>
                <View style={styles.recordingInfoHeader}>
                  <Mic size={16} color="#8B4513" />
                  <Text style={styles.existingRecordingText}>
                    録音済み: {existingRecording.title}
                  </Text>
                </View>
                <Text style={styles.recordingDurationText}>
                  録音時間: {Math.floor(existingRecording.duration / 60)}分{existingRecording.duration % 60}秒
                </Text>
                <TouchableOpacity
                  style={styles.rerecordButtonInExisting}
                  onPress={() => {
                    // 録音画面に移動する前に、現在のフォーム状態と録音状態を保存
                    setFormStateBeforeRecording({
                      minutes: minutes,
                      content: content,
                      existingRecording: existingRecording
                    });
                    setShowAudioRecorder(true);
                  }}
                >
                  <Text style={styles.rerecordButtonText}>再録音</Text>
                </TouchableOpacity>
              </View>
            ) : audioUrl && !existingRecording ? (
              // 新しく録音したがまだ保存していない場合
              <View style={styles.audioInfo}>
                <View style={styles.audioHeader}>
                  <Mic size={20} color="#8B4513" />
                  <Text style={styles.audioTitle}>{audioTitle}</Text>
                  {isAudioFavorite && <Text style={styles.favoriteStar}>⭐</Text>}
                </View>
                {audioMemo && <Text style={styles.audioMemo}>{audioMemo}</Text>}
                <Text style={styles.audioDuration}>録音時間: {Math.floor(audioDuration / 60)}分{audioDuration % 60}秒</Text>
                <View style={styles.audioButtons}>
                  <TouchableOpacity
                    style={styles.audioSaveButton}
                    onPress={handleAudioOnlySave}
                  >
                    <Save size={16} color="#FFFFFF" />
                    <Text style={styles.audioSaveButtonText}>録音保存</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rerecordButton}
                    onPress={() => {
                      // 録音画面に移動する前に、現在のフォーム状態と録音状態を保存
                      setFormStateBeforeRecording({
                        minutes: minutes,
                        content: content,
                        existingRecording: existingRecording
                      });
                      setShowAudioRecorder(true);
                    }}
                  >
                    <Text style={styles.rerecordButtonText}>再録音</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : videoUrl ? (
              // 動画URLが入力されている場合
              <View style={styles.videoInfo}>
                <View style={styles.videoHeader}>
                  <Video size={20} color="#8B4513" />
                  <Text style={styles.videoUrlText} numberOfLines={2}>
                    {videoUrl}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeVideoButton}
                  onPress={() => setVideoUrl('')}
                >
                  <Text style={styles.changeVideoButtonText}>URLを変更</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // 録音済み情報がない場合：録音ボタンと動画URL入力
              <View style={styles.mediaSelectionContainer}>
                <TouchableOpacity
                  style={styles.mediaOptionButton}
                  onPress={() => {
                    // 録音画面に移動する前に、現在のフォーム状態と録音状態を保存
                    setFormStateBeforeRecording({
                      minutes: minutes,
                      content: content,
                      existingRecording: existingRecording
                    });
                    setShowAudioRecorder(true);
                  }}
                >
                  <Mic size={24} color="#8B4513" />
                  <Text style={styles.mediaOptionText}>録音で記録</Text>
                  <Text style={styles.mediaOptionSubtext}>音声を録音して保存</Text>
                </TouchableOpacity>
                
                <View style={styles.mediaDivider}>
                  <Text style={styles.dividerText}>または</Text>
                </View>
                
                <View style={styles.videoInputContainer}>
                  <TextInput
                    style={[styles.input, styles.videoInput]}
                    value={videoUrl}
                    onChangeText={handleVideoUrlChange}
                    placeholder="YouTube、Instagram等の動画URLを入力..."
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.hintText}>
                    動画URLを入力して記録
                  </Text>
                </View>
              </View>
            )}
            
            {/* 練習時間詳細（今日の演奏記録の下に表示） */}
            {practiceBreakdown.length > 0 && (
              <View style={styles.practiceTimeDetailContainer}>
                <Text style={styles.practiceTimeDetailTitle}>練習時間詳細</Text>
                <View style={styles.breakdownContainer}>
                  {practiceBreakdown.map((item, index) => (
                    <View key={index} style={styles.breakdownItem}>
                      <Text style={styles.breakdownMethod}>{item.method}</Text>
                      <Text style={styles.breakdownMinutes}>{formatMinutesToHours(item.minutes)}</Text>
                    </View>
                  ))}
                  <View style={styles.breakdownTotal}>
                    <Text style={styles.breakdownTotalLabel}>合計</Text>
                    <Text style={styles.breakdownTotalMinutes}>
                      {formatMinutesToHours(practiceBreakdown.reduce((sum, item) => sum + item.minutes, 0))}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 末尾スペーサー（フッター保存ボタン分） */}
          <View style={{ height: 12 }} />
        </ScrollView>
        {/* 下部の保存ボタンと削除ボタン */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primarySaveButton, (!minutes || Number(minutes) <= 0) && { opacity: 0.6 }]}
            onPress={handleSaveRecord}
            disabled={!minutes || Number(minutes) <= 0}
            activeOpacity={0.8}
          >
            <Save size={18} color="#FFFFFF" />
            <Text style={styles.primarySaveButtonText}>保存</Text>
          </TouchableOpacity>
          
          {/* 削除ボタン（既存の記録または録音がある場合のみ表示） */}
          {useMemo(() => {
            const shouldShow = !!(existingRecord || existingRecording);
            logger.debug('削除ボタン表示条件:', {
              existingRecord: !!existingRecord,
              existingRecording: !!existingRecording,
              shouldShow
            });
            return shouldShow;
          }, [existingRecord, existingRecording]) && (
            <TouchableOpacity
              style={styles.deleteButtonFooter}
              onPress={handleDeleteRecord}
              activeOpacity={0.8}
            >
              <Trash2 size={18} color="#FFFFFF" />
              <Text style={styles.deleteButtonFooterText}>削除</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 録音・再生モーダル（全画面表示） */}
      <Modal
        visible={showAudioRecorder}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAudioRecorder(false)}
      >
        <AudioRecorder
          visible={showAudioRecorder}
          onSave={handleAudioSave}
          onClose={() => {
            setShowAudioRecorder(false);
            // 録音画面を閉じたときに、保存されたフォーム状態と録音状態を復元
            if (formStateBeforeRecording) {
              setMinutes(formStateBeforeRecording.minutes);
              setContent(formStateBeforeRecording.content);
              if (formStateBeforeRecording.existingRecording) {
                setExistingRecording(formStateBeforeRecording.existingRecording);
              }
              setFormStateBeforeRecording(null);
            }
          }}
          onBack={() => {
            setShowAudioRecorder(false);
            // 録音画面から戻ったときに、保存されたフォーム状態と録音状態を復元
            if (formStateBeforeRecording) {
              setMinutes(formStateBeforeRecording.minutes);
              setContent(formStateBeforeRecording.content);
              if (formStateBeforeRecording.existingRecording) {
                setExistingRecording(formStateBeforeRecording.existingRecording);
              }
              setFormStateBeforeRecording(null);
            }
          }}
          onRecordingSaved={onRecordingSaved}
          selectedDate={selectedDate}
        />
      </Modal>

      {/* 時刻選択モーダル */}
      <Modal
        visible={showTimePickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View style={styles.timePickerModalOverlay}>
          <View style={[styles.timePickerModalContent, { backgroundColor: currentTheme.background }]}>
            <View style={styles.timePickerModalHeader}>
              <Text style={[styles.timePickerModalTitle, { color: currentTheme.text }]}>
                {timePickerType === 'start' ? '開始時刻' : '終了時刻'}を選択
              </Text>
              <TouchableOpacity
                onPress={() => setShowTimePickerModal(false)}
                style={styles.timePickerModalCloseButton}
              >
                <X size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.timePickerWheelContainer}>
              {/* 時間ドラムロール */}
              <View style={styles.timePickerWheelGroup}>
                <Text style={[styles.timePickerWheelLabel, { color: currentTheme.textSecondary }]}>
                  時間
                </Text>
                <WheelPicker
                  value={timePickerHours}
                  onChange={setTimePickerHours}
                  max={23}
                  highlightColor={currentTheme.primary}
                />
              </View>
              
              {/* 分ドラムロール */}
              <View style={styles.timePickerWheelGroup}>
                <Text style={[styles.timePickerWheelLabel, { color: currentTheme.textSecondary }]}>
                  分
                </Text>
                <WheelPicker
                  value={timePickerMinutes}
                  onChange={setTimePickerMinutes}
                  max={59}
                  highlightColor={currentTheme.primary}
                />
              </View>
            </View>
            
            <View style={styles.timePickerModalButtons}>
              <TouchableOpacity
                style={[styles.timePickerModalButton, styles.timePickerModalButtonCancel]}
                onPress={() => setShowTimePickerModal(false)}
              >
                <Text style={[styles.timePickerModalButtonText, { color: currentTheme.text }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timePickerModalButton, { backgroundColor: currentTheme.primary }]}
                onPress={confirmTimePicker}
              >
                <Text style={[styles.timePickerModalButtonText, { color: '#FFFFFF' }]}>
                  確定
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 削除選択モーダル */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>削除する項目を選択</Text>
            <Text style={styles.deleteModalMessage}>削除したい項目を選択してください。</Text>
            
            <View style={styles.deleteModalButtons}>
              {existingRecord && (
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteModalButtonDestructive]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    deletePracticeSessionOnly();
                  }}
                >
                  <Text style={styles.deleteModalButtonText}>練習時間のみ削除</Text>
                </TouchableOpacity>
              )}
              
              {existingRecording && (
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteModalButtonDestructive]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    deleteRecordingOnly();
                  }}
                >
                  <Text style={styles.deleteModalButtonText}>録音のみ削除</Text>
                </TouchableOpacity>
              )}
              
              {existingRecord && existingRecording && (
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteModalButtonDestructive]}
                  onPress={() => {
                    logger.debug('両方削除ボタンが押されました', {
                      existingRecord: !!existingRecord,
                      existingRecording: !!existingRecording
                    });
                    setShowDeleteModal(false);
                    deleteBoth();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteModalButtonText}>両方削除</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.deleteModalButtonText, styles.deleteModalButtonCancelText]}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#555555',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerSpacer: {
    width: 8,
  },
  deleteButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButtonHeader: {
    padding: 6,
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    marginRight: 8,
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  primarySaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  primarySaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  practiceContentGroup: {
    marginBottom: 12,
    marginTop: -8,
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
    color: '#555555',
    marginBottom: 4,
  },
  input: {
    borderWidth: 0.5,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  timeSelectionContainer: {
    marginBottom: 8,
  },
  timeButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#D0D0D0',
  },
  timeButtonActive: {
    backgroundColor: '#E8E8E8',
    borderColor: '#B0B0B0',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
  },
  timeButtonTextActive: {
    color: '#444444',
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
    textAlign: 'center',
  },
  customTimeInputContainer: {
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  customTimeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  customTimeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 8,
  },
  customTimeInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  customTimeInput: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  customTimeUnit: {
    fontSize: 14,
    fontWeight: '400',
    minWidth: 30,
  },
  customTimeDisplay: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  mediaSelectionContainer: {
    marginBottom: 12,
  },
  mediaOptionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 0.5,
    borderColor: '#D0D0D0',
  },
  mediaOptionButtonSecondary: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  mediaOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555555',
  },
  mediaOptionTextSecondary: {
    color: '#666666',
  },
  mediaOptionSubtext: {
    fontSize: 12,
    color: '#777777',
  },
  mediaOptionSubtextSecondary: {
    color: '#999999',
  },
  mediaDivider: {
    marginVertical: 12,
    alignItems: 'center',
  },
  dividerText: {
    fontSize: 14,
    color: '#888888',
  },
  audioInfo: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#D0D0D0',
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555555',
    flex: 1,
  },
  favoriteStar: {
    fontSize: 16,
  },
  audioMemo: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  audioDuration: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
    marginBottom: 10,
  },
  rerecordButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  rerecordButtonText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '400',
  },
  videoInputContainer: {
    marginTop: 6,
  },
  videoInput: {
    borderWidth: 0.5,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 40,
  },
  videoInfo: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#D0D0D0',
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  videoUrlText: {
    fontSize: 14,
    color: '#777777',
    flex: 1,
    marginLeft: 8,
  },
  changeVideoButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  changeVideoButtonText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '400',
  },
  audioButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  audioSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  audioSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  existingRecordContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  existingRecordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  existingRecordContent: {
    gap: 6,
  },
  existingRecordText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  existingRecordHighlight: {
    fontWeight: '600',
    color: '#1976D2',
  },
  existingRecordingContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C8',
  },
  rerecordButtonInExisting: {
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  recordingInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  existingRecordingText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  recordingDurationText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 22,
  },
  timerIndicator: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButtonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4444',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  deleteButtonFooterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  deleteModalButtons: {
    gap: 12,
  },
  deleteModalButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteModalButtonDestructive: {
    backgroundColor: '#FF4444',
  },
  deleteModalButtonCancel: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deleteModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteModalButtonCancelText: {
    color: '#333333',
  },
  breakdownContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#D0D0D0',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  breakdownMethod: {
    fontSize: 14,
    color: '#555555',
    flex: 1,
  },
  breakdownMinutes: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  breakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#D0D0D0',
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  breakdownTotalMinutes: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2',
  },
  practiceTimeDetailContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  practiceTimeDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 12,
  },
  timeRangeContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  timeButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  timeButtonRowLast: {
    borderBottomWidth: 0,
  },
  timeButtonLabel: {
    fontSize: 14,
    color: '#666666',
  },
  timeButtonValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timePickerModalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  timePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  timePickerModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  timePickerModalCloseButton: {
    padding: 4,
  },
  timePickerWheelContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 32,
    marginBottom: 24,
    paddingVertical: 16,
  },
  timePickerWheelGroup: {
    alignItems: 'center',
    gap: 12,
  },
  timePickerWheelLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timePickerModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  timePickerModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerModalButtonCancel: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timePickerModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PracticeRecordModal;