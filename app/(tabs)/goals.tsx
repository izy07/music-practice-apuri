import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Target, Calendar, CircleCheck as CheckCircle, Edit3, Trash2, Users, Trophy, CheckCircle2, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { COMMON_STYLES } from '@/lib/styles';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { CompletedGoalsSection } from './goals/components/_CompletedGoalsSection';
import { goalService } from '@/services/goalService';
import { getUserProfile } from '@/repositories/userRepository';

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  progress_percentage: number;
  goal_type: 'personal_short' | 'personal_long' | 'group';
  is_active: boolean;
  is_completed: boolean;
  completed_at?: string;
  show_on_calendar?: boolean;
}

interface GoalFromDB extends Omit<Goal, 'show_on_calendar'> {
  show_on_calendar?: boolean | null;
  instrument_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface UserProfile {
  nickname?: string;
  organization?: string;
}

interface GoalSong {
  id: string;
  user_id: string;
  goal_id: string;
  song_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  my_songs: {
    id: string;
    title: string;
    composer: string;
    artist: string;
    genre?: string;
    difficulty: string;
    status: string;
  };
}

interface Event {
  id: string;
  title: string;
  date: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
}

export default function GoalsScreen() {
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const router = useRouter();
  
  // 目標関連の状態
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target_date: '',
    goal_type: 'personal_short' as 'personal_short' | 'personal_long' | 'group'
  });
  
  // カレンダー関連の状態
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  // 強制更新用の状態
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // 削除処理用のloading state
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ユーザープロフィール
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  
  // リクエスト重複防止用のref
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // データ読み込み関数を先に定義（useEffectで使用するため）
  const loadGoals = useCallback(async () => {
    // リクエスト重複防止
    if (loadingRef.current) {
      return;
    }
    
    // 前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    loadingRef.current = true;
    abortControllerRef.current = new AbortController();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        loadingRef.current = false;
        return;
      }

      const result = await goalService.getGoals(user.id, selectedInstrument);
      
      if (!result.success || result.error) {
        logger.error('Error loading goals:', result.error);
        loadingRef.current = false;
        return;
      }

      if (result.data) {
        const filtered = result.data.filter((g: GoalFromDB) => g.is_completed !== true);
        // show_on_calendarのデフォルト値を設定（既存の値があればそれを使用）
        // localStorageに保存された状態もマージ
        const goalsWithDefaults = filtered.map((g: GoalFromDB) => {
          let showOnCalendar = g.show_on_calendar ?? false;
          
          // localStorageから保存された状態を取得
          try {
            if (typeof window !== 'undefined') {
              const savedState = window.localStorage.getItem(`goal_show_calendar_${g.id}`);
              if (savedState !== null) {
                showOnCalendar = savedState === 'true';
              }
            }
          } catch (e) {
            // localStorageへのアクセスエラーは無視
          }
          
          return {
            ...g,
            show_on_calendar: showOnCalendar,
          };
        });
        setGoals(goalsWithDefaults);
      }
    } catch (error) {
      // Error loading goals
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('Error loading goals:', error);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [selectedInstrument]);

  const loadCompletedGoals = useCallback(async () => {
    // リクエスト重複防止
    if (loadingRef.current) {
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const result = await goalService.getCompletedGoals(user.id, selectedInstrument);
      
      if (!result.success || result.error) {
        logger.error('Error loading completed goals:', result.error);
        return;
      }

      if (result.data) {
        setCompletedGoals(result.data);
      }
    } catch (error) {
      // Error loading completed goals
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('Error loading completed goals:', error);
      }
    }
  }, [selectedInstrument]);

  const loadUserProfile = useCallback(async () => {
    // リクエスト重複防止
    if (loadingRef.current) {
      return;
    }
    
    try {
      logger.debug('ユーザープロフィール読み込み開始');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.debug('認証ユーザーが見つかりません');
        setUserProfile({
          nickname: 'ユーザー',
          organization: undefined
        });
        return;
      }

      logger.debug('認証ユーザー:', user.id);
      
      const profileResult = await getUserProfile(user.id);

      logger.debug('プロフィール取得結果:', { profile: profileResult.data, error: profileResult.error });

      if (profileResult.error) {
        ErrorHandler.handle(profileResult.error, 'プロフィール取得', false);
        // エラーが発生してもデフォルト値を使用
        setUserProfile({
          nickname: 'ユーザー',
          organization: undefined
        });
        return;
      }

      const profile = profileResult.data;
      if (profile) {
        const resolvedNickname = (profile.display_name && String(profile.display_name).trim().length > 0)
          ? profile.display_name
          : 'ユーザー';
        logger.debug('ニックネーム設定:', resolvedNickname);
        setUserProfile({
          nickname: resolvedNickname,
          organization: profile.organization || undefined
        });
      } else {
        logger.debug('プロフィールが見つかりません');
        setUserProfile({
          nickname: 'ユーザー',
          organization: undefined
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        ErrorHandler.handle(error, 'プロフィール読み込み', false);
        // エラーが発生してもデフォルト値を使用
        setUserProfile({
          nickname: 'ユーザー',
          organization: undefined
        });
      }
    }
  }, []);

  // useEffectとuseFocusEffectを関数定義の後に配置
  useEffect(() => {
    loadGoals();
    loadCompletedGoals();
    loadUserProfile();
  }, [selectedInstrument, loadGoals, loadCompletedGoals, loadUserProfile]);
  
  // 楽器変更イベントをリッスン
  useEffect(() => {
    const handleInstrumentChange = () => {
      loadGoals();
      loadCompletedGoals();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('instrumentChanged', handleInstrumentChange);
      
      return () => {
        window.removeEventListener('instrumentChanged', handleInstrumentChange);
      };
    }
  }, [loadGoals, loadCompletedGoals]);

  // 画面にフォーカスが当たった時にデータを再読み込み
  useFocusEffect(
    React.useCallback(() => {
      // 画面に戻ってきた時に必ず最新データを取得
      loadGoals(); // 目標リストを再読み込み
      loadCompletedGoals(); // 完了済み目標も再読み込み
      loadUserProfile(); // プロフィールも再読み込み
    }, [loadGoals, loadCompletedGoals, loadUserProfile]) // 依存配列にメモ化された関数を追加
  );

  // カレンダー関連の関数
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];
    
    // 前月の日付
    for (let i = 0; i < startingDay; i++) {
      const prevMonth = new Date(year, month - 1, 0);
      const day = prevMonth.getDate() - startingDay + i + 1;
      days.push({ day, isCurrentMonth: false, date: new Date(year, month - 1, day) });
    }
    
    // 今月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    
    // 翌月の日付（7の倍数になるまで）
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }
    
    return days;
  };

  const selectDate = (date: Date) => {
    // タイムゾーンの問題を回避するため、ローカル時間で日付を取得
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    // イベント登録機能は削除済みのため、日付選択は無効化
    setShowCalendar(false);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const saveGoal = async () => {
    if (!newGoal.title.trim()) {
      Alert.alert('エラー', '目標タイトルを入力してください');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ユーザーが認証されていません');
        return;
      }

      logger.debug('目標作成開始:', { title: newGoal.title, goal_type: newGoal.goal_type });

      const result = await goalService.createGoal(user.id, {
        title: newGoal.title.trim(),
        description: newGoal.description.trim() || undefined,
        target_date: newGoal.target_date || undefined,
        goal_type: newGoal.goal_type,
        instrument_id: selectedInstrument || null,
      });

      if (!result.success) {
        ErrorHandler.handle(new Error(result.error || '目標の作成に失敗しました'), '目標作成', true);
        Alert.alert('エラー', result.error || '目標の作成に失敗しました');
        return;
      }

      logger.debug('目標作成成功');
      Alert.alert('成功', '目標を保存しました');
      setNewGoal({ title: '', description: '', target_date: '', goal_type: 'personal_short' });
      setShowAddGoalForm(false);
      // 目標リストを再読み込み
      await loadGoals();
    } catch (error) {
      ErrorHandler.handle(error, '目標保存', true);
      Alert.alert('エラー', '目標の保存に失敗しました');
    }
  };

  const updateProgress = async (goalId: string, newProgress: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      const result = await goalService.updateProgress(goalId, user.id, newProgress);
      
      if (!result.success || result.error) {
        Alert.alert('エラー', result.error || '進捗の更新に失敗しました');
        return;
      }

      loadGoals();
    } catch (error) {
      Alert.alert('エラー', '進捗の更新に失敗しました');
    }
  };

  const completeGoal = async (goalId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      const targetGoal = goals.find(goal => goal.id === goalId);
      const completionTimestamp = new Date().toISOString();

      const result = await goalService.completeGoal(goalId, user.id);

      if (!result.success || result.error) {
        ErrorHandler.handle(result.error || new Error('目標達成処理に失敗'), '目標達成', true);
        Alert.alert('エラー', result.error || '目標の達成処理に失敗しました');
        return;
      }

      // ローカル状態から即座に削除（達成済みに移動）
      setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));

      if (targetGoal) {
        const completedGoalData: Goal = {
          ...targetGoal,
          is_completed: true,
          progress_percentage: 100,
          completed_at: completionTimestamp,
        };
        setCompletedGoals(prev => [completedGoalData, ...prev]);
      }
      
      // 達成済み目標を再読み込みしてサーバー状態と同期
      await loadCompletedGoals();
      
      Alert.alert('おめでとうございます！', '目標を達成しました！');
    } catch (error) {
      ErrorHandler.handle(error, '目標達成', true);
      Alert.alert('エラー', '目標の達成処理に失敗しました');
    }
  };

  const toggleShowOnCalendar = async (goalId: string, currentValue: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      const newValue = !currentValue;
      
      // show_on_calendarカラムのサポート状況をチェック
      // まず、localStorageのフラグを確認（以前にエラーがあった場合）
      let shouldSkipDatabaseUpdate = false;
      try {
        if (typeof window !== 'undefined') {
          const flag = window.localStorage.getItem('disable_show_on_calendar');
          if (flag === '1') {
            // フラグが設定されている場合でも、実際にデータベースを試してみる
            // カラムが追加された可能性があるため、フラグをクリアして試す
            window.localStorage.removeItem('disable_show_on_calendar');
          }
        }
      } catch {}

      const result = await goalService.updateShowOnCalendar(goalId, user.id, newValue);

      // エラーが発生した場合でも、show_on_calendarカラムが存在しない場合はローカル状態を更新
      if (!result.success || result.error) {
        // show_on_calendarカラムが存在しない場合のエラーを検出
        const errorMessage = result.error || '';
        const errorCode = (result as any)?.code || '';
        
        const isShowOnCalendarError = 
          errorCode === 'PGRST204' || // カラムが見つからない
          errorCode === '42703' || // 未定義のカラム
          (typeof errorMessage === 'string' && (
            errorMessage.toLowerCase().includes('show_on_calendar') ||
            errorMessage.toLowerCase().includes('column') ||
            errorMessage.toLowerCase().includes('does not exist') ||
            errorMessage.toLowerCase().includes('could not find') ||
            errorMessage.toLowerCase().includes('schema cache')
          ));

        if (isShowOnCalendarError) {
          logger.warn('show_on_calendarカラムが存在しません。フラグを設定してローカル状態のみ更新します。');
          logger.debug('エラー詳細:', { code: errorCode, message: errorMessage });
          
          // フラグを設定（次回以降はリクエストを送らない）
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('disable_show_on_calendar', '1');
              // この目標の状態をlocalStorageに保存
              window.localStorage.setItem(`goal_show_calendar_${goalId}`, String(newValue));
              if (newValue) {
                window.localStorage.setItem('calendar_goal_id', goalId);
              } else {
                window.localStorage.removeItem('calendar_goal_id');
              }
            }
          } catch (e) {
            logger.error('localStorageへの書き込みエラー:', e);
          }

          // ローカル状態のみ更新（エラーを無視してUIを更新）
          setGoals(prevGoals =>
            prevGoals.map(goal =>
              goal.id === goalId ? { ...goal, show_on_calendar: newValue } : goal
            )
          );
          return;
        }

        // その他のエラー（show_on_calendarカラム以外の問題）
        logger.error('カレンダー表示設定の更新エラー:', result.error);
        Alert.alert('エラー', `カレンダー表示設定の更新に失敗しました: ${errorMessage || '不明なエラー'}`);
        return;
      }

      // 成功時はローカル状態を更新
      // localStorageにも保存（次回の読み込み時に使用）
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`goal_show_calendar_${goalId}`, String(newValue));
          if (newValue) {
            window.localStorage.setItem('calendar_goal_id', goalId);
          } else {
            window.localStorage.removeItem('calendar_goal_id');
          }
        }
      } catch (e) {
        logger.error('localStorageへの書き込みエラー:', e);
      }
      
      setGoals(prevGoals =>
        prevGoals.map(goal =>
          goal.id === goalId ? { ...goal, show_on_calendar: newValue } : goal
        )
      );
    } catch (error) {
      logger.error('カレンダー表示設定の更新エラー:', error);
      Alert.alert('エラー', 'カレンダー表示設定の更新に失敗しました');
    }
  };

  const editGoal = (goal: Goal) => {
    setNewGoal({
      title: goal.title,
      description: goal.description || '',
      target_date: goal.target_date || '',
      goal_type: goal.goal_type
    });
    // TODO: 編集モードの実装
  };

  // 実際の削除処理を実行する関数
  const executeDeleteGoal = async (goalId: string) => {
    logger.debug('削除処理を開始します。goalId:', goalId);
    
    if (isDeleting) {
      logger.warn('既に削除処理中です');
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        logger.error('認証エラー:', authError);
        Alert.alert('エラー', '認証が必要です');
        setIsDeleting(false);
        return;
      }

      logger.debug('データベースから目標を削除します... goalId:', goalId, 'userId:', user.id);
      // 目標を実際に削除
      const result = await goalService.deleteGoal(goalId, user.id);
      
      logger.debug('削除結果:', { success: result.success, error: result.error });
      
      if (!result.success || result.error) {
        logger.error('目標削除エラー:', result.error);
        Alert.alert('エラー', `目標の削除に失敗しました: ${result.error || '不明なエラー'}`);
        setIsDeleting(false);
        return;
      }
      
      logger.info('データベースから削除成功。ローカル状態を更新します...');
      // ローカル状態からも即座に削除
      setGoals(prevGoals => {
        const filtered = prevGoals.filter(goal => goal.id !== goalId);
        logger.debug('アクティブ目標リスト更新: 削除前', prevGoals.length, '件 → 削除後', filtered.length, '件');
        return filtered;
      });
      setCompletedGoals(prevGoals => {
        const filtered = prevGoals.filter(goal => goal.id !== goalId);
        logger.debug('達成済み目標リスト更新: 削除前', prevGoals.length, '件 → 削除後', filtered.length, '件');
        return filtered;
      });
      
      // リストを再読み込みして確実に更新
      logger.debug('目標リストを再読み込みします...');
      await loadGoals();
      await loadCompletedGoals();
      
      logger.info('削除処理が完了しました');
      // 成功メッセージを表示
      Alert.alert('成功', '目標を削除しました');
      setIsDeleting(false);
      
    } catch (error) {
      logger.error('目標削除エラー（catch）:', error);
      Alert.alert('エラー', `目標の削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      setIsDeleting(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    logger.debug('削除ボタンが押されました。goalId:', goalId);
    
    // 削除処理の重複実行を防ぐ
    if (isDeleting) {
      logger.warn('既に削除処理中です');
      return;
    }
    
    Alert.alert(
      '目標を削除',
      'この目標を削除しますか？',
      [
        { 
          text: 'キャンセル', 
          style: 'cancel',
          onPress: () => {
            logger.debug('削除がキャンセルされました');
          }
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            logger.debug('削除ボタンが押されました。削除処理を実行します。');
            // 削除処理を実行（非同期だが、awaitしない）
            executeDeleteGoal(goalId).catch((error) => {
              logger.error('削除処理の実行エラー:', error);
              setIsDeleting(false);
            });
          }
        }
      ],
      { 
        cancelable: true, 
        onDismiss: () => {
          logger.debug('ダイアログが閉じられました（キャンセルまたは外部タップ）');
        }
      }
    );
  };

  // イベントの保存
  // const saveEvent = async () => { // This function was removed as per the edit hint
  //   if (!eventForm.title.trim() || !eventForm.date.trim()) {
  //     Alert.alert('エラー', 'イベント名と日付を入力してください');
  //     return;
  // }

  //   try {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (user) {
  //       if (editingEvent) {
  //         // 更新
  //         await supabase
  //           .from('events')
  //           .update({
  //             title: eventForm.title,
  //             date: eventForm.date,
  //             description: eventForm.description || null
  //           })
  //           .eq('id', editingEvent.id);
  //       } else {
  //         // 新規作成
  //         await supabase
  //           .from('events')
  //           .insert({
  //             user_id: user.id,
  //             title: eventForm.title,
  //             date: eventForm.date,
  //             description: eventForm.description || null,
  //             is_completed: false
  //           });
  //       }

  //       Alert.alert('成功', editingEvent ? 'イベントを更新しました' : 'イベントを登録しました');
        
  //       // フォームをリセット
  //       setEventForm({
  //         title: '',
  //         date: '',
  //         description: ''
  //       });
        
  //       // 編集モードをリセット
  //       setEditingEvent(null);
        
  //       // モーダルを閉じる
  //       setShowEventModal(false);
        
  //       // イベントを再読み込み
  //       loadEvents();
  //     }
  //   } catch (error) {
  //     console.error('Error saving event:', error);
  //     Alert.alert('エラー', 'イベントの保存に失敗しました');
  //   }
  // };

  // イベントの削除
  // const deleteEvent = async (eventId: string) => { // This function was removed as per the edit hint
  //   Alert.alert(
  //     '削除確認',
  //     'このイベントを削除しますか？',
  //     [
  //       { text: 'キャンセル', style: 'cancel' },
  //       { text: '削除', style: 'destructive', onPress: async () => {
  //         try {
  //           await supabase
  //             .from('events')
  //             .delete()
  //             .eq('id', eventId);

  //           loadEvents();
  //           loadCompletedEvents();
  //         } catch (error) {
  //           console.error('Error deleting event:', error);
  //           Alert.alert('エラー', 'イベントの削除に失敗しました');
  //         }
  //       }}
  //     ]
  //   );
  // };

  // イベントの完了
  // const completeEvent = async (eventId: string) => { // This function was removed as per the edit hint
  //   try {
  //     await supabase
  //       .from('events')
  //       .update({ 
  //         is_completed: true, 
  //         completed_at: new Date().toISOString()
  //       })
  //       .eq('id', eventId);

  //     Alert.alert('おめでとうございます！', 'イベントを完了しました！');
  //     loadEvents();
  //     loadCompletedEvents();
  //   } catch (error) {
  //     console.error('Error completing event:', error);
  //     Alert.alert('エラー', 'イベントの完了処理に失敗しました');
  //   }
  // };
  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'personal_short': return '個人目標（短期）';
      case 'personal_long': return '個人目標（長期）';
      case 'group': return '団体目標';
      default: return '目標';
    }
  };

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'personal_short': return '#4CAF50';
      case 'personal_long': return '#2196F3';
      case 'group': return '#FF9800';
      default: return '#8B4513';
    }
  };

  // 個人目標セクション
  const renderPersonalGoals = () => (
    <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
      <View style={styles.sectionHeader}>
        <Target size={24} color={currentTheme.primary} />
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
          個人目標
        </Text>
      </View>
      
      {goals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: currentTheme.textSecondary }]}>
            個人目標が設定されていません
          </Text>
          <TouchableOpacity
            style={[styles.addGoalButton, { backgroundColor: currentTheme.primary }]}
            onPress={() => router.push('/add-goal')}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={[styles.addButtonText, { color: '#FFFFFF' }]}>目標を追加</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.goalsList}>
          {goals.map((goal) => (
            <View key={goal.id} style={[styles.goalCard, { borderColor: '#E0E0E0' }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalTitle, { color: currentTheme.text }]}>
                  {goal.title}
                </Text>
                <View style={styles.goalActions}>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: currentTheme.primary }]}
                    onPress={() => editGoal(goal)}
                  >
                    <Edit3 size={12} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>編集</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: '#FF4444' }]}
                    onPress={() => {
                      logger.debug('削除ボタンがクリックされました（達成済み目標）。goalId:', goal.id);
                      deleteGoal(goal.id);
                    }}
                    activeOpacity={0.7}
                    disabled={isDeleting}
                  >
                    <Trash2 size={12} color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={[styles.goalDescription, { color: currentTheme.textSecondary }]}>
                {goal.description}
              </Text>
              
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${goal.progress_percentage}%`,
                        backgroundColor: currentTheme.primary 
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: currentTheme.textSecondary }]}>
                  {goal.progress_percentage}%
                </Text>
              </View>
              
              <View style={styles.goalFooter}>
                <Text style={[styles.goalTypeBadgeText, { color: currentTheme.textSecondary }]}>
                  {goal.goal_type === 'personal_short' ? '短期目標' : '長期目標'}
                </Text>
                <Text style={[styles.goalDeadline, { color: currentTheme.textSecondary }]}>
                  期限: {goal.target_date ? new Date(goal.target_date).toLocaleDateString('ja-JP') : '未設定'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // 団体目標セクション
  const renderGroupGoals = () => (
    <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
      <View style={styles.sectionHeader}>
        <Users size={24} color={currentTheme.primary} />
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
          {userProfile.organization}での目標！
        </Text>
      </View>
      
      {goals.filter(goal => goal.goal_type === 'group').length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: currentTheme.textSecondary }]}>
            団体目標が設定されていません
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: currentTheme.primary }]}
            onPress={() => setNewGoal({...newGoal, goal_type: 'group'})}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>団体目標を追加</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.goalsList}>
          {goals.filter(goal => goal.goal_type === 'group').map(goal => (
            <View key={goal.id} style={[styles.goalCard, { borderColor: '#E0E0E0' }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalTitle, { color: currentTheme.text }]}>
                  {goal.title}
                </Text>
                <View style={styles.goalActions}>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: currentTheme.primary }]}
                    onPress={() => editGoal(goal)}
                  >
                    <Edit3 size={12} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>編集</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: '#FF4444' }]}
                    onPress={() => {
                      logger.debug('削除ボタンがクリックされました（達成済み目標）。goalId:', goal.id);
                      deleteGoal(goal.id);
                    }}
                    activeOpacity={0.7}
                    disabled={isDeleting}
                  >
                    <Trash2 size={12} color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={[styles.goalDescription, { color: currentTheme.textSecondary }]}>
                {goal.description}
              </Text>
              
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${goal.progress_percentage}%`,
                        backgroundColor: currentTheme.primary 
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: currentTheme.textSecondary }]}>
                  {goal.progress_percentage}%
                </Text>
              </View>
              
              <View style={styles.goalFooter}>
                <Text style={[styles.goalTypeBadgeText, { color: currentTheme.textSecondary }]}>
                  団体目標
                </Text>
                <Text style={[styles.goalDeadline, { color: currentTheme.textSecondary }]}>
                  期限: {goal.target_date ? new Date(goal.target_date).toLocaleDateString('ja-JP') : '未設定'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // 達成済み目標セクション（コンポーネント化済み）
  const renderCompletedGoals = () => (
    <CompletedGoalsSection
      completedGoals={completedGoals}
      getGoalTypeLabel={getGoalTypeLabel}
      getGoalTypeColor={getGoalTypeColor}
    />
  );

  // 目標追加フォーム
  const renderAddGoalForm = () => (
    <View style={[styles.addGoalForm, { backgroundColor: currentTheme.surface }]}>
      <Text style={[styles.formTitle, { color: currentTheme.text }]}>新しい目標を追加</Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: currentTheme.text }]}>目標タイトル</Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: currentTheme.background,
            color: currentTheme.text,
            borderColor: currentTheme.secondary
          }]}
          value={newGoal.title}
          onChangeText={(text) => {
            if (text.length <= 50) {
              setNewGoal({...newGoal, title: text});
            }
          }}
          placeholder={newGoal.goal_type === 'personal_short' ? '例: ○○を弾けるようになりたい' : newGoal.goal_type === 'personal_long' ? '例: 綺麗な音を出せるようになりたい' : '例: コンクールで金賞を取る'}
          placeholderTextColor={currentTheme.textSecondary}
          maxLength={50}
        />
        <Text style={[styles.characterCount, { color: currentTheme.textSecondary }]}>
          {newGoal.title.length}/50文字
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: currentTheme.text }]}>詳細説明</Text>
        <TextInput
          style={[styles.input, styles.textArea, { 
            backgroundColor: currentTheme.background,
            color: currentTheme.text,
            borderColor: currentTheme.secondary
          }]}
          value={newGoal.description}
          onChangeText={(text) => setNewGoal({...newGoal, description: text})}
          placeholder="目標の詳細を記入..."
          placeholderTextColor={currentTheme.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: currentTheme.text }]}>目標期日</Text>
        
        {/* 年・月選択 */}
        <View style={styles.dateSelectorRow}>
          <View style={styles.yearMonthSelector}>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: currentTheme.secondary }]}
              onPress={() => setSelectedYear(prev => prev - 1)}
            >
              <Text style={[styles.selectorButtonText, { color: currentTheme.text }]}>◀</Text>
            </TouchableOpacity>
            <Text style={[styles.yearMonthText, { color: currentTheme.text }]}>
              {selectedYear}年{selectedMonth + 1}月
            </Text>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: currentTheme.secondary }]}
              onPress={() => setSelectedYear(prev => prev + 1)}
            >
              <Text style={[styles.selectorButtonText, { color: currentTheme.text }]}>▶</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.monthSelector}>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: currentTheme.secondary }]}
              onPress={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(prev => prev - 1);
                } else {
                  setSelectedMonth(prev => prev - 1);
                }
              }}
            >
              <Text style={[styles.selectorButtonText, { color: currentTheme.text }]}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectorButton, { borderColor: currentTheme.secondary }]}
              onPress={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(prev => prev + 1);
                } else {
                  setSelectedMonth(prev => prev + 1);
                }
              }}
            >
              <Text style={[styles.selectorButtonText, { color: currentTheme.text }]}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 日付選択 */}
        <TouchableOpacity
          style={[styles.dateInput, { 
            backgroundColor: currentTheme.background,
            borderColor: currentTheme.secondary
          }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.dateInputText, 
            { 
              color: newGoal.target_date ? currentTheme.text : currentTheme.textSecondary 
            }
          ]}>
            {newGoal.target_date ? newGoal.target_date : '日付を選択してください'}
          </Text>
          <Calendar size={20} color={currentTheme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.typeButton, newGoal.goal_type === 'personal_short' && { backgroundColor: currentTheme.primary }]}
          onPress={() => setNewGoal({...newGoal, goal_type: 'personal_short'})}
        >
          <Text style={[styles.typeButtonText, { 
            color: newGoal.goal_type === 'personal_short' ? '#FFFFFF' : currentTheme.text 
          }]}>
            短期目標
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, newGoal.goal_type === 'personal_long' && { backgroundColor: currentTheme.primary }]}
          onPress={() => setNewGoal({...newGoal, goal_type: 'personal_long'})}
        >
          <Text style={[styles.typeButtonText, { 
            color: newGoal.goal_type === 'personal_long' ? '#FFFFFF' : currentTheme.text 
          }]}>
            長期目標
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, newGoal.goal_type === 'group' && { backgroundColor: currentTheme.primary }]}
          onPress={() => setNewGoal({...newGoal, goal_type: 'group'})}
        >
          <Text style={[styles.typeButtonText, { 
            color: newGoal.goal_type === 'group' ? '#FFFFFF' : currentTheme.text 
          }]}>
            団体目標
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, { backgroundColor: currentTheme.primary }]} 
        onPress={saveGoal}
      >
        <Text style={styles.saveButtonText}>目標を保存</Text>
      </TouchableOpacity>
    </View>
  );

  // ミニカレンダーモーダル
  const renderCalendarModal = () => (
    <Modal
      visible={showCalendar}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowCalendar(false)}
    >
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarModal}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth('prev')}>
              <ChevronLeft size={24} color="#666666" />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </Text>
            <TouchableOpacity onPress={() => changeMonth('next')}>
              <ChevronRight size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            {getDaysInMonth(currentMonth).map((dayData, index) => {
              const formattedDayDate = `${dayData.date.getFullYear()}-${String(dayData.date.getMonth() + 1).padStart(2, '0')}-${String(dayData.date.getDate()).padStart(2, '0')}`;
              
                              return (
                  <View key={index}>
                    <TouchableOpacity
                      style={[
                        styles.calendarDay,
                        !dayData.isCurrentMonth && styles.calendarDayOtherMonth,
                      ]}
                      onPress={() => selectDate(dayData.date)}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        { color: dayData.isCurrentMonth ? currentTheme.text : currentTheme.textSecondary },
                      ]}>
                        {dayData.day}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
            })}
          </View>

          {/* 閉じるボタン */}
          <TouchableOpacity
            style={[styles.calendarCloseButton, { backgroundColor: currentTheme.primary }]}
            onPress={() => setShowCalendar(false)}
          >
            <Text style={styles.calendarCloseButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      <InstrumentHeader />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}> 
          <Text style={[styles.title, { color: currentTheme.text }]}>
            {(userProfile?.nickname && userProfile.nickname.trim().length > 0) 
              ? `${userProfile.nickname}の目標` 
              : 'ユーザーの目標'}
          </Text>
        </View>

        {/* 1. 個人目標セクション */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Target size={24} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              {userProfile.nickname ? `${userProfile.nickname}の目標！` : '個人目標'}
            </Text>
          </View>
          
          <View style={styles.goalTypes}>
            <TouchableOpacity
              style={[styles.goalTypeCard, { borderColor: currentTheme.primary }]}
              onPress={() => setNewGoal({...newGoal, goal_type: 'personal_short'})}
            >
              <Text style={[styles.goalTypeTitle, { color: currentTheme.primary }]}>短期目標</Text>
              <Text style={[styles.goalTypeDescription, { color: currentTheme.textSecondary }]}>
                {goals.filter(goal => goal.goal_type === 'personal_short').length > 0 
                  ? goals.filter(goal => goal.goal_type === 'personal_short')[0].title
                  : 'もっと高い音を出せるようにする'
                }
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.goalTypeCard, { borderColor: currentTheme.primary }]}
              onPress={() => setNewGoal({...newGoal, goal_type: 'personal_long'})}
            >
              <Text style={[styles.goalTypeTitle, { color: currentTheme.primary }]}>長期目標</Text>
              <Text style={[styles.goalTypeDescription, { color: currentTheme.textSecondary }]}>
                {goals.filter(goal => goal.goal_type === 'personal_long').length > 0 
                  ? goals.filter(goal => goal.goal_type === 'personal_long')[0].title
                  : '綺麗な音で弾きたい'
                }
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.addGoalButton, { backgroundColor: currentTheme.primary }]}
            onPress={() => router.push('/add-goal')}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={[styles.addButtonText, { color: '#FFFFFF' }]}>目標を追加</Text>
          </TouchableOpacity>
        </View>

        {/* 2. 団体目標セクション */}
        {userProfile.organization && (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <Users size={24} color={currentTheme.primary} />
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                {userProfile.organization}での目標！
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.groupGoalCard, { borderColor: currentTheme.primary }]}
              onPress={() => setNewGoal({...newGoal, goal_type: 'group'})}
            >
              <Text style={[styles.groupGoalText, { color: currentTheme.textSecondary }]}>
                {goals.filter(goal => goal.goal_type === 'group').length > 0 
                  ? goals.filter(goal => goal.goal_type === 'group')[0].title
                  : '県大会優勝する！'
                }
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 設定した目標セクション */}
        <View style={[styles.section, { backgroundColor: 'transparent', marginTop: 16 }]}>
          {goals.length > 0 && (
            <View style={styles.goalsList}>
              {goals.map((goal) => (
                <View key={goal.id} style={[styles.goalCard, { backgroundColor: '#FFFFFF', borderColor: currentTheme.secondary + '33' }]}>
                  <View style={styles.goalHeader}>
                    <View style={[styles.goalTypeBadge, { backgroundColor: getGoalTypeColor(goal.goal_type) }]}>
                      <Text style={styles.goalTypeBadgeText}>{getGoalTypeLabel(goal.goal_type)}</Text>
                    </View>
                    <View style={styles.goalHeaderRight}>
                      {goal.progress_percentage === 100 && (
                        <CheckCircle size={20} color="#4CAF50" />
                      )}
                      <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: '#FF4444' }]}
                        onPress={() => {
                          logger.debug('削除ボタンがクリックされました。goalId:', goal.id);
                          deleteGoal(goal.id);
                        }}
                        activeOpacity={0.7}
                        disabled={isDeleting}
                      >
                        <Text style={styles.deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={[styles.goalTitle, { color: currentTheme.text }]}>{goal.title}</Text>
                  {goal.description && (
                    <Text style={[styles.goalDescription, { color: currentTheme.textSecondary }]}>{goal.description}</Text>
                  )}
                  
                  {goal.target_date && (
                    <View style={styles.goalDate}>
                      <Calendar size={16} color={currentTheme.textSecondary} />
                      <Text style={[styles.goalDateText, { color: currentTheme.textSecondary }]}>目標期日: {goal.target_date}</Text>
                    </View>
                  )}

                  {/* 短期目標以外は進捗を表示 */}
                  {goal.goal_type !== 'personal_short' && (
                    <View style={styles.progressSection}>
                      <Text style={styles.progressLabel}>進捗: {goal.progress_percentage}%</Text>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${goal.progress_percentage}%`,
                              backgroundColor: getGoalTypeColor(goal.goal_type)
                            }
                          ]} 
                        />
                      </View>
                      <View style={styles.progressButtons}>
                        <TouchableOpacity
                          style={styles.progressButton}
                          onPress={() => updateProgress(goal.id, Math.max(0, goal.progress_percentage - 10))}
                        >
                          <Text style={styles.progressButtonText}>-10%</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.progressButton}
                          onPress={() => updateProgress(goal.id, Math.min(100, goal.progress_percentage + 10))}
                        >
                          <Text style={styles.progressButtonText}>+10%</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* 個人目標（短期・長期）のカレンダー表示切り替えボタン */}
                  {(goal.goal_type === 'personal_short' || goal.goal_type === 'personal_long') && (
                    <View style={styles.calendarToggleActions}>
                      <TouchableOpacity
                        style={[
                          styles.calendarToggleButton,
                          { 
                            backgroundColor: goal.show_on_calendar ? currentTheme.primary : currentTheme.background,
                            borderColor: goal.show_on_calendar ? currentTheme.primary : currentTheme.textSecondary,
                            borderWidth: 1.5,
                            flex: 1,
                          }
                        ]}
                        onPress={() => {
                          logger.debug('表示ボタンがクリックされました。現在の値:', goal.show_on_calendar);
                          toggleShowOnCalendar(goal.id, goal.show_on_calendar ?? false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Calendar size={14} color={goal.show_on_calendar ? '#FFFFFF' : currentTheme.text} />
                        <Text style={[
                          styles.calendarToggleButtonText,
                          { color: goal.show_on_calendar ? '#FFFFFF' : currentTheme.text }
                        ]}>
                          表示
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.calendarToggleButton,
                          { 
                            backgroundColor: !goal.show_on_calendar ? currentTheme.secondary : currentTheme.background,
                            borderColor: !goal.show_on_calendar ? currentTheme.secondary : currentTheme.textSecondary,
                            borderWidth: 1.5,
                            flex: 1,
                          }
                        ]}
                        onPress={() => {
                          logger.debug('非表示ボタンがクリックされました。現在の値:', goal.show_on_calendar);
                          toggleShowOnCalendar(goal.id, goal.show_on_calendar ?? false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.calendarToggleButtonText,
                          { color: !goal.show_on_calendar ? '#FFFFFF' : currentTheme.textSecondary }
                        ]}>
                          非表示
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 短期目標の達成ボタン */}
                  {goal.goal_type === 'personal_short' && !goal.is_completed && (
                    <View style={styles.shortGoalActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                        onPress={() => completeGoal(goal.id)}
                        activeOpacity={0.8}
                      >
                        <CheckCircle2 size={16} color="#FFFFFF" />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>達成！</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 達成済み目標セクション */}
        {renderCompletedGoals()}
      </ScrollView>

      {/* ミニカレンダーモーダル */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => changeMonth('prev')}>
                <ChevronLeft size={24} color="#666666" />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </Text>
              <TouchableOpacity onPress={() => changeMonth('next')}>
                <ChevronRight size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarGrid}>
              {getDaysInMonth(currentMonth).map((dayData, index) => {
                const formattedDayDate = `${dayData.date.getFullYear()}-${String(dayData.date.getMonth() + 1).padStart(2, '0')}-${String(dayData.date.getDate()).padStart(2, '0')}`;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      !dayData.isCurrentMonth && styles.calendarDayOtherMonth,
                    ]}
                    onPress={() => selectDate(dayData.date)}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      { color: dayData.isCurrentMonth ? currentTheme.text : currentTheme.textSecondary },
                    ]}>
                      {dayData.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 閉じるボタン */}
            <TouchableOpacity
              style={[styles.calendarCloseButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.calendarCloseButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addGoalForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 16,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4444',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  goalDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  // 新しいセクション用のスタイル
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  goalTypes: {
    gap: 12,
    marginBottom: 16,
  },
  goalTypeCard: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    flex: 1,
  },
  goalTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalTypeDescription: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },

  groupGoalCard: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 0,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  groupGoalText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E8E8E8',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  completedGoalCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
  },
  completedGoalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  completedGoalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedGoalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  completedGoalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  completedGoalDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // イベント用のスタイル
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 0,
    gap: 8,
    marginBottom: 16,
  },
  addEventButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventCard: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 0,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 16,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  eventActionButton: {
    padding: 8,
    borderRadius: 0,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // 達成済みイベント用のスタイル
  completedEventCard: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 0,
    marginBottom: 12,
  },
  completedEventTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  completedEventDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  completedEventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  completedEventCompletionDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // モーダル用のスタイル
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  // 日付入力用のスタイル
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarButton: {
    padding: 12,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // カレンダー用のスタイル
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    width: 320,
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
    borderRadius: 8,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 1,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: '#8B4513',
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  calendarCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // 横分割セクション用のスタイル
  splitSectionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  splitSection: {
    flex: 1,
    padding: 16,
    borderRadius: 0,
  },
  splitSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  composerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  // 空状態表示用のスタイル
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    marginBottom: 10,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  goalDeadline: {
    fontSize: 14,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  progressButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  shortGoalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  calendarToggleActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  calendarToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  calendarToggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  progressButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  goalDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  goalDateText: {
    fontSize: 14,
    marginLeft: 8,
  },
  progressSection: {
    marginTop: 12,
  },
  goalTypeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  goalTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  dateInputText: {
    fontSize: 16,
    flex: 1,
  },
  simpleGoalForm: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  yearMonthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  yearMonthText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'center',
  },
});