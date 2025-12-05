import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Target, Calendar, CircleCheck as CheckCircle, Edit3, Trash2, CheckCircle2, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { supabase } from '@/lib/supabase';
import { COMMON_STYLES } from '@/lib/styles';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { styles } from '@/lib/tabs/goals/styles';
import { CompletedGoalsSection } from './goals/components/_CompletedGoalsSection';
import { goalService } from '@/services/goalService';
import { getUserProfile } from '@/repositories/userRepository';

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  progress_percentage: number;
  goal_type: 'personal_short' | 'personal_long';
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
  const { isAuthenticated, user } = useAuthAdvanced();
  
  // 目標関連の状態
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target_date: '',
    goal_type: 'personal_short' as 'personal_short' | 'personal_long'
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
  
  // ユーザープロフィール（初期値はuseAuthAdvancedから取得）
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    // 初期状態でuseAuthAdvancedからニックネームを取得
    const initialNickname = user?.name && String(user.name).trim().length > 0
      ? String(user.name).trim()
      : 'ユーザー';
    return {
      nickname: initialNickname,
      organization: undefined
    };
  });
  
  // リクエスト重複防止用のref
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // デバウンス処理用のref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  
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
        // 既存のデータを保持しながら更新（読み込み中でも既存データを表示）
        setGoals(prevGoals => {
          // 新しいデータがある場合は更新、ない場合は既存データを保持
          return filtered.length > 0 ? filtered : prevGoals;
        });
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
        // 既存のデータを保持しながら更新（読み込み中でも既存データを表示）
        setCompletedGoals(prevCompleted => {
          // 新しいデータがある場合は更新、ない場合は既存データを保持
          return result.data.length > 0 ? result.data : prevCompleted;
        });
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
    
    // 認証状態を確認
    if (!isAuthenticated || !user) {
      logger.debug('認証されていないため、プロフィール読み込みをスキップ');
      setUserProfile({
        nickname: 'ユーザー',
        organization: undefined
      });
      return;
    }
    
    try {
      logger.debug('ユーザープロフィール読み込み開始', { userId: user.id });
      
      // まずuser_metadataからニックネームを取得（新規登録時に保存された値）
      let nickname = 'ユーザー';
      if (user.name && String(user.name).trim().length > 0) {
        nickname = String(user.name).trim();
        logger.debug('useAuthAdvancedからニックネーム取得:', nickname);
      } else {
        // useAuthAdvancedから取得できない場合は、直接Supabaseから取得
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.user_metadata) {
          const metadataName = authUser.user_metadata.name || authUser.user_metadata.display_name;
          if (metadataName && String(metadataName).trim().length > 0) {
            nickname = String(metadataName).trim();
            logger.debug('user_metadataからニックネーム取得:', nickname);
          }
        }
      }
      
      const profileResult = await getUserProfile(user.id);

      logger.debug('プロフィール取得結果:', { profile: profileResult.data, error: profileResult.error });

      if (profileResult.error) {
        ErrorHandler.handle(profileResult.error, 'プロフィール取得', false);
        // エラーが発生してもuser_metadataの値を使用
        setUserProfile({
          nickname: nickname,
          organization: undefined
        });
        return;
      }

      const profile = profileResult.data;
      if (profile) {
        // user_profilesテーブルのdisplay_nameを優先、なければuser_metadataの値を使用
        const resolvedNickname = (profile.display_name && String(profile.display_name).trim().length > 0)
          ? profile.display_name
          : nickname;
        logger.debug('ニックネーム設定:', resolvedNickname);
        setUserProfile({
          nickname: resolvedNickname,
          organization: profile.organization || undefined
        });
      } else {
        logger.debug('プロフィールが見つかりません、user_metadataの値を使用');
        setUserProfile({
          nickname: nickname,
          organization: undefined
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        ErrorHandler.handle(error, 'プロフィール読み込み', false);
        // エラーが発生してもuser_metadataの値を使用
        let nickname = 'ユーザー';
        if (user?.name && String(user.name).trim().length > 0) {
          nickname = String(user.name).trim();
        } else {
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser?.user_metadata) {
              const metadataName = authUser.user_metadata.name || authUser.user_metadata.display_name;
              if (metadataName && String(metadataName).trim().length > 0) {
                nickname = String(metadataName).trim();
              }
            }
          } catch (e) {
            // エラーは無視
          }
        }
        setUserProfile({
          nickname: nickname,
          organization: undefined
        });
      }
    }
  }, [isAuthenticated, user]);

  // localStorageアクセスのメモ化（パフォーマンス最適化）
  const goalsWithDefaults = useMemo(() => {
    return goals.map((g: GoalFromDB) => {
      let showOnCalendar = g.show_on_calendar ?? false;
      
      // localStorageから保存された状態を取得（メモ化済み）
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
  }, [goals]);

  // 認証状態が更新されたら即座にニックネームを設定
  useEffect(() => {
    if (isAuthenticated && user) {
      const nickname = user.name && String(user.name).trim().length > 0
        ? String(user.name).trim()
        : 'ユーザー';
      setUserProfile(prev => ({
        ...prev,
        nickname: prev.nickname === 'ユーザー' || !prev.nickname ? nickname : prev.nickname
      }));
    }
  }, [isAuthenticated, user]);

  // useEffectとuseFocusEffectを関数定義の後に配置
  // selectedInstrumentが変更された時のみデータを読み込む（デバウンス処理付き）
  useEffect(() => {
    // 認証状態が更新されるまで待つ
    if (!isAuthenticated || !user) {
      return;
    }
    
    // 既存のタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 300ms後に実行（デバウンス処理）
    debounceTimerRef.current = setTimeout(() => {
      loadGoals();
      loadCompletedGoals();
      loadUserProfile();
      lastLoadTimeRef.current = Date.now();
    }, 300);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstrument, isAuthenticated, user]); // selectedInstrument、認証状態に依存
  
  // 楽器変更イベントをリッスン（refを使用して最新の関数を参照）
  const loadGoalsRef = useRef(loadGoals);
  const loadCompletedGoalsRef = useRef(loadCompletedGoals);
  
  useEffect(() => {
    loadGoalsRef.current = loadGoals;
    loadCompletedGoalsRef.current = loadCompletedGoals;
  }, [loadGoals, loadCompletedGoals]);

  useEffect(() => {
    const handleInstrumentChange = () => {
      loadGoalsRef.current();
      loadCompletedGoalsRef.current();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('instrumentChanged', handleInstrumentChange);
      
      return () => {
        window.removeEventListener('instrumentChanged', handleInstrumentChange);
      };
    }
  }, []); // イベントリスナーは一度だけ設定

  // 画面にフォーカスが当たった時にデータを再読み込み（refを使用）
  const loadGoalsFocusRef = useRef(loadGoals);
  const loadCompletedGoalsFocusRef = useRef(loadCompletedGoals);
  const loadUserProfileFocusRef = useRef(loadUserProfile);

  useEffect(() => {
    loadGoalsFocusRef.current = loadGoals;
    loadCompletedGoalsFocusRef.current = loadCompletedGoals;
    loadUserProfileFocusRef.current = loadUserProfile;
  }, [loadGoals, loadCompletedGoals, loadUserProfile]);

  useFocusEffect(
    React.useCallback(() => {
      // 認証状態を確認
      if (!isAuthenticated || !user) {
        return;
      }
      
      const now = Date.now();
      // 最後の実行から500ms経過していない場合はスキップ（重複実行防止）
      if (now - lastLoadTimeRef.current < 500) {
        return;
      }
      
      // 画面に戻ってきた時に必ず最新データを取得
      loadGoalsFocusRef.current();
      loadCompletedGoalsFocusRef.current();
      loadUserProfileFocusRef.current();
      lastLoadTimeRef.current = now;
    }, [isAuthenticated, user]) // 認証状態に依存
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
      
      // 現在の目標情報を取得（イベントに含めるため）
      const currentGoal = goals.find(g => g.id === goalId);
      const goalInfo = currentGoal ? {
        id: goalId,
        title: currentGoal.title,
        target_date: currentGoal.target_date,
        show_on_calendar: newValue
      } : null;
      
      // 楽観的更新: UIを即座に更新（パフォーマンス向上）
      setGoals(prevGoals =>
        prevGoals.map(goal =>
          goal.id === goalId ? { ...goal, show_on_calendar: newValue } : goal
        )
      );
      
      // カレンダー画面に即座に反映（データベース更新を待たない）
      if (typeof window !== 'undefined' && goalInfo) {
        if (newValue && goalInfo) {
          // 表示する場合: 目標情報をイベントに含める
          window.dispatchEvent(new CustomEvent('calendarGoalUpdated', {
            detail: {
              goal: {
                title: goalInfo.title,
                target_date: goalInfo.target_date
              },
              show: true
            }
          }));
        } else {
          // 非表示にする場合: nullを送信
          window.dispatchEvent(new CustomEvent('calendarGoalUpdated', {
            detail: {
              goal: null,
              show: false
            }
          }));
        }
      }
      
      // データベース更新は非同期で実行（エラーが発生してもUIは既に更新済み）
      goalService.updateShowOnCalendar(goalId, user.id, newValue).then((result) => {
        // エラーが発生した場合のみ、UIを元に戻す
        if (!result.success || result.error) {
          // show_on_calendarカラムが存在しない場合のエラーは無視（localStorageに保存済み）
          const errorMessage = result.error || '';
          const errorCode = (result as any)?.code || '';
          
          const isShowOnCalendarError = 
            errorCode === 'PGRST204' || 
            errorCode === '42703' || 
            (typeof errorMessage === 'string' && (
              errorMessage.toLowerCase().includes('show_on_calendar') ||
              errorMessage.toLowerCase().includes('column') ||
              errorMessage.toLowerCase().includes('does not exist') ||
              errorMessage.toLowerCase().includes('could not find') ||
              errorMessage.toLowerCase().includes('schema cache')
            ));

          if (!isShowOnCalendarError) {
            // カラムエラー以外のエラーの場合のみ、UIを元に戻す
            setGoals(prevGoals =>
              prevGoals.map(goal =>
                goal.id === goalId ? { ...goal, show_on_calendar: currentValue } : goal
              )
            );
            Alert.alert('エラー', `カレンダー表示設定の更新に失敗しました: ${errorMessage || '不明なエラー'}`);
          }
        }
      }).catch((error) => {
        // 予期しないエラーの場合のみ、UIを元に戻す
        logger.error('カレンダー表示設定の更新エラー:', error);
        setGoals(prevGoals =>
          prevGoals.map(goal =>
            goal.id === goalId ? { ...goal, show_on_calendar: currentValue } : goal
          )
        );
        Alert.alert('エラー', 'カレンダー表示設定の更新に失敗しました');
      });
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

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'personal_short': return '個人目標（短期）';
      case 'personal_long': return '個人目標（長期）';
      default: return '目標';
    }
  };

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'personal_short': return '#4CAF50';
      case 'personal_long': return '#2196F3';
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
      
      {goalsWithDefaults.length === 0 ? (
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
          {goalsWithDefaults.map((goal) => (
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
          placeholder={newGoal.goal_type === 'personal_short' ? '例: ○○を弾けるようになりたい' : '例: 綺麗な音を出せるようになりたい'}
          placeholderTextColor={currentTheme.textSecondary}
          maxLength={50}
          nativeID="goal-title-input"
          accessibilityLabel="目標タイトル"
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
          nativeID="goal-description-input"
          accessibilityLabel="詳細説明"
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
          onPress={() => setShowCalendar(true)}
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
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, { backgroundColor: currentTheme.primary }]} 
        onPress={saveGoal}
      >
        <Text style={styles.saveButtonText}>目標を保存</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}> 
          <Text style={[styles.title, { color: currentTheme.text }]}>
            {(() => {
              // 優先順位: userProfile.nickname > user.name > 'ユーザー'
              const nickname = userProfile?.nickname && userProfile.nickname.trim().length > 0
                ? userProfile.nickname.trim()
                : (user?.name && String(user.name).trim().length > 0
                  ? String(user.name).trim()
                  : 'ユーザー');
              return `${nickname}の目標`;
            })()}
          </Text>
        </View>

        {/* 1. 個人目標セクション */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Target size={24} color={currentTheme.primary} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              {(() => {
                // 優先順位: userProfile.nickname > user.name > '個人目標'
                const nickname = userProfile?.nickname && userProfile.nickname.trim().length > 0
                  ? userProfile.nickname.trim()
                  : (user?.name && String(user.name).trim().length > 0
                    ? String(user.name).trim()
                    : null);
                return nickname ? `${nickname}の目標！` : '個人目標';
              })()}
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

        {/* 設定した目標セクション */}
        <View style={[styles.section, { backgroundColor: 'transparent', marginTop: 16 }]}>
          {goalsWithDefaults.length > 0 && (
            <View style={styles.goalsList}>
              {goalsWithDefaults.map((goal) => (
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
                  {/* 達成済み（is_completed === true または progress_percentage === 100）の場合はカレンダー表示ボタンを非表示 */}
                  {(goal.goal_type === 'personal_short' || goal.goal_type === 'personal_long') && 
                   !goal.is_completed && 
                   goal.progress_percentage !== 100 && (
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