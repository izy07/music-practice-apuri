import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Linking, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Target, Calendar, CircleCheck as CheckCircle, Edit3, Trash2, CheckCircle2, CalendarDays } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { supabase } from '@/lib/supabase';
import { COMMON_STYLES } from '@/lib/styles';
import logger from '@/lib/logger';
import { styles } from '@/lib/tabs/goals/styles';
import { CompletedGoalsSection } from './goals/components/_CompletedGoalsSection';
import GoalsCalendar from './goals/components/GoalsCalendar';
import { goalRepository } from '@/repositories/goalRepository';
import { getUserProfile } from '@/repositories/userRepository';
import { OfflineStorage, isOnline } from '@/lib/offlineStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  
  // データ読み込み関数を先に定義（useEffectで使用するため）
  const loadGoals = useCallback(async () => {
    // リクエスト重複防止
    if (loadingRef.current) {
      return;
    }
    
    loadingRef.current = true;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        loadingRef.current = false;
        return;
      }

      // オフライン時はキャッシュから読み込み
      if (!isOnline()) {
        try {
          const cacheKey = `goals_cache_${user.id}_${selectedInstrument || 'all'}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const goalsWithShowOnCalendar = parsed.map((g: GoalFromDB) => ({
              ...g,
              show_on_calendar: g.show_on_calendar ?? false,
            }));
            setGoals(goalsWithShowOnCalendar);
            logger.debug('目標データをキャッシュから読み込みました（オフライン）');
            loadingRef.current = false;
            return;
          }
        } catch (cacheError) {
          logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
        }
      }

      // オンライン時またはキャッシュがない場合はデータベースから取得
      const goalsData = await goalRepository.getGoals(user.id, selectedInstrument);
      const goalsWithShowOnCalendar = goalsData.map((g: GoalFromDB) => ({
        ...g,
        show_on_calendar: g.show_on_calendar ?? false,
      }));
      
      // オフラインで保存された目標も追加
      try {
        const offlineGoals = await OfflineStorage.getGoals();
        const unsyncedGoals = offlineGoals.filter((g: any) => !g.is_synced && g.user_id === user.id);
        const filteredOfflineGoals = unsyncedGoals.filter((g: any) => {
          if (selectedInstrument) {
            return g.instrument_id === selectedInstrument;
          }
          return !g.instrument_id || g.instrument_id === null;
        });
        
        const offlineGoalsFormatted: Goal[] = filteredOfflineGoals.map((g: any) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          target_date: g.target_date,
          progress_percentage: g.progress_percentage || 0,
          goal_type: g.goal_type,
          is_active: g.is_active !== false,
          is_completed: g.is_completed || false,
          show_on_calendar: g.show_on_calendar || false,
        }));
        
        // オフライン目標とオンライン目標を結合（重複を避ける）
        const allGoals = [...goalsWithShowOnCalendar];
        offlineGoalsFormatted.forEach(offlineGoal => {
          if (!allGoals.find(g => g.id === offlineGoal.id)) {
            allGoals.push(offlineGoal);
          }
        });
        
        setGoals(allGoals);
      } catch (offlineError) {
        logger.debug('オフライン目標読み込みエラー（無視）:', offlineError);
        setGoals(goalsWithShowOnCalendar);
      }
      
      // キャッシュに保存（オフライン対応）
      try {
        const cacheKey = `goals_cache_${user.id}_${selectedInstrument || 'all'}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(goalsData));
        logger.debug('目標データをキャッシュに保存しました');
      } catch (saveError) {
        logger.debug('キャッシュ保存エラー（無視）:', saveError);
      }
    } catch (error) {
      logger.error('Error loading goals:', error);
      // エラー時もキャッシュから読み込みを試行
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const cacheKey = `goals_cache_${user.id}_${selectedInstrument || 'all'}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const goalsWithShowOnCalendar = parsed.map((g: GoalFromDB) => ({
              ...g,
              show_on_calendar: g.show_on_calendar ?? false,
            }));
            setGoals(goalsWithShowOnCalendar);
            logger.debug('エラー時、目標データをキャッシュから読み込みました');
          }
        }
      } catch (cacheError) {
        // キャッシュ読み込みエラーは無視
      }
    } finally {
      loadingRef.current = false;
    }
  }, [selectedInstrument]);

  const loadCompletedGoals = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      // オフライン時はキャッシュから読み込み
      if (!isOnline()) {
        try {
          const cacheKey = `completed_goals_cache_${user.id}_${selectedInstrument || 'all'}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setCompletedGoals(parsed);
            logger.debug('達成済み目標データをキャッシュから読み込みました（オフライン）');
            return;
          }
        } catch (cacheError) {
          logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
        }
      }

      const completedGoalsData = await goalRepository.getCompletedGoals(user.id, selectedInstrument);
      setCompletedGoals(completedGoalsData);
      
      // キャッシュに保存（オフライン対応）
      try {
        const cacheKey = `completed_goals_cache_${user.id}_${selectedInstrument || 'all'}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(completedGoalsData));
        logger.debug('達成済み目標データをキャッシュに保存しました');
      } catch (saveError) {
        logger.debug('キャッシュ保存エラー（無視）:', saveError);
      }
    } catch (error) {
      logger.error('Error loading completed goals:', error);
      // エラー時もキャッシュから読み込みを試行
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const cacheKey = `completed_goals_cache_${user.id}_${selectedInstrument || 'all'}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setCompletedGoals(parsed);
            logger.debug('エラー時、達成済み目標データをキャッシュから読み込みました');
          }
        }
      } catch (cacheError) {
        // キャッシュ読み込みエラーは無視
      }
    }
  }, [selectedInstrument]);

  // 未同期の目標を同期する処理
  const syncOfflineGoals = useCallback(async () => {
    if (!isOnline()) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const offlineGoals = await OfflineStorage.getGoals();
      const unsyncedGoals = offlineGoals.filter((g: any) => !g.is_synced);

      if (unsyncedGoals.length === 0) {
        return;
      }

      logger.debug(`未同期の目標を同期します: ${unsyncedGoals.length}件`);

      for (const offlineGoal of unsyncedGoals) {
        try {
          await goalRepository.createGoal(user.id, {
            title: offlineGoal.title,
            description: offlineGoal.description,
            target_date: offlineGoal.target_date,
            goal_type: offlineGoal.goal_type,
            instrument_id: offlineGoal.instrument_id || null,
          });

          // 同期済みとしてマーク
          await OfflineStorage.markAsSynced(offlineGoal.id);
          
          // ローカル状態から削除
          setGoals(prevGoals => prevGoals.filter(g => g.id !== offlineGoal.id));
        } catch (error) {
          logger.error('目標同期エラー:', error);
          // 個別のエラーは無視して続行
        }
      }

      // 同期後に目標リストを再読み込み
      await loadGoals();
      logger.debug('未同期の目標の同期が完了しました');
    } catch (error) {
      logger.error('目標同期処理エラー:', error);
    }
  }, [loadGoals]);

  const loadUserProfile = useCallback(async () => {
    // 認証状態を確認
      if (!isAuthenticated || !user) {
      setUserProfile({
        nickname: 'ユーザー',
        organization: undefined
      });
      return;
    }
    
    try {
      // まずuser_metadataからニックネームを取得（新規登録時に保存された値）
      let nickname = 'ユーザー';
      if (user.name && String(user.name).trim().length > 0) {
        nickname = String(user.name).trim();
      } else {
        // useAuthAdvancedから取得できない場合は、直接Supabaseから取得
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.user_metadata) {
          const metadataName = authUser.user_metadata.name || authUser.user_metadata.display_name;
          if (metadataName && String(metadataName).trim().length > 0) {
            nickname = String(metadataName).trim();
          }
        }
      }
      
      const profileResult = await getUserProfile(user.id);

      if (profileResult.error) {
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
        setUserProfile({
          nickname: resolvedNickname,
          organization: profile.organization || undefined
        });
      } else {
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

  // goalsを直接使用（goalsWithDefaultsを削除してシンプルに）

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
    
    // 即座に実行
    loadGoals();
    loadCompletedGoals();
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstrument, isAuthenticated, user]); // selectedInstrument、認証状態に依存

  // オンライン時に未同期の目標を同期（別のuseEffectで管理）
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    
    // オンライン時に未同期の目標を同期
    if (isOnline()) {
      syncOfflineGoals();
    }
    
    // ネットワーク状態の変化を監視
    const handleOnline = () => {
      if (isOnline()) {
        syncOfflineGoals();
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('online', handleOnline);
      };
    }
  }, [isAuthenticated, user, syncOfflineGoals]);

  // 画面にフォーカスが当たった時にデータを再読み込み（依存配列に含めて最新の関数を参照）
  useFocusEffect(
    React.useCallback(() => {
      // 認証状態を確認
      if (!isAuthenticated || !user) {
        return;
      }
      
      // 画面に戻ってきた時に必ず最新データを取得
      loadGoals();
      loadCompletedGoals();
      loadUserProfile();
    }, [isAuthenticated, user, loadGoals, loadCompletedGoals, loadUserProfile]) // 依存配列に含めて最新の関数を参照
  );


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

      // バリデーション
      if (newGoal.title.trim().length === 0) {
        Alert.alert('エラー', 'タイトルは必須です');
        return;
      }
      if (newGoal.title.trim().length > 200) {
        Alert.alert('エラー', 'タイトルは200文字以内で入力してください');
        return;
      }

      const goalData = {
        title: newGoal.title.trim(),
        description: newGoal.description.trim() || undefined,
        target_date: newGoal.target_date || undefined,
        goal_type: newGoal.goal_type,
        instrument_id: selectedInstrument || null,
      };

      // オフライン時はAsyncStorageに保存
      if (!isOnline()) {
        const tempId = `temp_goal_${Date.now()}`;
        const offlineGoal = {
          id: tempId,
          user_id: user.id,
          ...goalData,
          progress_percentage: 0,
          is_active: true,
          is_completed: false,
          show_on_calendar: false,
          created_at: new Date().toISOString(),
          is_synced: false,
        };
        
        await OfflineStorage.saveGoal(offlineGoal);
        
        // ローカル状態に追加（即座に表示）
        const localGoal: Goal = {
          id: tempId,
          title: goalData.title,
          description: goalData.description,
          target_date: goalData.target_date,
          progress_percentage: 0,
          goal_type: goalData.goal_type,
          is_active: true,
          is_completed: false,
          show_on_calendar: false,
        };
        setGoals([...goals, localGoal]);
        
        Alert.alert('保存しました', 'オフラインで保存しました。オンライン時に自動的に同期されます。');
        setNewGoal({ title: '', description: '', target_date: '', goal_type: 'personal_short' });
        setShowAddGoalForm(false);
        return;
      }

      // オンライン時はデータベースに保存
      await goalRepository.createGoal(user.id, goalData);

      // 既存の目標でカレンダーに表示されているものがあるかチェック
      const hasVisibleGoal = goals.some(g => g.show_on_calendar === true);
      
      // 目標リストを再読み込み（新しく作成した目標のIDを取得するため）
      await loadGoals();
      
      // カレンダーに表示されている目標がない場合、新しく作成した目標を自動的に表示
      if (!hasVisibleGoal) {
        // 最新の目標（新しく作成したもの）を取得
        const updatedGoalsData = await goalRepository.getGoals(user.id, selectedInstrument);
        const goalsWithShowOnCalendar = updatedGoalsData.map((g: GoalFromDB) => ({
          ...g,
          show_on_calendar: g.show_on_calendar ?? false,
        }));
        
        // 最新の目標（配列の最後）を取得
        const latestGoal = goalsWithShowOnCalendar[goalsWithShowOnCalendar.length - 1];
        
        if (latestGoal) {
          // 新しく作成した目標をカレンダーに表示
          await setShowOnCalendar(latestGoal.id, true);
        }
      }

      Alert.alert('成功', '目標を保存しました');
      setNewGoal({ title: '', description: '', target_date: '', goal_type: 'personal_short' });
      setShowAddGoalForm(false);
    } catch (error) {
      logger.error('目標保存エラー:', error);
      // エラー時もオフライン保存を試行
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const tempId = `temp_goal_${Date.now()}`;
          const offlineGoal = {
            id: tempId,
            user_id: user.id,
            title: newGoal.title.trim(),
            description: newGoal.description.trim() || undefined,
            target_date: newGoal.target_date || undefined,
            goal_type: newGoal.goal_type,
            instrument_id: selectedInstrument || null,
            progress_percentage: 0,
            is_active: true,
            is_completed: false,
            show_on_calendar: false,
            created_at: new Date().toISOString(),
            is_synced: false,
          };
          
          await OfflineStorage.saveGoal(offlineGoal);
          
          const localGoal: Goal = {
            id: tempId,
            title: newGoal.title.trim(),
            description: newGoal.description,
            target_date: newGoal.target_date,
            progress_percentage: 0,
            goal_type: newGoal.goal_type,
            is_active: true,
            is_completed: false,
            show_on_calendar: false,
          };
          setGoals([...goals, localGoal]);
          
          Alert.alert('保存しました', 'オフラインで保存しました。オンライン時に自動的に同期されます。');
          setNewGoal({ title: '', description: '', target_date: '', goal_type: 'personal_short' });
          setShowAddGoalForm(false);
          return;
        }
      } catch (offlineError) {
        logger.error('オフライン保存エラー:', offlineError);
      }
      Alert.alert('エラー', '目標の保存に失敗しました');
    }
  };

  const updateProgress = async (goalId: string, newProgress: number) => {
    // エラー時に元に戻すために、現在の状態を保存
    const currentGoal = goals.find(g => g.id === goalId);
    const previousProgress = currentGoal?.progress_percentage || 0;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      // バリデーション
      if (newProgress < 0 || newProgress > 100) {
        Alert.alert('エラー', '進捗は0-100の範囲で指定してください');
        return;
      }

      // 楽観的更新: UIを即座に更新
      
      if (currentGoal) {
        setGoals(prevGoals => 
          prevGoals.map(goal => 
            goal.id === goalId 
              ? { ...goal, progress_percentage: newProgress }
              : goal
          )
        );
      }

      await goalRepository.updateProgress(goalId, newProgress, user.id);
      
      // 100%達成の場合は、達成済み目標も再読み込みして即座に移動
      if (newProgress === 100) {
        // 達成済み目標に即座に移動（楽観的更新）
        if (currentGoal) {
          const completedGoal = {
            ...currentGoal,
            progress_percentage: 100,
            is_completed: true,
            completed_at: new Date().toISOString(),
          };
          setGoals(prevGoals => prevGoals.filter(g => g.id !== goalId));
          setCompletedGoals(prev => [completedGoal, ...prev]);
        }
        
        // サーバーから最新データを取得（バックグラウンド）
        Promise.all([
          loadGoals(),
          loadCompletedGoals()
        ]).catch(error => {
          logger.error('達成済み目標の読み込みエラー:', error);
        });
      } else {
      loadGoals();
      }
    } catch (error) {
      // エラー時は元の状態に戻す
      if (currentGoal) {
        setGoals(prevGoals => 
          prevGoals.map(goal => 
            goal.id === goalId 
              ? { ...goal, progress_percentage: previousProgress }
              : goal
          )
        );
      }
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

      await goalRepository.completeGoal(goalId, user.id);

      // サーバーから再読み込みして状態を同期
      await Promise.all([
        loadGoals(),
        loadCompletedGoals()
      ]);
      
      Alert.alert('おめでとうございます！', '目標を達成しました！');
    } catch (error) {
      Alert.alert('エラー', '目標の達成処理に失敗しました');
    }
  };

  const uncompleteGoal = async (goalId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      // 達成済み目標から該当の目標を取得
      const currentGoal = completedGoals.find(g => g.id === goalId);
      
      // 楽観的更新: UIを即座に更新
      if (currentGoal) {
        const uncompletedGoal = {
          ...currentGoal,
          is_completed: false,
          completed_at: undefined,
          progress_percentage: 99, // 100%から99%に戻す
        };
        setCompletedGoals(prev => prev.filter(g => g.id !== goalId));
        setGoals(prevGoals => [uncompletedGoal, ...prevGoals]);
      }

      await goalRepository.uncompleteGoal(goalId, user.id);

      // サーバーから再読み込みして状態を同期
      await Promise.all([
        loadGoals(),
        loadCompletedGoals()
      ]);
    } catch (error) {
      // エラー時は元の状態に戻す
      await Promise.all([
        loadGoals(),
        loadCompletedGoals()
      ]);
      Alert.alert('エラー', '目標の未達成への戻しに失敗しました');
    }
  };

  const setShowOnCalendar = async (goalId: string, newValue: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      // 現在の値を取得（エラー時に元に戻すため）
      const currentGoal = goals.find(g => g.id === goalId);
      const currentValue = currentGoal?.show_on_calendar ?? false;
      
      // 現在の目標情報を取得（イベントに含めるため）
      const goalInfo = currentGoal ? {
        id: goalId,
        title: currentGoal.title,
        target_date: currentGoal.target_date,
        show_on_calendar: newValue
      } : null;
      
      // 楽観的更新: UIを即座に更新（パフォーマンス向上）
      setGoals(prevGoals => {
        // 目標はカレンダーに1つだけ表示できるため、newValueがtrueの場合は他の目標をfalseにする
        if (newValue) {
          return prevGoals.map(goal =>
            goal.id === goalId 
              ? { ...goal, show_on_calendar: true }
              : { ...goal, show_on_calendar: false }
          );
        } else {
          // newValueがfalseの場合は、該当の目標のみ更新
          return prevGoals.map(goal =>
            goal.id === goalId ? { ...goal, show_on_calendar: false } : goal
          );
        }
      });
      
      // データベース更新は非同期で実行
      try {
        // 目標はカレンダーに1つだけ表示できるため、newValueがtrueの場合は他の目標も更新
        if (newValue) {
          // 他の目標のshow_on_calendarをfalseにする
          const otherGoals = goals.filter(g => g.id !== goalId && g.show_on_calendar === true);
          for (const otherGoal of otherGoals) {
            try {
              await goalRepository.updateShowOnCalendar(otherGoal.id, false, user.id);
            } catch (error) {
              // 個別のエラーは無視（主要な更新は続行）
              logger.warn('他の目標のカレンダー表示解除エラー:', error);
            }
          }
        }
        
        // 該当の目標を更新
        await goalRepository.updateShowOnCalendar(goalId, newValue, user.id);
        
        // データベース更新成功後、即座にカレンダーに反映（ラグを解消）
        if (typeof window !== 'undefined') {
          // カレンダー画面に即座に反映するため、イベントを発火
          window.dispatchEvent(new CustomEvent('calendarGoalUpdated', {
            detail: {
              goalId,
              showOnCalendar: newValue,
              goalInfo
            }
          }));
        }
      } catch (error: any) {
        // show_on_calendarカラムが存在しない場合のエラーは無視
        const errorMessage = error?.message || '';
        const errorCode = error?.code || '';
        
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
    } catch (error) {
      Alert.alert('エラー', 'カレンダー表示設定の更新に失敗しました');
    }
  };

  const toggleShowOnCalendar = async (goalId: string, currentValue: boolean) => {
    const newValue = !currentValue;
    await setShowOnCalendar(goalId, newValue);
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


  const deleteGoal = async (goalId: string) => {
    logger.debug('deleteGoal関数が呼ばれました', goalId);
    
    // 削除処理の重複実行を防ぐ
    if (isDeleting) {
      logger.debug('削除処理が既に実行中です');
      return;
    }
    
    // goalIdを確実に保持するために、クロージャーではなく明示的に保存
    const targetGoalId = goalId;
    
    // 目標のタイトルを取得（確認メッセージ用）
    const goalToDelete = goals.find(g => g.id === targetGoalId) || completedGoals.find(g => g.id === targetGoalId);
    const goalTitle = goalToDelete?.title || 'この目標';
    
    // 確認ダイアログを表示（Web環境ではwindow.confirmを使用）
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm(`「${goalTitle}」を削除しますか？\n\nこの操作は取り消すことができません。`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            '目標を削除',
            `「${goalTitle}」を削除しますか？\n\nこの操作は取り消すことができません。`,
            [
              { 
                text: 'キャンセル', 
                style: 'cancel',
                onPress: () => {
                  logger.debug('削除がキャンセルされました');
                  resolve(false);
                }
              },
              {
                text: '削除',
                style: 'destructive',
                onPress: () => {
                  resolve(true);
                }
              }
            ]
          );
        });
    
    if (!confirmDelete) {
      logger.debug('削除がキャンセルされました');
      return;
    }
    
    // 削除処理を実行
    setIsDeleting(true);
    logger.debug('削除処理を開始します', targetGoalId);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        logger.error('認証エラー', authError);
        if (Platform.OS === 'web') {
          window.alert('認証が必要です');
        } else {
          Alert.alert('エラー', '認証が必要です');
        }
        setIsDeleting(false);
        return;
      }

      logger.debug('目標を削除します', { goalId: targetGoalId, userId: user.id });
      // 目標を実際に削除
      await goalRepository.deleteGoal(targetGoalId, user.id);
      logger.debug('削除が完了しました');
      
      // ローカル状態からも即座に削除
      setGoals(prevGoals => {
        const filtered = prevGoals.filter(goal => goal.id !== targetGoalId);
        logger.debug('ローカル状態から削除しました', { before: prevGoals.length, after: filtered.length });
        return filtered;
      });
      setCompletedGoals(prevGoals => {
        const filtered = prevGoals.filter(goal => goal.id !== targetGoalId);
        logger.debug('達成済み目標から削除しました', { before: prevGoals.length, after: filtered.length });
        return filtered;
      });
      
      // リストを再読み込みして確実に更新
      logger.debug('リストを再読み込みします');
      await loadGoals();
      await loadCompletedGoals();
      
      logger.debug('削除が完了しました');
      
      // 成功メッセージを表示（Web環境ではwindow.alertを使用）
      if (Platform.OS === 'web') {
        window.alert('目標を削除しました');
      } else {
        Alert.alert('成功', '目標を削除しました');
      }
      setIsDeleting(false);
      
    } catch (error) {
      logger.error('削除エラー', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      // エラーメッセージを表示（Web環境ではwindow.alertを使用）
      if (Platform.OS === 'web') {
        window.alert(`目標の削除に失敗しました: ${errorMessage}`);
      } else {
        Alert.alert('エラー', `目標の削除に失敗しました: ${errorMessage}`);
      }
      setIsDeleting(false);
    }
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
      onDeleteGoal={deleteGoal}
      onUncompleteGoal={uncompleteGoal}
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
          {goals.length > 0 && (
            <View style={styles.goalsList}>
              {goals.map((goal) => (
                <View key={goal.id} style={[styles.goalCard, { backgroundColor: '#FFFFFF', borderColor: currentTheme.secondary + '33' }]}>
                  <View style={[styles.goalHeader, { position: 'relative', zIndex: 1 }]}>
                    <View style={[styles.goalTypeBadge, { backgroundColor: getGoalTypeColor(goal.goal_type) }]}>
                      <Text style={styles.goalTypeBadgeText}>{getGoalTypeLabel(goal.goal_type)}</Text>
                    </View>
                    <View style={styles.goalHeaderRight}>
                      {goal.progress_percentage === 100 && (
                        <CheckCircle size={20} color="#4CAF50" />
                      )}
                      <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: '#FF4444', zIndex: 10 }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          logger.debug('削除ボタンが押されました', goal.id);
                          if (!isDeleting) {
                            logger.debug('deleteGoal関数を呼び出します', goal.id);
                            deleteGoal(goal.id);
                          } else {
                            logger.debug('削除処理が既に実行中のため、処理をスキップします');
                          }
                        }}
                        activeOpacity={0.7}
                        disabled={isDeleting}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={[styles.goalTitle, { color: currentTheme.text }]}>{goal.title}</Text>
                  
                  {goal.target_date && (
                    <View style={styles.goalDate}>
                      <Calendar size={16} color={currentTheme.textSecondary} />
                      <Text style={[styles.goalDateText, { color: currentTheme.textSecondary }]}>目標期日: {goal.target_date}</Text>
                    </View>
                  )}

                  {/* 短期目標以外は進捗を表示 */}
                  {goal.goal_type !== 'personal_short' && (
                    <View style={styles.progressSection}>
                      {/* 進捗スライダー（大きく目立つように） */}
                      <View style={styles.progressSliderContainer}>
                        <View style={styles.progressSliderTrack}>
                        <View 
                          style={[
                              styles.progressSliderFill, 
                            { 
                                width: `${goal.progress_percentage || 0}%`,
                              backgroundColor: getGoalTypeColor(goal.goal_type)
                            }
                          ]} 
                        />
                      </View>
                        <Text style={[styles.progressPercentageLabel, { color: getGoalTypeColor(goal.goal_type) }]}>
                          {goal.progress_percentage || 0}%
                        </Text>
                      </View>
                      
                      {/* 進捗変更ボタン */}
                      <View style={styles.progressButtons}>
                        <TouchableOpacity
                          style={[
                            styles.progressButton,
                            styles.progressButtonMinus,
                            { borderColor: currentTheme.textSecondary + '80' }
                          ]}
                          onPress={() => updateProgress(goal.id, Math.max(0, goal.progress_percentage - 10))}
                        >
                          <Text style={styles.progressButtonText}>-10%</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.progressButton,
                            styles.progressButtonPlus,
                            { 
                              backgroundColor: getGoalTypeColor(goal.goal_type),
                              borderWidth: 1.5,
                              borderColor: getGoalTypeColor(goal.goal_type)
                            }
                          ]}
                          onPress={() => updateProgress(goal.id, Math.min(100, goal.progress_percentage + 10))}
                        >
                          <Text style={[styles.progressButtonText, { color: '#FFFFFF' }]}>+10%</Text>
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
                          setShowOnCalendar(goal.id, true);
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
                          setShowOnCalendar(goal.id, false);
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
      <GoalsCalendar
        visible={showCalendar}
        currentMonth={currentMonth}
        onClose={() => setShowCalendar(false)}
        onSelectDate={selectDate}
        onChangeMonth={changeMonth}
        currentTheme={currentTheme}
      />

    </SafeAreaView>
  );
}