import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { X, Save, Mic, Video, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AudioRecorder from './AudioRecorder';
import { supabase } from '@/lib/supabase';
import { formatLocalDate, formatMinutesToHours } from '@/lib/dateUtils';
import { uploadRecordingBlob, saveRecording, deletePracticeSession, deleteRecording, getRecordingsByDate } from '@/lib/database';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

interface PracticeRecordModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSave?: (minutes: number, content?: string, audioUrl?: string, videoUrl?: string) => void | Promise<void>;
  onRecordingSaved?: () => void; // 録音保存後のコールバック
}

export default function PracticeRecordModal({ 
  visible, 
  onClose, 
  selectedDate,
  onSave,
  onRecordingSaved
}: PracticeRecordModalProps) {
  const router = useRouter();
  const { selectedInstrument } = useInstrumentTheme();
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

  // 既存の練習記録を読み込む
  const loadExistingRecord = useCallback(async (preserveExistingRecording = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const practiceDate = formatLocalDate(selectedDate!);
      
      const { data: sessions, error } = await supabase
        .from('practice_sessions')
        .select('id, duration_minutes, content, input_method')
        .eq('user_id', user.id)
        .eq('practice_date', practiceDate)
        .order('created_at', { ascending: false });
      
      logger.debug('読み込んだ練習セッション:', sessions);

      if (error) {
        ErrorHandler.handle(error, '既存記録の読み込み', false);
        return;
      }

      if (sessions && sessions.length > 0) {
        // タイマー記録とその他の記録を分離
        const timerSessions = sessions.filter(s => s.input_method === 'timer');
        const otherSessions = sessions.filter(s => s.input_method !== 'timer');
        
        // タイマー記録の合計時間を計算
        const totalTimerMinutes = timerSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
        setTimerMinutes(totalTimerMinutes);
        
        // 練習時間の内訳を計算（基礎練は時間を追加しないため除外）
        const breakdown: { [key: string]: number } = {};
        sessions.forEach(session => {
          const method = session.input_method || 'manual';
          // 基礎練（preset）は時間を追加しないため、内訳から除外
          if (method === 'preset') {
            return;
          }
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
        
        if (otherSessions.length > 0) {
          // その他の記録がある場合
          const session = otherSessions[0];
          setExistingRecord({
            id: session.id,
            minutes: session.duration_minutes,
            content: session.content
          });
          
          // 既存の記録をフォームに設定
          setMinutes(session.duration_minutes.toString());
          if (session.content) {
            // contentから時間詳細（経由情報）を削除して設定
            const cleanedContent = session.content
              .replace(/\s*\(累計\d+分\)/g, '')
              .replace(/\s*累計\d+分/g, '')
              .replace(/\s*\+\s*[^,]+?\d+分/g, '')
              .replace(/\s*[^,]+?\d+分/g, '')
              .replace(/練習記録/g, '')
              .replace(/^[\s,]+|[\s,]+$/g, '')
              .replace(/,\s*,/g, ',')
              .trim();
            setContent(cleanedContent);
          }
        } else {
          // タイマー記録のみの場合
          setExistingRecord(null);
          setMinutes('');
          setContent('');
        }
      } else {
        setExistingRecord(null);
        setTimerMinutes(0);
        // フォームをリセット
        setMinutes('');
        setContent('');
        // セッションがない場合でも、内訳は空にする
        setPracticeBreakdown([]);
      }

      // 録音記録を取得（日付範囲で検索）
      // タイムゾーンの問題を回避するため、前後1日を含める
      const startOfDay = new Date(practiceDate);
      startOfDay.setHours(0, 0, 0, 0);
      startOfDay.setDate(startOfDay.getDate() - 1); // 前日を含める
      
      const endOfDay = new Date(practiceDate);
      endOfDay.setHours(23, 59, 59, 999);
      endOfDay.setDate(endOfDay.getDate() + 1); // 翌日を含める
      
      let recordingQuery = supabase
        .from('recordings')
        .select('id, title, duration_seconds, file_path, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', startOfDay.toISOString())
        .lte('recorded_at', endOfDay.toISOString());
      
      // 楽器IDでフィルタリング
      if (selectedInstrument) {
        recordingQuery = recordingQuery.eq('instrument_id', selectedInstrument);
      } else {
        recordingQuery = recordingQuery.is('instrument_id', null);
      }
      
      const { data: recordings, error: recordingError } = await recordingQuery
        .order('created_at', { ascending: false })
        .limit(1);

      if (recordingError) {
        ErrorHandler.handle(recordingError, '既存録音の読み込み', false);
        return;
      }

      if (recordings && recordings.length > 0) {
        // 録音を日付でフィルタリング（ローカル日付で比較）
        const practiceDateStr = formatLocalDate(new Date(practiceDate));
        const matchingRecording = recordings.find((recording: { recorded_at: string }) => {
          if (!recording.recorded_at) return false;
          const recordedDateStr = formatLocalDate(new Date(recording.recorded_at));
          return recordedDateStr === practiceDateStr;
        });
        
        if (matchingRecording) {
          // 既にexistingRecordingが設定されている場合（録音保存直後など）は、上書きしない
          // ただし、IDが一致する場合は更新する（データベースから最新情報を取得）
          if (!existingRecording || existingRecording.id === matchingRecording.id) {
            setExistingRecording({
              id: matchingRecording.id,
              title: matchingRecording.title || '無題の録音',
              duration: matchingRecording.duration_seconds || 0
            });
            setAudioUrl(matchingRecording.file_path);
            logger.debug('録音記録を読み込みました:', matchingRecording.id);
          } else {
            logger.debug('既存の録音状態を保持します（録音保存直後の可能性）:', {
              existingId: existingRecording.id,
              foundId: matchingRecording.id
            });
          }
        } else {
          // 日付が一致しない場合は、preserveExistingRecordingがtrueの場合は既存の状態を保持
          if (!preserveExistingRecording) {
            setExistingRecording(null);
            setAudioUrl('');
            logger.debug('録音記録が見つかりませんでした（日付不一致）');
          } else {
            logger.debug('録音記録が見つかりませんでしたが、既存の状態を保持します（日付不一致）');
          }
        }
      } else {
        // 録音が見つからない場合でも、preserveExistingRecordingがtrueまたは録音保存直後の場合は既存の状態を保持する
        // （保存直後でデータベースへの反映が遅い場合があるため）
        if (!preserveExistingRecording && !isRecordingJustSaved) {
          setExistingRecording(null);
          setAudioUrl('');
          logger.debug('録音記録はありません');
        } else {
          logger.debug('録音記録が見つかりませんでしたが、既存の状態を保持します', {
            preserveExistingRecording,
            isRecordingJustSaved
          });
        }
      }
      
      // デバッグ: 削除アイコンが表示される条件を確認
      logger.debug('削除アイコン表示条件:', {
        existingRecord: !!existingRecord,
        existingRecording: !!existingRecording,
        shouldShow: !!(existingRecord || existingRecording)
      });
    } catch (error) {
      ErrorHandler.handle(error, '既存記録の読み込み', false);
    }
  }, [selectedDate, selectedInstrument, isRecordingJustSaved, visible, existingRecording]);

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
        // 録音状態を保持してデータを再読み込み（既存の録音状態を上書きしない）
        loadExistingRecord(true);
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
        loadExistingRecord(false);
      }
    }
  }, [visible, selectedDate, showAudioRecorder, loadExistingRecord, formStateBeforeRecording]);

  // 練習記録更新イベントをリッスン（クイック記録などで更新された場合に再読み込み）
  useEffect(() => {
    const handlePracticeRecordUpdate = (event: Event & { detail?: { action?: string } }) => {
      if (visible && selectedDate) {
        const action = (event as CustomEvent).detail?.action;
        logger.debug('練習記録更新イベントを受信、データを再読み込み', { action });
        
        // 録音保存の場合は、再読み込みをスキップ（既に状態が設定されているため）
        if (action === 'recording_saved') {
          logger.debug('録音保存イベントのため、再読み込みをスキップします');
          return;
        }
        
        // その他の更新の場合は再読み込み
        setTimeout(() => {
          loadExistingRecord(false);
        }, 500);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('practiceRecordUpdated', handlePracticeRecordUpdate);
      
      return () => {
        window.removeEventListener('practiceRecordUpdated', handlePracticeRecordUpdate);
      };
    }
  }, [visible, selectedDate, loadExistingRecord]);

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
          setExistingRecording({
            id: savedRecording.id,
            title: audioTitle || '録音',
            duration: audioDuration || 0
          });
          setIsRecordingJustSaved(true); // 録音保存直後フラグを設定
          logger.debug('✅ 録音情報を状態に設定しました:', {
            id: savedRecording.id,
            title: audioTitle || '録音',
            duration: audioDuration || 0
          });
        }

        // Reset form
        setAudioUrl('');
        setAudioTitle('');
        setAudioMemo('');
        setIsAudioFavorite(false);
        setAudioDuration(0);
        
        // カレンダーデータ更新のためのカスタムイベントを発火
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('practiceRecordUpdated', {
            detail: { 
              action: 'recording_saved', 
              date: recordedAt
            }
          }));
          console.log('📢 カレンダーデータ更新イベントを発火しました');
        }
        
        // モーダルを閉じない（録音済みを表示するため）
        // onClose();
        
        // コールバックを呼び出す
        onRecordingSaved?.();
        
        // 録音保存後、少し遅延してからデータを再取得（データベースへの反映を待つ）
        setTimeout(() => {
          setIsRecordingJustSaved(false);
          // フラグをリセットした後、データを再取得して確実に録音済み状態を表示
          if (visible && selectedDate) {
            loadExistingRecord(false);
          }
        }, 1000); // 1秒後に再取得（データベースへの反映を待つ）
        
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
      // 録音が保存された場合は、状態を直接更新
      setExistingRecording({
        id: audioData.recordingId,
        title: audioData.title,
        duration: audioData.duration
      });
      setIsRecordingJustSaved(true); // 録音保存直後フラグを設定
      // 録音済み情報を表示するため、一時的な録音データはクリア
      setAudioUrl(''); // 録音済みとして表示するため、一時的なURLをクリア
      setAudioTitle('');
      setAudioMemo('');
      setIsAudioFavorite(false);
      setAudioDuration(0);
      
      console.log('✅ 録音情報を状態に設定しました:', {
        id: audioData.recordingId,
        title: audioData.title,
        duration: audioData.duration
      });
      
      // 録音保存後、少し遅延してからデータを再取得（データベースへの反映を待つ）
      setTimeout(() => {
        setIsRecordingJustSaved(false);
        // フラグをリセットした後、データを再取得して確実に録音済み状態を表示
        if (visible && selectedDate) {
          loadExistingRecord(false);
        }
      }, 1000); // 1秒後に再取得（データベースへの反映を待つ）
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
    
    console.log('✅ 録音情報を「今日の演奏記録」セクションに表示しました');
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
      
      // 保存処理を実行（完了を待つ）
      await onSave?.(minutesNumber, content?.trim() || undefined, audioUrl || undefined, videoUrl || undefined);
      
      // コールバックを呼び出す
      onRecordingSaved?.();
      
      // 保存後、モーダルを閉じてカレンダー画面に戻る
      onClose();
      
      // カレンダー画面に遷移（念のため）
      setTimeout(() => {
        try {
          console.log('🔄 練習記録保存後、カレンダー画面に遷移開始');
          router.replace('/(tabs)/' as any);
          console.log('✅ 練習記録保存後、カレンダー画面遷移完了');
        } catch (error) {
          console.error('❌ 練習記録保存後、画面遷移エラー:', error);
        }
      }, 100);
    } catch (error) {
      console.error('❌ 保存処理エラー:', error);
      // エラーが発生してもモーダルは閉じる
      onClose();
    }
  };

  const handleDeleteRecord = () => {
    console.log('🗑️ 削除ボタンが押されました');
    
    // 削除可能な項目を確認
    const canDeletePractice = !!existingRecord;
    const canDeleteRecording = !!existingRecording;

    if (!canDeletePractice && !canDeleteRecording) {
      Alert.alert('情報', '削除できる項目がありません');
      return;
    }

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

      // 練習記録更新イベントを発火
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('practiceRecordUpdated', {
          detail: { action: 'practice_deleted' }
        }));
      }

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
            
            // すべてのセッションIDを削除（時間詳細も含めてすべて削除）
            if (sessions && sessions.length > 0) {
              const sessionIds = sessions.map(s => s.id);
              const { error } = await supabase
                .from('practice_sessions')
                .delete()
                .in('id', sessionIds);
              
              if (error) {
                Alert.alert('エラー', '練習記録の削除に失敗しました');
                return;
              }
            }

            // 録音ファイルも削除
            if (existingRecording) {
              const { error: recordingError } = await deleteRecording(existingRecording.id);
              if (recordingError) {
                console.error('Error deleting recording:', recordingError);
              }
              setAudioUrl('');
              setExistingRecording(null);
            }

            // ローカル状態をリセット
            setExistingRecord(null);
            setMinutes('');
            setContent('');
            setVideoUrl('');
            setTimerMinutes(0);
            setPracticeBreakdown([]);

            // 練習記録更新イベントを発火
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('practiceRecordUpdated', {
                detail: { action: 'practice_deleted' }
              }));
            }

            Alert.alert('削除完了', '練習記録と演奏録音を削除しました');
            onClose();
          } catch (error) {
            console.error('Error deleting both records:', error);
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666666" />
          </TouchableOpacity>
          <Text style={styles.title}>練習記録</Text>
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
                  {' '}(既存: {formatMinutesToHours(existingRecord.minutes)})
                </Text>
              )}
              {timerMinutes > 0 && (
                <Text style={[styles.timerIndicator, { color: '#4CAF50' }]}>
                  {' '}(タイマー: {formatMinutesToHours(timerMinutes)})
                </Text>
              )}
            </Text>
            
            {/* 時間選択ボタン */}
            <View style={styles.timeSelectionContainer}>
              <View style={styles.timeButtonRow}>
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '15' && styles.timeButtonActive]}
                  onPress={() => setMinutes('15')}
                >
                  <Text style={[styles.timeButtonText, minutes === '15' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}15分
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '30' && styles.timeButtonActive]}
                  onPress={() => setMinutes('30')}
                >
                  <Text style={[styles.timeButtonText, minutes === '30' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}30分
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '45' && styles.timeButtonActive]}
                  onPress={() => setMinutes('45')}
                >
                  <Text style={[styles.timeButtonText, minutes === '45' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}45分
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '60' && styles.timeButtonActive]}
                  onPress={() => setMinutes('60')}
                >
                  <Text style={[styles.timeButtonText, minutes === '60' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}1時間
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.timeButtonRow}>
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '90' && styles.timeButtonActive]}
                  onPress={() => setMinutes('90')}
                >
                  <Text style={[styles.timeButtonText, minutes === '90' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}1時間半
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '120' && styles.timeButtonActive]}
                  onPress={() => setMinutes('120')}
                >
                  <Text style={[styles.timeButtonText, minutes === '120' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}2時間
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '180' && styles.timeButtonActive]}
                  onPress={() => setMinutes('180')}
                >
                  <Text style={[styles.timeButtonText, minutes === '180' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}3時間
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.timeButtonRow}>
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '210' && styles.timeButtonActive]}
                  onPress={() => setMinutes('210')}
                >
                  <Text style={[styles.timeButtonText, minutes === '210' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}3時間半
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '240' && styles.timeButtonActive]}
                  onPress={() => setMinutes('240')}
                >
                  <Text style={[styles.timeButtonText, minutes === '240' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}4時間
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '300' && styles.timeButtonActive]}
                  onPress={() => setMinutes('300')}
                >
                  <Text style={[styles.timeButtonText, minutes === '300' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}5時間
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.timeButton, minutes === '360' && styles.timeButtonActive]}
                  onPress={() => setMinutes('360')}
                >
                  <Text style={[styles.timeButtonText, minutes === '360' && styles.timeButtonTextActive]}>
                    {(timerMinutes > 0 || existingRecord) ? '+' : ''}6時間
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* カスタム時間入力 */}
            <TextInput
              style={styles.input}
              value={minutes}
              onChangeText={setMinutes}
              placeholder="練習時間を入力（分）"
              keyboardType="numeric"
            />
            
            <Text style={styles.hintText}>
              {existingRecord 
                ? '上記ボタンから選択するか、時間を入力してください（+は既存の記録に追加されます）'
                : '上記ボタンから選択するか、時間を入力してください'
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
            <Text style={styles.label}>今日の演奏記録</Text>
            
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
          {(existingRecord || existingRecording) && (
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
                    setShowDeleteModal(false);
                    deleteBoth();
                  }}
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
}

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
});