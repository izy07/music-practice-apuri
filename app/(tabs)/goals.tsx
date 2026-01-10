import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Linking, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Target, Calendar, CircleCheck as CheckCircle, Edit3, Trash2, CheckCircle2, CalendarDays, Square, CheckSquare2, List } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { COMMON_STYLES } from '@/lib/styles';
import logger from '@/lib/logger';
import { styles } from '@/lib/tabs/goals/styles';
import { CompletedGoalsSection } from './goals/components/_CompletedGoalsSection';
import GoalsCalendar from './goals/components/GoalsCalendar';
import { GoalCard } from '@/components/tabs/goals/components/_GoalCard';
import { goalRepository } from '@/repositories/goalRepository';
import { subGoalRepository } from '@/repositories/subGoalRepository';
import { getGoalTypeColor, getGoalTypeLabel } from '@/lib/tabs/goals/utils';
import { getUserProfile } from '@/repositories/userRepository';
import { OfflineStorage, isOnline } from '@/lib/offlineStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorHandler } from '@/lib/errorHandler';
import { getEffectiveInstrumentId } from '@/lib/instrumentUtils';
import { setCurrentRoute } from '@/lib/navigationHistory';
import { useSubscription } from '@/hooks/useSubscription';
import { checkGoalLimit, canSaveDataForInstrument } from '@/lib/subscriptionLimits';

/**
 * アップグレードバナーコンポーネント
 * 
 * フリープランユーザーにプレミアムへのアップグレードを促すバナー
 * 目標数制限（2個まで）を表示し、プレミアムプランへの遷移を提供
 */
interface UpgradeBannerProps {
  currentTheme: {
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
  };
  router: {
    push: (path: string) => void;
  };
}
const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ currentTheme, router }) => (
  <View style={[upgradeBannerStyles.container, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}>
    <View style={upgradeBannerStyles.textContainer}>
      <Text style={[upgradeBannerStyles.title, { color: currentTheme.text }]}>
        2個まで設定可能
      </Text>
      <Text style={[upgradeBannerStyles.subtitle, { color: currentTheme.textSecondary }]}>
        プレミアムで無制限に
      </Text>
    </View>
    <TouchableOpacity
      style={[upgradeBannerStyles.button, { backgroundColor: currentTheme.primary }]}
      onPress={() => router.push('/(tabs)/pricing-plans')}
    >
      <Text style={upgradeBannerStyles.buttonText}>プレミアムへ</Text>
    </TouchableOpacity>
  </View>
);

const upgradeBannerStyles = {
  container: {
    margin: 12,
    marginBottom: 8,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    ...(Platform.OS === 'web' 
      ? { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }
    ),
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 120,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
};

interface SubGoal {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

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
  instrument_id?: string | null; // 楽器IDを追加（達成済み目標のフィルタリングに必要）
  sub_goals?: SubGoal[]; // サブ目標（長期目標の場合のみ）
  user_id?: string; // ユーザーID（サブ目標作成時に必要）
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
  const { entitlement } = useSubscription();
  const { isAuthenticated, user } = useAuthAdvanced();
  
  // 現在のルートを記録（マウント時）
  useEffect(() => {
    setCurrentRoute('/(tabs)/goals');
    return () => {
      // アンマウント時はクリアしない（他の画面に遷移する際に使用するため）
    };
  }, []);
  
  // 目標関連の状態
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subGoalInput, setSubGoalInput] = useState<{ [goalId: string]: string }>({});
  const [showSubGoalInput, setShowSubGoalInput] = useState<{ [goalId: string]: boolean }>({});
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
  
  // 保存処理用のloading state
  const [isSaving, setIsSaving] = useState(false);
  
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
  
  /**
   * 目標一覧を読み込む
   * 
   * 処理フロー:
   * 1. ローディング状態を確認（重複読み込みを防止）
   * 2. 認証状態を確認（既に取得済みのuserを使用）
   * 3. 楽器IDを取得（キャッシュキーとDBフィルタリングの両方で使用）
   * 4. オフライン時はキャッシュから読み込み
   * 5. オンライン時またはキャッシュがない場合はDBから取得（goalRepository経由）
   * 6. クライアント側でもフィルタリング（instrument_idカラムが存在しない場合でも対応）
   * 7. オフラインで保存された目標も追加（未同期のもののみ）
   * 8. フリープランの場合、最新の2個だけを表示（サブスクリプション制限）
   * 9. キャッシュに保存（オフライン対応）
   * 
   * 注意: 認証ユーザー情報は既に取得済みのuserを使用（直接Supabase呼び出しを回避）
   */
  const loadGoals = useCallback(async () => {
    // ローディング状態を確認（重複読み込みを防止）
    if (loadingRef.current) {
      return;
    }
    
    loadingRef.current = true;
    
    try {
      // 認証状態を確認（既に取得済みのuserを使用 - 直接Supabase呼び出しを回避）
      if (!user) {
        loadingRef.current = false;
        return;
      }

      // 楽器IDを取得（キャッシュキーとDBフィルタリングの両方で使用）
      // 有効な楽器IDを取得（統一的なフォールバック処理）
      const instrumentId = getEffectiveInstrumentId(selectedInstrument, user.selected_instrument_id);

      // オフライン時はキャッシュから読み込み（フォールバック処理）
      if (!isOnline()) {
        try {
          const cacheKey = `goals_cache_${user.id}_${instrumentId || 'all'}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            let goalsWithShowOnCalendar = parsed.map((g: GoalFromDB) => ({
              ...g,
              show_on_calendar: g.show_on_calendar ?? false,
              instrument_id: g.instrument_id ?? null, // instrument_idを明示的に保持
            }));
            
            // フリープランの場合、最新の2個だけを表示
            if (!entitlement?.isEntitled) {
              const sortedGoals = [...goalsWithShowOnCalendar].sort((a, b) => {
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateB - dateA; // 降順（新しい順）
              });
              goalsWithShowOnCalendar = sortedGoals.slice(0, 2);
            }
            
            setGoals(goalsWithShowOnCalendar);
            logger.debug('目標データをキャッシュから読み込みました（オフライン）');
            loadingRef.current = false;
            return;
          }
        } catch (cacheError) {
          logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
        }
      }

      // オンライン時またはキャッシュがない場合はデータベースから取得（goalRepository経由）
      // デバッグ: instrumentIdが正しく取得されているか確認
      logger.debug('[goals.tsx] loadGoals開始:', {
        userId: user.id,
        selectedInstrument,
        userSelectedInstrumentId: user.selected_instrument_id,
        instrumentId,
      });
      
      // 目標データを取得（サービスレイヤー経由ではなく、リポジトリ層から直接取得）
      // 理由: キャッシュ処理やオフライン処理などのUI層固有のロジックがあるため
      const goalsData = await goalRepository.getGoals(user.id, instrumentId);
      
      logger.debug('目標データ取得結果:', {
        goalsCount: goalsData.length,
        instrumentId,
        goals: goalsData.map((g: GoalFromDB) => ({
          id: g.id,
          title: g.title,
          instrument_id: g.instrument_id,
        })),
      });
      
      // クライアント側でもフィルタリングを実行（instrument_idカラムが存在しない場合でも対応）
      // データベース側でフィルタリングされているが、念のためクライアント側でも確認
      // 注意: GoalFromDB型を使用してany型を回避
      const filteredGoalsData = goalsData.filter((g: GoalFromDB) => {
        const goalInstrumentId = g.instrument_id;
        // instrument_idフィールドが存在しない場合（カラムが存在しない場合）はすべて表示
        if (goalInstrumentId === undefined) {
          return true;
        }
        if (instrumentId) {
          // 楽器が選択されている場合: その楽器の目標のみ表示（instrument_idがnullの目標は除外）
          return goalInstrumentId === instrumentId;
        } else {
          // 楽器が選択されていない場合: instrument_idがnullの目標のみ表示
          return !goalInstrumentId || goalInstrumentId === null;
        }
      });
      
      logger.debug('フィルタリング後の目標数:', {
        before: goalsData.length,
        after: filteredGoalsData.length,
        instrumentId,
      });
      
      // GoalFromDB型をGoal型にマッピング（show_on_calendarを明示的にbooleanに変換）
      const goalsWithShowOnCalendar = filteredGoalsData.map((g: GoalFromDB): Goal => ({
        ...g,
        show_on_calendar: g.show_on_calendar ?? false,
        instrument_id: g.instrument_id ?? null, // instrument_idを明示的に保持
        user_id: g.user_id || user.id, // user_idを明示的に保持
      }));
      
      // オフラインで保存された目標も追加
      let allGoals: Goal[] = [...goalsWithShowOnCalendar];
      try {
        // 修正: instrumentIdを渡してフィルタリング（OfflineStorage.getGoalsで処理される）
        const offlineGoals = await OfflineStorage.getGoals(instrumentId);
        // 未同期かつ現在のユーザーの目標のみをフィルタリング（型安全性のため明示的に型を指定）
        interface OfflineGoalForFilter {
          id: string;
          user_id: string;
          is_synced: boolean;
        }
        const unsyncedGoals = offlineGoals.filter((g: OfflineGoalForFilter) => !g.is_synced && g.user_id === user.id);
        // フィルタリングは既にOfflineStorage.getGoalsで行われているため、ここでのフィルタリングは不要
        const filteredOfflineGoals = unsyncedGoals;
        
        // オフライン目標をGoal型にマッピング（型安全性のため明示的に型を指定）
        interface OfflineGoalForMapping {
          id: string;
          title: string;
          description?: string;
          target_date?: string;
          progress_percentage?: number;
          goal_type: 'personal_short' | 'personal_long' | 'group';
          is_active?: boolean;
          is_completed?: boolean;
          show_on_calendar?: boolean;
        }
        const offlineGoalsFormatted: Goal[] = filteredOfflineGoals.map((g: OfflineGoalForMapping): Goal => ({
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
        offlineGoalsFormatted.forEach(offlineGoal => {
          if (!allGoals.find(g => g.id === offlineGoal.id)) {
            // show_on_calendarを明示的にbooleanに変換
            const goalWithCalendar: Goal = {
              ...offlineGoal,
              show_on_calendar: Boolean(offlineGoal.show_on_calendar ?? false),
            };
            allGoals.push(goalWithCalendar);
          }
        });
      } catch (offlineError) {
        logger.debug('オフライン目標読み込みエラー（無視）:', offlineError);
      }
      
      // フリープランの場合、最新の2個だけを表示（サブスクリプション制限）
      // 注意: 各楽器ごとに2個までの制限を適用（instrumentIdごとに個別に制限）
      if (!entitlement?.isEntitled) {
        // created_atでソート（新しい順 - FIFO: First In, First Out）
        // 最新に作成した目標から優先的に表示（重要度や進捗は考慮しない）
        const sortedGoals = [...allGoals].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // 降順（新しい順）
        });
        // 最新の2個だけを取得（FREE_PLAN_LIMITS.GOALS_COUNT_PER_INSTRUMENT = 2）
        allGoals = sortedGoals.slice(0, 2);
        
        logger.debug('フリープラン: 最新2個のみ表示', {
          totalCount: sortedGoals.length,
          displayedCount: allGoals.length,
          instrumentId
        });
      }
      
      setGoals(allGoals);
      
      // キャッシュに保存（オフライン対応 - 次回のオフライン時に使用）
      try {
        const cacheKey = `goals_cache_${user.id}_${instrumentId || 'all'}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(allGoals));
        logger.debug('目標データをキャッシュに保存しました');
      } catch (saveError) {
        logger.debug('キャッシュ保存エラー（無視）:', saveError);
      }
    } catch (error) {
      // エラーの詳細を明示的にログに記録（型安全性のためunknown型を使用）
      // 注意: any型を避け、unknown型を使用して型ガードで処理
      let errorDetails: Record<string, unknown> = {};
      
      if (error instanceof Error) {
        errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'), // スタックトレースの最初の5行のみ
        };
      } else if (typeof error === 'object' && error !== null) {
        // 型ガード: errorがオブジェクトの場合、プロパティを安全に取得
        const err = error as Record<string, unknown>;
        errorDetails = {
          code: err.code ?? undefined,
          message: err.message ?? undefined,
          details: err.details ?? undefined,
          hint: err.hint ?? undefined,
          status: err.status ?? undefined,
          statusCode: err.statusCode ?? undefined,
          originalError: err.originalError ? String(err.originalError) : undefined,
          errorType: err.constructor?.name ?? typeof error,
          errorString: String(error),
        };
      } else {
        errorDetails = {
          error: String(error),
          errorType: typeof error,
        };
      }
      
      // 空でないプロパティのみを含む
      const filteredDetails = Object.fromEntries(
        Object.entries(errorDetails).filter(([_, value]) => value !== undefined && value !== null)
      );
      
      logger.error('Error loading goals:', Object.keys(filteredDetails).length > 0 ? filteredDetails : { error: 'Unknown error', rawError: String(error) });
      // エラー時もキャッシュから読み込みを試行（フォールバック処理）
      // 認証ユーザー情報は既に取得済みのuserを使用（直接Supabase呼び出しを回避）
      try {
        if (user) {
            const errorInstrumentId = getEffectiveInstrumentId(selectedInstrument, user.selected_instrument_id);
            const cacheKey = `goals_cache_${user.id}_${errorInstrumentId || 'all'}`;
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              let goalsWithShowOnCalendar = parsed.map((g: GoalFromDB) => ({
                ...g,
                show_on_calendar: g.show_on_calendar ?? false,
              }));
              
              // フリープランの場合、最新の2個だけを表示
              if (!entitlement?.isEntitled) {
                const sortedGoals = [...goalsWithShowOnCalendar].sort((a, b) => {
                  const dateA = new Date(a.created_at || 0).getTime();
                  const dateB = new Date(b.created_at || 0).getTime();
                  return dateB - dateA; // 降順（新しい順）
                });
                goalsWithShowOnCalendar = sortedGoals.slice(0, 2);
              }
              
              setGoals(goalsWithShowOnCalendar);
              logger.debug('エラー時、目標データをキャッシュから読み込みました');
            }
          }
        } catch (cacheError) {
          // キャッシュ読み込みエラーは無視
        }
    } finally {
      // ローディング状態をリセット（エラー時も確実にリセット）
      loadingRef.current = false;
    }
  }, [selectedInstrument, user?.selected_instrument_id, entitlement, user]);

  /**
   * 達成済み目標を読み込む
   * 
   * 処理フロー:
   * 1. 認証状態を確認（既に取得済みのuserを使用）
   * 2. 楽器IDを取得（キャッシュキーとDBフィルタリングの両方で使用）
   * 3. オフライン時はキャッシュから読み込み、オンライン時はDBから取得
   * 4. 楽器IDでフィルタリング（クライアント側でも追加のフィルタリング）
   * 5. キャッシュに保存（オフライン対応）
   */
  const loadCompletedGoals = useCallback(async () => {
    try {
      // 認証状態を確認（既に取得済みのuserを使用 - 直接Supabase呼び出しを回避）
      if (!user) {
        return;
      }

      // 楽器IDを取得（キャッシュキーとDBフィルタリングの両方で使用）
      // 有効な楽器IDを取得（統一的なフォールバック処理）
      const instrumentId = getEffectiveInstrumentId(selectedInstrument, user.selected_instrument_id);

      // オフライン時はキャッシュから読み込み
      if (!isOnline()) {
        try {
          const cacheKey = `completed_goals_cache_${user.id}_${instrumentId || 'all'}`;
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

      const completedGoalsData = await goalRepository.getCompletedGoals(user.id, instrumentId);
      
      // 楽器IDでフィルタリング（クライアント側でも追加のフィルタリング）
      // データベース側でフィルタリングされているが、念のためクライアント側でも確認
      // 注意: GoalFromDB型を使用してany型を回避
      const filteredCompletedGoals = completedGoalsData.filter((g: GoalFromDB) => {
        const goalInstrumentId = g.instrument_id;
        if (instrumentId) {
          // 楽器が選択されている場合: その楽器の目標のみ表示（instrument_idがnullの目標は除外）
          return goalInstrumentId === instrumentId;
        } else {
          // 楽器が選択されていない場合: instrument_idがnullの目標のみ表示
          return !goalInstrumentId || goalInstrumentId === null;
        }
      });
      
      // 型アサーションを削減: GoalFromDBをGoal型にマッピング
      const completedGoals: Goal[] = filteredCompletedGoals.map((g: GoalFromDB) => ({
        ...g,
        show_on_calendar: g.show_on_calendar ?? false,
        instrument_id: g.instrument_id ?? null, // instrument_idを明示的に保持
      }));
      setCompletedGoals(completedGoals);
      
      // キャッシュに保存（オフライン対応）
      try {
        const cacheKey = `completed_goals_cache_${user.id}_${instrumentId || 'all'}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(completedGoalsData));
        logger.debug('達成済み目標データをキャッシュに保存しました');
      } catch (saveError) {
        logger.debug('キャッシュ保存エラー（無視）:', saveError);
      }
    } catch (error) {
      logger.error('Error loading completed goals:', error);
      // エラー時もキャッシュから読み込みを試行（フォールバック処理）
      // 認証ユーザー情報は既に取得済みのuserを使用（直接Supabase呼び出しを回避）
      try {
        if (user) {
          const errorInstrumentId = getEffectiveInstrumentId(selectedInstrument, user.selected_instrument_id);
          const cacheKey = `completed_goals_cache_${user.id}_${errorInstrumentId || 'all'}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setCompletedGoals(parsed);
            logger.debug('エラー時、達成済み目標データをキャッシュから読み込みました');
          }
        }
      } catch (cacheError) {
        // キャッシュ読み込みエラーは無視（フォールバック処理のため）
      }
    }
  }, [selectedInstrument, user?.selected_instrument_id, user]);

  /**
   * 未同期の目標を同期する処理
   * 
   * 処理フロー:
   * 1. オンライン状態を確認
   * 2. 認証状態を確認（既に取得済みのuserを使用）
   * 3. オフライン保存された目標を取得
   * 4. 各目標について制限チェック（楽器数制限、目標数制限）
   * 5. 制限をクリアした目標のみ同期（goalRepository.createGoal経由）
   * 6. 同期済みとしてマーク（OfflineStorage.markAsSynced）
   * 7. ローカル状態から削除
   * 8. 目標リストを再読み込み
   * 
   * 注意: 制限に達している目標は同期をスキップ（削除はしない）
   */
  const syncOfflineGoals = useCallback(async () => {
    if (!isOnline()) {
      return;
    }

    try {
      // 認証状態を確認（既に取得済みのuserを使用 - 直接Supabase呼び出しを回避）
      if (!user) {
        return;
      }

      const offlineGoals = await OfflineStorage.getGoals();
      // 未同期の目標のみをフィルタリング（型安全性のため明示的に型を指定）
      interface OfflineGoal {
        id: string;
        user_id: string;
        title: string;
        description?: string;
        target_date?: string;
        goal_type: 'personal_short' | 'personal_long' | 'group';
        instrument_id?: string | null;
        is_synced: boolean;
      }
      const unsyncedGoals = offlineGoals.filter((g: OfflineGoal) => !g.is_synced);

      if (unsyncedGoals.length === 0) {
        return;
      }

      logger.debug(`未同期の目標を同期します: ${unsyncedGoals.length}件`);

      // 各オフライン目標を順次同期処理（並列処理は制限チェックの正確性のため避ける）
      for (const offlineGoal of unsyncedGoals) {
        try {
          // オフライン保存された目標を同期する際に、楽器数制限をチェック
          // 注意: 制限チェックは同期時に実行（作成時と同期時で制限状態が変わる可能性があるため）
          const { canSaveDataForInstrument, checkGoalLimit } = await import('@/lib/subscriptionLimits');
          const canSaveCheck = await canSaveDataForInstrument(user.id, offlineGoal.instrument_id || null, entitlement);
          if (!canSaveCheck.canSave) {
            logger.warn('オフライン目標の同期をスキップ: 楽器数制限に達しています', {
              goalId: offlineGoal.id,
              instrumentId: offlineGoal.instrument_id
            });
            // 制限に達している場合は同期をスキップ（削除はしない）
            continue;
          }
          
          // 目標数制限もチェック
          const limitCheck = await checkGoalLimit(user.id, offlineGoal.instrument_id || null, entitlement);
          if (!limitCheck.canCreate) {
            logger.warn('オフライン目標の同期をスキップ: 目標数制限に達しています', {
              goalId: offlineGoal.id,
              currentCount: limitCheck.currentCount,
              limit: limitCheck.limit
            });
            continue;
          }
          
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

  /**
   * ユーザープロフィールを読み込む
   * 
   * 処理フロー:
   * 1. 認証状態を確認
   * 2. ニックネームを取得（優先順位: user.name > user.user_metadata.name/display_name > デフォルト）
   * 3. ユーザープロフィールを取得（getUserProfile経由）
   * 4. 組織情報を取得（プロフィールに含まれる場合）
   * 5. ユーザープロフィール状態を更新
   * 
   * 注意: 認証ユーザー情報は既に取得済みのuserを使用（直接Supabase呼び出しを回避）
   */
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
      // まずuser.nameからニックネームを取得（新規登録時に保存された値）
      // 注意: useAuthAdvancedから取得できるuser.nameを優先（直接Supabase呼び出しを回避）
      let nickname = 'ユーザー';
      if (user.name && String(user.name).trim().length > 0) {
        nickname = String(user.name).trim();
      } else if (user.user_metadata) {
        // user_metadataから取得（userオブジェクトに含まれる場合）
        const metadataName = user.user_metadata.name || user.user_metadata.display_name;
        if (metadataName && String(metadataName).trim().length > 0) {
          nickname = String(metadataName).trim();
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
        // 注意: 既に取得済みのuserオブジェクトを使用（直接Supabase呼び出しを回避）
        let nickname = 'ユーザー';
        if (user?.name && String(user.name).trim().length > 0) {
          nickname = String(user.name).trim();
        } else if (user?.user_metadata) {
          // user_metadataから取得（userオブジェクトに含まれる場合）
          const metadataName = user.user_metadata.name || user.user_metadata.display_name;
          if (metadataName && String(metadataName).trim().length > 0) {
            nickname = String(metadataName).trim();
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

    // 二重保存防止
    if (isSaving) {
      logger.debug('保存処理中です。重複実行を防止します。');
      return;
    }

    try {
      setIsSaving(true);
      
      // 認証状態を確認（既に取得済みのuserを使用 - 直接Supabase呼び出しを回避）
      if (!user) {
        Alert.alert('エラー', 'ユーザーが認証されていません。再度ログインしてください。');
        setIsSaving(false);
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

      // selectedInstrumentが空の場合は、user.selected_instrument_idをフォールバックとして使用
      const instrumentId = getEffectiveInstrumentId(selectedInstrument, user.selected_instrument_id);
      
      // Freeプランの場合、新しい楽器でデータを保存できるかチェック
      const canSaveCheck = await canSaveDataForInstrument(user.id, instrumentId, entitlement);
      if (!canSaveCheck.canSave) {
        Alert.alert(
          'アップグレードが必要です',
          canSaveCheck.reason || '新しい楽器で目標を追加するには、プレミアムへアップグレードしてください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'プレミアムを見る', onPress: () => router.push('/(tabs)/pricing-plans') }
          ]
        );
        setIsSaving(false);
        return;
      }
      
      // Freeプランの場合、目標設定数をチェック（各楽器ごとに2個まで）
      const limitCheck = await checkGoalLimit(user.id, instrumentId, entitlement);
      if (!limitCheck.canCreate) {
        // 楽器名を取得（エラーメッセージ表示用）
        const { getEffectiveInstrumentId } = require('@/lib/instrumentUtils');
        const effectiveInstrumentId = getEffectiveInstrumentId(selectedInstrument, user.selected_instrument_id);
        const { instrumentService } = require('@/services');
        const defaultInstruments = instrumentService.getDefaultInstruments();
        // 型安全性のためany型を回避（Instrument型を推論させる）
        const instrument = defaultInstruments.find((i: { id: string; name: string }) => i.id === instrumentId || i.id === effectiveInstrumentId);
        const instrumentName = instrument?.name || 'この楽器';
        
        Alert.alert(
          '上限に達しました',
          `Freeプランでは各楽器ごとに目標を2つまで設定できます。\n${instrumentName}の現在の設定数: ${limitCheck.currentCount}/2\n\nプレミアムで無制限に設定できます。`,
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'アップグレードしましょう', onPress: () => router.push('/(tabs)/pricing-plans') }
          ]
        );
        setIsSaving(false);
        return;
      }
      
      const goalData = {
        title: newGoal.title.trim(),
        description: newGoal.description.trim() || undefined,
        target_date: newGoal.target_date || undefined,
        goal_type: newGoal.goal_type,
        instrument_id: instrumentId || null,
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
          instrument_id: instrumentId || null, // 楽器IDを追加
        };
        // 楽器IDでフィルタリングしてから追加
        if (instrumentId) {
          // 楽器が選択されている場合: その楽器の目標のみ追加
          if (localGoal.instrument_id === instrumentId) {
            setGoals([...goals, localGoal]);
          }
        } else {
          // 楽器が選択されていない場合: instrument_idがnullの目標のみ追加
          if (!localGoal.instrument_id || localGoal.instrument_id === null) {
            setGoals([...goals, localGoal]);
          }
        }
        
        Alert.alert('保存しました', 'オフラインで保存しました。オンライン時に自動的に同期されます。');
        setNewGoal({ title: '', description: '', target_date: '', goal_type: 'personal_short' });
        setShowAddGoalForm(false);
        return;
      }

      // オンライン時はデータベースに保存
      // 1個目の目標はgoalRepository.createGoalで既にshow_on_calendar: trueで作成される
      // 2個目以降はshow_on_calendar: falseで作成される
      await goalRepository.createGoal(user.id, goalData);

      // 目標リストを再読み込み（新しく作成した目標のIDを取得するため）
      // キャッシュをクリアしてから再読み込み
      try {
        const cacheKey = `goals_cache_${user.id}_${instrumentId || 'all'}`;
        await AsyncStorage.removeItem(cacheKey);
        
        // カレンダー画面の目標キャッシュもクリア（新しく追加した目標をカレンダーに表示するため）
        const cacheKeyPattern = `short_term_goals_cache_${user.id}_`;
        const allKeys = await AsyncStorage.getAllKeys();
        const goalCacheKeys = allKeys.filter(key => key.startsWith(cacheKeyPattern));
        if (goalCacheKeys.length > 0) {
          await AsyncStorage.multiRemove(goalCacheKeys);
          logger.debug('目標追加後、カレンダー画面の目標キャッシュをクリアしました');
        }
        
        // カレンダー表示更新イベントを発火
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
        }
      } catch (cacheError) {
        logger.debug('キャッシュクリアエラー（無視）:', cacheError);
      }
      await loadGoals();

      Alert.alert('成功', '目標を保存しました');
      setNewGoal({ title: '', description: '', target_date: '', goal_type: 'personal_short' });
      setShowAddGoalForm(false);
    } catch (error) {
      logger.error('目標保存エラー:', error);
      // エラー時もオフライン保存を試行（フォールバック処理）
      // 注意: 既に取得済みのuserオブジェクトを使用（直接Supabase呼び出しを回避）
      try {
        if (user) {
          const errorInstrumentId = getEffectiveInstrumentId(selectedInstrument, user.selected_instrument_id);
          const tempId = `temp_goal_${Date.now()}`;
          const offlineGoal = {
            id: tempId,
            user_id: user.id,
            title: newGoal.title.trim(),
            description: newGoal.description.trim() || undefined,
            target_date: newGoal.target_date || undefined,
            goal_type: newGoal.goal_type,
            instrument_id: errorInstrumentId || null,
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
    } finally {
      // 必ずローディング状態をリセット
      setIsSaving(false);
    }
  };

  const updateProgress = async (goalId: string, newProgress: number) => {
    // エラー時に元に戻すために、現在の状態を保存
    const currentGoal = goals.find(g => g.id === goalId);
    const previousProgress = currentGoal?.progress_percentage || 0;
    // 100%達成時にカレンダー表示状態と楽器IDを保存（達成後に同じ楽器の次の目標を自動表示するため）
    const wasShowingOnCalendar = currentGoal?.show_on_calendar === true;
    const goalInstrumentId = currentGoal?.instrument_id || null;
    
    try {
      // 認証状態を確認（既に取得済みのuserを使用 - 直接Supabase呼び出しを回避）
      if (!user) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      // サブ目標がある場合は手動進捗調整を制限
      if (currentGoal?.sub_goals && currentGoal.sub_goals.length > 0) {
        Alert.alert(
          '進捗率は自動計算されます',
          'サブ目標が設定されている場合、進捗率はサブ目標の完了状況から自動的に計算されます。\n手動で変更するには、まずサブ目標を削除してください。',
          [{ text: 'OK' }]
        );
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
          const completedGoal: Goal = {
            ...currentGoal,
            progress_percentage: 100,
            is_completed: true,
            completed_at: new Date().toISOString(),
            instrument_id: currentGoal.instrument_id ?? null, // instrument_idを明示的に保持
          };
          setGoals(prevGoals => prevGoals.filter(g => g.id !== goalId));
          setCompletedGoals(prev => [completedGoal, ...prev]);
        }
        
        // サーバーから最新データを取得（バックグラウンド）
        await Promise.all([
          loadGoals(),
          loadCompletedGoals()
        ]).catch(error => {
          logger.error('達成済み目標の読み込みエラー:', error);
        });
        
        // サービス層を使用して次の目標を自動表示
        if (wasShowingOnCalendar) {
          try {
            const { goalService } = await import('@/services/goalService');
            const result = await goalService.autoShowNextGoalAfterComplete(
              user.id,
              goalId,
              goalInstrumentId
            );
            if (result.success && result.data) {
              logger.debug('達成された目標の代わりに、同じ楽器の次の目標をカレンダーに表示しました', {
                nextGoalId: result.data,
                instrumentId: goalInstrumentId
              });
              // カレンダー表示更新イベントを発火
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
              }
            } else if (result.error) {
              // エラーは無視（目標の自動表示は補助的な機能のため）
              logger.debug('達成後の次の目標の自動表示処理でエラーが発生しました（無視）:', result.error);
            }
          } catch (error) {
            // エラーは無視（目標の自動表示は補助的な機能のため）
            logger.debug('達成後の次の目標の自動表示処理で例外が発生しました（無視）:', error);
          }
        }
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

  /**
   * 目標を達成としてマークする
   * 
   * 処理フロー:
   * 1. 認証状態を確認（既に取得済みのuserを使用）
   * 2. 達成前のカレンダー表示状態と楽器IDを保存
   * 3. 目標を達成としてマーク（goalRepository.completeGoal経由）
   * 4. サーバーから再読み込みして状態を同期
   * 5. カレンダーに表示されていた場合は、次の目標を自動表示
   * 
   * 注意: 認証ユーザー情報は既に取得済みのuserを使用（直接Supabase呼び出しを回避）
   */
  const completeGoal = async (goalId: string) => {
    try {
      // 認証状態を確認（既に取得済みのuserを使用 - 直接Supabase呼び出しを回避）
      if (!user) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      // 達成前にカレンダー表示状態と楽器IDを保存（達成後に同じ楽器の次の目標を自動表示するため）
      const currentGoal = goals.find(g => g.id === goalId);
      const wasShowingOnCalendar = currentGoal?.show_on_calendar === true;
      const goalInstrumentId = currentGoal?.instrument_id || null;

      await goalRepository.completeGoal(goalId, user.id);

      // サーバーから再読み込みして状態を同期
      await Promise.all([
        loadGoals(),
        loadCompletedGoals()
      ]);
      
      // サービス層を使用して次の目標を自動表示
      if (wasShowingOnCalendar) {
        try {
          const { goalService } = await import('@/services/goalService');
          const result = await goalService.autoShowNextGoalAfterComplete(
            user.id,
            goalId,
            goalInstrumentId
          );
          if (result.success && result.data) {
            logger.debug('達成された目標の代わりに、同じ楽器の次の目標をカレンダーに表示しました', {
              nextGoalId: result.data,
              instrumentId: goalInstrumentId
            });
            // カレンダー表示更新イベントを発火
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
            }
          } else if (result.error) {
            // エラーは無視（目標の自動表示は補助的な機能のため）
            logger.debug('達成後の次の目標の自動表示処理でエラーが発生しました（無視）:', result.error);
          }
        } catch (error) {
          // エラーは無視（目標の自動表示は補助的な機能のため）
          logger.debug('達成後の次の目標の自動表示処理で例外が発生しました（無視）:', error);
        }
      }
      
      Alert.alert('おめでとうございます！', '目標を達成しました！');
    } catch (error) {
      Alert.alert('エラー', '目標の達成処理に失敗しました');
    }
  };

  /**
   * 達成済み目標を未達成に戻す
   * 
   * 処理フロー:
   * 1. 認証状態を確認（既に取得済みのuserを使用）
   * 2. 楽観的更新: UIを即座に更新（進捗を90%に戻す）
   * 3. 目標を未達成に戻す（goalRepository.uncompleteGoal経由）
   * 4. サーバーから再読み込みして状態を同期
   * 
   * 注意: 認証ユーザー情報は既に取得済みのuserを使用（直接Supabase呼び出しを回避）
   */
  const uncompleteGoal = async (goalId: string) => {
    try {
      // 認証状態を確認（既に取得済みのuserを使用 - 直接Supabase呼び出しを回避）
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
          progress_percentage: 90, // 100%から90%に戻す
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

  /**
   * 目標のカレンダー表示を更新する
   * 
   * 処理フロー:
   * 1. 認証状態を確認（既に取得済みのuserを使用）
   * 2. 現在の目標情報を取得（エラー時に元に戻すため）
   * 3. 楽観的更新: UIを即座に更新（同じ楽器の他の目標はfalseにする）
   * 4. カレンダー表示を更新（goalService.updateShowOnCalendar経由）
   * 5. カレンダー表示更新イベントを発火
   * 
   * 注意: 各楽器ごとにカレンダーに1つだけ表示できる（newValueがtrueの場合、同じ楽器の他の目標はfalseになる）
   * 注意: 認証ユーザー情報は既に取得済みのuserを使用（直接Supabase呼び出しを回避）
   */
  const setShowOnCalendar = async (goalId: string, newValue: boolean) => {
    try {
      // 認証状態を確認（既に取得済みのuserを使用 - 直接Supabase呼び出しを回避）
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
      
      // 現在の目標の楽器IDを取得
      const currentGoalInstrumentId = currentGoal?.instrument_id || null;
      
      // 楽観的更新: UIを即座に更新（パフォーマンス向上）
      setGoals(prevGoals => {
        // 各楽器ごとにカレンダーに1つだけ表示できるため、newValueがtrueの場合は同じ楽器の他の目標をfalseにする
        if (newValue) {
          return prevGoals.map(goal => {
            // 同じ楽器の目標かをチェック
            const isSameInstrument = 
              (currentGoalInstrumentId === null && (goal.instrument_id === null || goal.instrument_id === undefined)) ||
              (currentGoalInstrumentId !== null && goal.instrument_id === currentGoalInstrumentId);
            
            if (goal.id === goalId) {
              // 選択された目標はtrueにする
              return { ...goal, show_on_calendar: true };
            } else if (isSameInstrument) {
              // 同じ楽器の他の目標はfalseにする
              return { ...goal, show_on_calendar: false };
            } else {
              // 異なる楽器の目標は変更しない
              return goal;
            }
          });
        } else {
          // newValueがfalseの場合は、該当の目標のみ更新
          return prevGoals.map(goal =>
            goal.id === goalId ? { ...goal, show_on_calendar: false } : goal
          );
        }
      });
      
      // サービス層を使用（リポジトリ層の機能を活用）
      try {
        const { goalService } = await import('@/services/goalService');
        const result = await goalService.updateShowOnCalendar(
          goalId,
          user.id,
          newValue,
          currentGoalInstrumentId
        );
        
        if (!result.success) {
          // エラー時はUIを元に戻す
          setGoals(prevGoals =>
            prevGoals.map(goal =>
              goal.id === goalId ? { ...goal, show_on_calendar: currentValue } : goal
            )
          );
          Alert.alert('エラー', `カレンダー表示設定の更新に失敗しました: ${result.error || '不明なエラー'}`);
          return;
        }
        
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
      } catch (error: unknown) {
        // エラー時はUIを元に戻す
        setGoals(prevGoals =>
          prevGoals.map(goal =>
            goal.id === goalId ? { ...goal, show_on_calendar: currentValue } : goal
          )
        );
        // 型安全性のためunknown型を使用して型ガードで処理
        let errorMessage = '不明なエラー';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
          const err = error as Record<string, unknown>;
          errorMessage = (err.message as string) || '不明なエラー';
        }
        Alert.alert('エラー', `カレンダー表示設定の更新に失敗しました: ${errorMessage}`);
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
    
    // 削除前にカレンダー表示状態と楽器IDを保存（削除後に同じ楽器の次の目標を自動表示するため）
    const wasShowingOnCalendar = goalToDelete?.show_on_calendar === true;
    const deletedGoalInstrumentId = goalToDelete?.instrument_id || null;
    
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
      // 認証状態を確認（既に取得済みのuserを使用 - 直接Supabase呼び出しを回避）
      if (!user) {
        logger.error('認証エラー: ユーザーが認証されていません');
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
      
      // サービス層を使用して次の目標を自動表示
      if (wasShowingOnCalendar) {
        try {
          const { goalService } = await import('@/services/goalService');
          const result = await goalService.autoShowNextGoalAfterDelete(
            user.id,
            targetGoalId,
            deletedGoalInstrumentId
          );
          if (result.success && result.data) {
            logger.debug('削除された目標の代わりに、同じ楽器の次の目標をカレンダーに表示しました', {
              nextGoalId: result.data,
              instrumentId: deletedGoalInstrumentId
            });
          }
        } catch (error) {
          // エラーは無視（目標の自動表示は補助的な機能のため）
          logger.warn('削除後の次の目標の自動表示処理でエラーが発生しました（無視）:', error);
        }
      }
      
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
        style={[styles.saveButton, { backgroundColor: currentTheme.primary, opacity: isSaving ? 0.6 : 1 }]} 
        onPress={saveGoal}
        disabled={isSaving}
      >
        {isSaving ? (
          <Text style={styles.saveButtonText}>保存中...</Text>
        ) : (
          <Text style={styles.saveButtonText}>目標を保存</Text>
        )}
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
        {/* フリープラン用アップグレードバナー */}
        {!entitlement.isEntitled && user && (
          <UpgradeBanner
            currentTheme={currentTheme}
            router={router}
          />
        )}

        {/* 1. 個人目標セクション */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionHeader}>
            <Target size={26} color={currentTheme.primary} />
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
            <Plus size={22} color="#FFFFFF" />
            <Text style={[styles.addButtonText, { color: '#FFFFFF' }]}>目標を追加</Text>
          </TouchableOpacity>
        </View>

        {/* 設定した目標セクション */}
        <View style={[styles.section, { backgroundColor: 'transparent', marginTop: 0 }]}>
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

                  {/* 長期目標の場合: サブ目標がある場合はサブ目標リスト、ない場合は手動進捗調整 */}
                  {goal.goal_type === 'personal_long' && (
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
                          {goal.sub_goals && goal.sub_goals.length > 0 && 
                            ` (${goal.sub_goals.filter(sg => sg.is_completed).length}/${goal.sub_goals.length})`
                          }
                        </Text>
                      </View>
                      
                      {/* サブ目標がある場合: サブ目標リストを表示 */}
                      {goal.sub_goals && goal.sub_goals.length > 0 ? (
                        <View style={[styles.subGoalsSection, { backgroundColor: currentTheme.background, borderColor: currentTheme.secondary }]}>
                          <View style={styles.subGoalsHeader}>
                            <List size={14} color={currentTheme.textSecondary} />
                            <Text style={[styles.subGoalsTitle, { color: currentTheme.textSecondary }]}>
                              やることリスト ({goal.sub_goals.length}/10)
                            </Text>
                          </View>
                          {goal.sub_goals.map((subGoal) => (
                            <View key={subGoal.id} style={[styles.subGoalItem, { borderColor: currentTheme.secondary }]}>
                              <TouchableOpacity
                                style={styles.subGoalItemContent}
                                onPress={async () => {
                                  if (!user?.id) return;
                                  try {
                                    const result = await subGoalRepository.toggleSubGoalCompletion(subGoal.id, user.id);
                                    // 目標リストを更新
                                    setGoals(prevGoals => 
                                      prevGoals.map(g => {
                                        if (g.id === goal.id) {
                                          const updatedSubGoals = (g.sub_goals || []).map(sg =>
                                            sg.id === subGoal.id ? result.subGoal : sg
                                          );
                                          return {
                                            ...g,
                                            sub_goals: updatedSubGoals,
                                            progress_percentage: result.updatedProgress,
                                            is_completed: result.updatedProgress === 100,
                                          };
                                        }
                                        return g;
                                      })
                                    );
                                    // 進捗率が100%になった場合は達成済みに移動
                                    if (result.updatedProgress === 100) {
                                      const updatedGoal = goals.find(g => g.id === goal.id);
                                      if (updatedGoal) {
                                        setGoals(prev => prev.filter(g => g.id !== goal.id));
                                        setCompletedGoals(prev => [{
                                          ...updatedGoal,
                                          progress_percentage: 100,
                                          is_completed: true,
                                        }, ...prev]);
                                      }
                                    }
                                  } catch (error) {
                                    console.error('サブ目標の更新エラー:', error);
                                    Alert.alert('エラー', 'サブ目標の更新に失敗しました');
                                  }
                                }}
                                activeOpacity={0.7}
                              >
                                {subGoal.is_completed ? (
                                  <CheckCircle size={20} color={getGoalTypeColor(goal.goal_type)} />
                                ) : (
                                  <Square size={20} color={currentTheme.textSecondary} />
                                )}
                                <Text
                                  style={[
                                    styles.subGoalText,
                                    { color: currentTheme.text },
                                    subGoal.is_completed && styles.subGoalTextCompleted
                                  ]}
                                  numberOfLines={2}
                                >
                                  {subGoal.title}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.subGoalDeleteButton}
                                onPress={async () => {
                                  if (!user?.id) return;
                                  Alert.alert(
                                    'サブ目標を削除',
                                    `「${subGoal.title}」を削除しますか？`,
                                    [
                                      { text: 'キャンセル', style: 'cancel' },
                                      {
                                        text: '削除',
                                        style: 'destructive',
                                        onPress: async () => {
                                          try {
                                            await subGoalRepository.deleteSubGoal(subGoal.id, user.id);
                                            // サブ目標を削除した後、進捗率を再計算
                                            const remainingSubGoals = (goal.sub_goals || []).filter(sg => sg.id !== subGoal.id);
                                            const calculatedProgress = remainingSubGoals.length > 0
                                              ? subGoalRepository.calculateProgressFromSubGoals(remainingSubGoals)
                                              : goal.progress_percentage; // サブ目標が全て削除された場合は既存の進捗率を維持
                                            
                                            // 親目標の進捗率を更新（サブ目標が残っている場合のみ自動計算、全て削除された場合は既存の進捗率を維持）
                                            if (remainingSubGoals.length > 0) {
                                              await goalRepository.updateProgress(goal.id, calculatedProgress, user.id);
                                            }
                                            
                                            // 目標リストを更新
                                            setGoals(prevGoals => 
                                              prevGoals.map(g => {
                                                if (g.id === goal.id) {
                                                  return {
                                                    ...g,
                                                    sub_goals: remainingSubGoals,
                                                    progress_percentage: remainingSubGoals.length > 0 ? calculatedProgress : g.progress_percentage,
                                                    is_completed: remainingSubGoals.length > 0 ? calculatedProgress === 100 : g.is_completed,
                                                  };
                                                }
                                                return g;
                                              })
                                            );
                                            
                                            // サブ目標が全て削除された場合、手動進捗調整モードに戻る（進捗率は既存の値を維持）
                                            if (remainingSubGoals.length === 0) {
                                              logger.debug('サブ目標が全て削除されました。手動進捗調整モードに戻ります。');
                                            }
                                          } catch (error) {
                                            console.error('サブ目標の削除エラー:', error);
                                            Alert.alert('エラー', 'サブ目標の削除に失敗しました');
                                          }
                                        }
                                      }
                                    ]
                                  );
                                }}
                                activeOpacity={0.7}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Trash2 size={16} color={currentTheme.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          ))}
                          {goal.sub_goals.length < 10 && (
                            <>
                              {showSubGoalInput[goal.id] ? (
                                <View style={styles.subGoalInputContainer}>
                                  <TextInput
                                    style={[styles.subGoalInput, { 
                                      backgroundColor: currentTheme.background,
                                      color: currentTheme.text,
                                      borderColor: currentTheme.secondary
                                    }]}
                                    value={subGoalInput[goal.id] || ''}
                                    onChangeText={(text) => setSubGoalInput({ ...subGoalInput, [goal.id]: text })}
                                    placeholder="サブ目標を入力してください"
                                    placeholderTextColor={currentTheme.textSecondary}
                                    maxLength={100}
                                    autoFocus
                                  />
                                  <View style={styles.subGoalInputButtons}>
                                    <TouchableOpacity
                                      style={[styles.subGoalInputButton, { backgroundColor: currentTheme.secondary }]}
                                      onPress={() => {
                                        setShowSubGoalInput({ ...showSubGoalInput, [goal.id]: false });
                                        setSubGoalInput({ ...subGoalInput, [goal.id]: '' });
                                      }}
                                    >
                                      <Text style={[styles.subGoalInputButtonText, { color: currentTheme.text }]}>キャンセル</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={[styles.subGoalInputButton, { backgroundColor: currentTheme.primary }]}
                                      onPress={async () => {
                                        const title = subGoalInput[goal.id]?.trim();
                                        if (!title) {
                                          Alert.alert('エラー', 'サブ目標のタイトルを入力してください');
                                          return;
                                        }
                                        if (!user?.id) {
                                          Alert.alert('エラー', '認証が必要です');
                                          return;
                                        }
                                        
                                        try {
                                          const newSubGoal = await subGoalRepository.createSubGoal(goal.id, user.id, { title });
                                          // サブ目標を追加した後、進捗率を再計算
                                          const updatedSubGoals = [...(goal.sub_goals || []), newSubGoal].sort((a, b) => a.order_index - b.order_index);
                                          const calculatedProgress = subGoalRepository.calculateProgressFromSubGoals(updatedSubGoals);
                                          
                                          // 親目標の進捗率を更新
                                          await goalRepository.updateProgress(goal.id, calculatedProgress, user.id);
                                          
                                          // 目標リストを更新
                                          setGoals(prevGoals => {
                                            const updatedGoals = prevGoals.map(g => {
                                              if (g.id === goal.id) {
                                                return {
                                                  ...g,
                                                  sub_goals: updatedSubGoals,
                                                  progress_percentage: calculatedProgress,
                                                  is_completed: calculatedProgress === 100,
                                                };
                                              }
                                              return g;
                                            });
                                            
                                            // 進捗率が100%になった場合は達成済みに移動
                                            if (calculatedProgress === 100) {
                                              const completedGoal = updatedGoals.find(g => g.id === goal.id);
                                              if (completedGoal) {
                                                setCompletedGoals(prev => [completedGoal, ...prev]);
                                                return updatedGoals.filter(g => g.id !== goal.id);
                                              }
                                            }
                                            
                                            return updatedGoals;
                                          });
                                          
                                          setShowSubGoalInput({ ...showSubGoalInput, [goal.id]: false });
                                          setSubGoalInput({ ...subGoalInput, [goal.id]: '' });
                                        } catch (error: any) {
                                          console.error('サブ目標の追加エラー:', error);
                                          if (error.message?.includes('10個まで')) {
                                            Alert.alert('上限に達しました', 'サブ目標は最大10個まで設定できます');
                                          } else {
                                            Alert.alert('エラー', 'サブ目標の追加に失敗しました');
                                          }
                                        }
                                      }}
                                    >
                                      <Text style={[styles.subGoalInputButtonText, { color: '#FFFFFF' }]}>追加</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={[styles.addSubGoalButton, { borderColor: currentTheme.primary }]}
                                  onPress={() => {
                                    setShowSubGoalInput({ ...showSubGoalInput, [goal.id]: true });
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Plus size={16} color={currentTheme.primary} />
                                  <Text style={[styles.addSubGoalButtonText, { color: currentTheme.primary }]}>
                                    サブ目標を追加
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </>
                          )}
                        </View>
                      ) : (
                        /* サブ目標がない場合: 手動進捗調整ボタンとサブ目標追加ボタン */
                        <>
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
                          <TouchableOpacity
                            style={[styles.addSubGoalButton, { 
                              borderColor: currentTheme.primary,
                              marginTop: 8,
                              backgroundColor: 'transparent'
                            }]}
                            onPress={() => {
                              setShowSubGoalInput({ ...showSubGoalInput, [goal.id]: true });
                            }}
                            activeOpacity={0.7}
                          >
                            <List size={16} color={currentTheme.primary} />
                            <Text style={[styles.addSubGoalButtonText, { color: currentTheme.primary }]}>
                              サブ目標を作成して自動計算にする
                            </Text>
                          </TouchableOpacity>
                          {showSubGoalInput[goal.id] && (
                            <View style={styles.subGoalInputContainer}>
                              <TextInput
                                style={[styles.subGoalInput, { 
                                  backgroundColor: currentTheme.background,
                                  color: currentTheme.text,
                                  borderColor: currentTheme.secondary
                                }]}
                                value={subGoalInput[goal.id] || ''}
                                onChangeText={(text) => setSubGoalInput({ ...subGoalInput, [goal.id]: text })}
                                placeholder="サブ目標を入力してください（最大10個まで）"
                                placeholderTextColor={currentTheme.textSecondary}
                                maxLength={100}
                                autoFocus
                              />
                              <View style={styles.subGoalInputButtons}>
                                <TouchableOpacity
                                  style={[styles.subGoalInputButton, { backgroundColor: currentTheme.secondary }]}
                                  onPress={() => {
                                    setShowSubGoalInput({ ...showSubGoalInput, [goal.id]: false });
                                    setSubGoalInput({ ...subGoalInput, [goal.id]: '' });
                                  }}
                                >
                                  <Text style={[styles.subGoalInputButtonText, { color: currentTheme.text }]}>キャンセル</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.subGoalInputButton, { backgroundColor: currentTheme.primary }]}
                                  onPress={async () => {
                                    const title = subGoalInput[goal.id]?.trim();
                                    if (!title) {
                                      Alert.alert('エラー', 'サブ目標のタイトルを入力してください');
                                      return;
                                    }
                                    if (!user?.id) {
                                      Alert.alert('エラー', '認証が必要です');
                                      return;
                                    }
                                    
                                    try {
                                      const newSubGoal = await subGoalRepository.createSubGoal(goal.id, user.id, { title });
                                      // サブ目標を追加した後、進捗率を再計算
                                      const updatedSubGoals = [...(goal.sub_goals || []), newSubGoal].sort((a, b) => a.order_index - b.order_index);
                                      const calculatedProgress = subGoalRepository.calculateProgressFromSubGoals(updatedSubGoals);
                                      
                                      // 親目標の進捗率を更新
                                      await goalRepository.updateProgress(goal.id, calculatedProgress, user.id);
                                      
                                      // 目標リストを更新
                                      setGoals(prevGoals => {
                                        const updatedGoals = prevGoals.map(g => {
                                          if (g.id === goal.id) {
                                            return {
                                              ...g,
                                              sub_goals: updatedSubGoals,
                                              progress_percentage: calculatedProgress,
                                              is_completed: calculatedProgress === 100,
                                            };
                                          }
                                          return g;
                                        });
                                        
                                        // 進捗率が100%になった場合は達成済みに移動
                                        if (calculatedProgress === 100) {
                                          const completedGoal = updatedGoals.find(g => g.id === goal.id);
                                          if (completedGoal) {
                                            setCompletedGoals(prev => [completedGoal, ...prev]);
                                            return updatedGoals.filter(g => g.id !== goal.id);
                                          }
                                        }
                                        
                                        return updatedGoals;
                                      });
                                      
                                      setShowSubGoalInput({ ...showSubGoalInput, [goal.id]: false });
                                      setSubGoalInput({ ...subGoalInput, [goal.id]: '' });
                                    } catch (error: any) {
                                      console.error('サブ目標の追加エラー:', error);
                                      if (error.message?.includes('10個まで')) {
                                        Alert.alert('上限に達しました', 'サブ目標は最大10個まで設定できます');
                                      } else {
                                        Alert.alert('エラー', 'サブ目標の追加に失敗しました');
                                      }
                                    }
                                  }}
                                >
                                  <Text style={[styles.subGoalInputButtonText, { color: '#FFFFFF' }]}>追加</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </>
                      )}
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