import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Target, Calendar, ChevronLeft, ChevronRight, List, CheckSquare2, Square, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigationUtils';
import EventCalendar from '../components/EventCalendar';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { goalService } from '@/services/goalService';
import { checkGoalLimit, canSaveDataForInstrument } from '@/lib/subscriptionLimits';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { showFeatureLimitAlert, normalizeLimitResult, getDefaultAlertConfig } from '@/lib/featureAccessHelpers';
import { subGoalRepository } from '@/repositories/subGoalRepository';
import type { Instrument } from '@/services/instrumentService';

interface NewGoal {
  title: string;
  description: string;
  target_date: string;
  goal_type: 'personal_short' | 'personal_long';
}

interface NewSubGoal {
  id: string;
  title: string;
  is_completed: boolean;
}

export default function AddGoalScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { entitlement } = useSubscription();
  const { user } = useAuthAdvanced();
  
  const [newGoal, setNewGoal] = useState<NewGoal>({
    title: '',
    description: '',
    target_date: '',
    goal_type: 'personal_short'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [goalLimitStatus, setGoalLimitStatus] = useState<{ canCreate: boolean; currentCount: number; limit: number } | null>(null);
  const [subGoals, setSubGoals] = useState<NewSubGoal[]>([]);
  const [newSubGoalTitle, setNewSubGoalTitle] = useState('');

  // 画面表示時に目標数の制限を事前チェック
  useEffect(() => {
    const checkLimitOnMount = async () => {
      if (!user?.id || entitlement?.isEntitled) {
        return; // プレミアムユーザーはチェック不要
      }

      try {
        const { getInstrumentId } = require('@/lib/instrumentUtils') as { getInstrumentId: (instrument: string | null) => string | null };
        const instrumentId = getInstrumentId(selectedInstrument);
        
        const limitCheck = await checkGoalLimit(user.id, instrumentId, entitlement);
        setGoalLimitStatus(limitCheck);

        // 既に上限に達している場合は警告を表示
        if (!limitCheck.canCreate) {
          const { instrumentService } = require('@/services/instrumentService');
          const defaultInstruments = instrumentService.getDefaultInstruments();
          const instrument = defaultInstruments.find((i: Instrument) => i.id === instrumentId);
          const instrumentName = instrument?.name || 'この楽器';
          
          Alert.alert(
            '上限に達しています',
            `Freeプランでは各楽器ごとに目標を2つまで設定できます。\n${instrumentName}の現在の設定数: ${limitCheck.currentCount}/2\n\nプレミアムで無制限に設定できます。`,
            [
              { 
                text: '戻る', 
                style: 'cancel',
                onPress: () => safeGoBack(router, '/(tabs)/goals', true)
              },
              { 
                text: 'アップグレードしましょう', 
                onPress: () => router.push('/(tabs)/pricing-plans') 
              }
            ]
          );
        }
      } catch (error) {
        logger.error('目標制限チェックエラー:', error);
      }
    };

    checkLimitOnMount();
  }, [user?.id, selectedInstrument, entitlement]);


  const saveGoal = async () => {
    if (!newGoal.title.trim()) {
      Alert.alert('エラー', '目標タイトルを入力してください');
      return;
    }

    if (!newGoal.goal_type) {
      Alert.alert('エラー', '目標タイプを選択してください');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ユーザーが認証されていません');
        setIsLoading(false);
        return;
      }

      logger.debug('目標作成開始:', { title: newGoal.title, goal_type: newGoal.goal_type });

      const { getInstrumentId } = require('@/lib/instrumentUtils') as { getInstrumentId: (instrument: string | null) => string | null };
      const instrumentId = getInstrumentId(selectedInstrument);
      
      // Freeプランの場合、新しい楽器でデータを保存できるかチェック
      const canSaveCheck = await canSaveDataForInstrument(user.id, instrumentId, entitlement);
      if (!canSaveCheck.canSave) {
        const normalizedResult = normalizeLimitResult(canSaveCheck, 'instrument_new');
        const alertConfig = getDefaultAlertConfig('instrument_new');
        
        showFeatureLimitAlert({
          result: {
            ...normalizedResult,
            title: alertConfig.defaultTitle,
          },
          defaultTitle: alertConfig.defaultTitle,
          defaultMessage: normalizedResult.reason || '新しい楽器で目標を追加するには、プレミアムへアップグレードしてください。',
          upgradeButtonText: alertConfig.upgradeButtonText,
          router,
          onCancel: () => {
            setIsLoading(false);
          },
        });
        return;
      }
      
      // Freeプランの場合、目標設定数をチェック（各楽器ごとに4個まで）
      // プレミアムユーザーはチェック不要
      logger.debug('目標作成: entitlement状態を確認', { 
        isEntitled: entitlement?.isEntitled,
        entitlement: entitlement 
      });
      if (!entitlement?.isEntitled) {
        logger.debug('目標作成: フリープランユーザーのため制限チェックを実行');
        const limitCheck = await checkGoalLimit(user.id, instrumentId, entitlement);
        logger.debug('目標作成: 制限チェック結果', limitCheck);
        if (!limitCheck.canCreate) {
          // 楽器名を取得（メッセージに含めるため）
          const { instrumentService } = require('@/services/instrumentService');
          const defaultInstruments = instrumentService.getDefaultInstruments();
          const instrument = defaultInstruments.find((i: Instrument) => i.id === instrumentId);
          const instrumentName = instrument?.name || 'この楽器';
          
          const normalizedResult = normalizeLimitResult(limitCheck, 'goal_create');
          const alertConfig = getDefaultAlertConfig('goal_create');
          
          showFeatureLimitAlert({
            result: {
              ...normalizedResult,
              title: alertConfig.defaultTitle,
              reason: `Freeプランでは各楽器ごとに目標を2つまで設定できます。\n${instrumentName}の現在の設定数: ${limitCheck.currentCount}/2\n\nプレミアムで無制限に設定できます。`,
            },
            defaultTitle: alertConfig.defaultTitle,
            defaultMessage: normalizedResult.reason || `Freeプランでは各楽器ごとに目標を2つまで設定できます。\n${instrumentName}の現在の設定数: ${limitCheck.currentCount}/2\n\nプレミアムで無制限に設定できます。`,
            upgradeButtonText: alertConfig.upgradeButtonText,
            router,
            onCancel: () => {
              setIsLoading(false);
            },
          });
          return;
        }
      }
      
      const result = await goalService.createGoal(user.id, {
        title: newGoal.title.trim(),
        description: newGoal.description || undefined,
        target_date: newGoal.target_date || undefined,
        goal_type: newGoal.goal_type,
        instrument_id: instrumentId || null,
      });

      if (!result.success) {
        ErrorHandler.handle(new Error(result.error || '目標の作成に失敗しました'), '目標作成', true);
        Alert.alert('エラー', result.error || '目標の作成に失敗しました');
        setIsLoading(false);
        return;
      }

      logger.debug('目標作成成功');

      // 長期目標でサブ目標がある場合、サブ目標も作成
      if (newGoal.goal_type === 'personal_long' && subGoals.length > 0 && result.data) {
        try {
          const goalId = result.data;
          
          for (let i = 0; i < subGoals.length; i++) {
            const subGoal = subGoals[i];
            await subGoalRepository.createSubGoal(goalId, user.id, {
              title: subGoal.title,
              order_index: i,
            });
          }
          logger.debug(`サブ目標を${subGoals.length}個作成しました`);
        } catch (subGoalError) {
          logger.error('サブ目標の作成エラー:', subGoalError);
          // サブ目標の作成に失敗しても目標は作成されているので、警告のみ表示
          Alert.alert('警告', '目標は作成されましたが、サブ目標の作成に失敗しました。目標画面から後で追加できます。');
        }
      }
      
      // カレンダー画面の目標キャッシュをクリア（新しく追加した目標をカレンダーに表示するため）
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const cacheKeyPattern = `short_term_goals_cache_${user.id}_`;
        const allKeys = await AsyncStorage.getAllKeys();
        const goalCacheKeys = allKeys.filter((key: string) => key.startsWith(cacheKeyPattern));
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
      
      // 保存成功後、直接画面遷移（Alertは表示しない）
      logger.debug('目標保存成功、目標画面に戻ります');
      safeGoBack(router, '/(tabs)/goals', true);
    } catch (error) {
      ErrorHandler.handle(error, '目標保存', true);
      Alert.alert('エラー', '目標の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'personal_short': return '#4CAF50';
      case 'personal_long': return '#2196F3';
      default: return '#666666';
    }
  };

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'personal_short': return '短期目標';
      case 'personal_long': return '長期目標';
      default: return '目標';
    }
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(router, '/(tabs)/goals', true)}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>新しい目標を追加</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 目標タイプ選択 */}
        <View style={styles.goalTypeSection}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>目標タイプを選択</Text>
          <View style={styles.goalTypeCards}>
            <TouchableOpacity
              style={[
                styles.goalTypeCard,
                { 
                  borderColor: newGoal.goal_type === 'personal_short' ? currentTheme.primary : currentTheme.secondary,
                  backgroundColor: newGoal.goal_type === 'personal_short' ? `${currentTheme.primary}20` : currentTheme.surface
                }
              ]}
              onPress={() => {
                setNewGoal({...newGoal, goal_type: 'personal_short'});
                // 短期目標に変更した場合、サブ目標をクリア
                setSubGoals([]);
                setNewSubGoalTitle('');
              }}
            >
              <Target size={20} color={newGoal.goal_type === 'personal_short' ? currentTheme.primary : currentTheme.textSecondary} />
              <Text style={[styles.goalTypeTitle, { color: newGoal.goal_type === 'personal_short' ? currentTheme.primary : currentTheme.text }]}>
                短期目標
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.goalTypeCard,
                { 
                  borderColor: newGoal.goal_type === 'personal_long' ? currentTheme.primary : currentTheme.secondary,
                  backgroundColor: newGoal.goal_type === 'personal_long' ? `${currentTheme.primary}20` : currentTheme.surface
                }
              ]}
              onPress={() => setNewGoal({...newGoal, goal_type: 'personal_long'})}
            >
              <Target size={20} color={newGoal.goal_type === 'personal_long' ? currentTheme.primary : currentTheme.textSecondary} />
              <Text style={[styles.goalTypeTitle, { color: newGoal.goal_type === 'personal_long' ? currentTheme.primary : currentTheme.text }]}>
                長期目標
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 目標詳細フォーム */}
        <View style={[styles.formSection, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>目標の詳細</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.text }]}>目標タイトル *</Text>
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
              placeholder={newGoal.goal_type === 'personal_short' ? "例: 曲の譜読みをする\nスケールを正確に弾ける\nカノンを弾けるようになる" : "例: 憧れの曲を弾けるようになる\n高い音域を安定して出せるようにする"}
              placeholderTextColor={currentTheme.textSecondary}
              maxLength={50}
              multiline={true}
              numberOfLines={2}
              textAlignVertical="top"
            />
            <Text style={[styles.characterCount, { color: currentTheme.textSecondary }]}>
              {newGoal.title.length}/50文字
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.text }]}>目標期日</Text>
            <View style={styles.dateInputContainer}>
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
                  {newGoal.target_date ? newGoal.target_date : '日付を選択'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarIconButton, { backgroundColor: `${currentTheme.primary}20` }]}
                onPress={() => setShowCalendar(true)}
                activeOpacity={0.7}
              >
                <Calendar size={20} color={currentTheme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 長期目標の場合: サブ目標（チェックリスト）入力セクション */}
        {newGoal.goal_type === 'personal_long' && (
          <View style={[styles.formSection, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.subGoalsHeader}>
              <List size={18} color={currentTheme.text} />
              <Text style={[styles.sectionTitle, { color: currentTheme.text, marginBottom: 0 }]}>
                やることリスト（最大10個）
              </Text>
            </View>
            <Text style={[styles.subGoalsDescription, { color: currentTheme.textSecondary }]}>
              目標達成のために必要なタスクを追加してください。（進捗率は自動計算）
            </Text>

            {/* サブ目標リスト */}
            {subGoals.length > 0 && (
              <View style={styles.subGoalsList}>
                {subGoals.map((subGoal, index) => (
                  <View key={subGoal.id} style={[styles.subGoalItem, { borderColor: currentTheme.secondary }]}>
                    <View style={styles.subGoalItemContent}>
                      <Text style={[styles.subGoalIndex, { color: currentTheme.textSecondary }]}>
                        {index + 1}.
                      </Text>
                      <Text style={[styles.subGoalText, { color: currentTheme.text }]}>
                        {subGoal.title}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.subGoalDeleteButton}
                      onPress={() => {
                        setSubGoals(subGoals.filter(sg => sg.id !== subGoal.id));
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={16} color={currentTheme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* サブ目標追加入力 */}
            {subGoals.length < 10 && (
              <View style={styles.subGoalInputContainer}>
                <TextInput
                  style={[styles.subGoalInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={newSubGoalTitle}
                  onChangeText={(text) => {
                    if (text.length <= 100) {
                      setNewSubGoalTitle(text);
                    }
                  }}
                  placeholder="サブ目標を入力してください（例: 基礎練習を毎日行う）"
                  placeholderTextColor={currentTheme.textSecondary}
                  maxLength={100}
                />
                <TouchableOpacity
                  style={[
                    styles.addSubGoalButton,
                    { 
                      backgroundColor: currentTheme.primary,
                      opacity: newSubGoalTitle.trim() ? 1 : 0.5
                    }
                  ]}
                  onPress={() => {
                    const title = newSubGoalTitle.trim();
                    if (!title) {
                      Alert.alert('エラー', 'サブ目標のタイトルを入力してください');
                      return;
                    }
                    if (subGoals.length >= 10) {
                      Alert.alert('エラー', 'サブ目標は最大10個まで設定できます');
                      return;
                    }
                    setSubGoals([...subGoals, {
                      id: `temp-${Date.now()}-${Math.random()}`,
                      title: title,
                      is_completed: false,
                    }]);
                    setNewSubGoalTitle('');
                  }}
                  disabled={!newSubGoalTitle.trim() || subGoals.length >= 10}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.addSubGoalButtonText}>追加</Text>
                </TouchableOpacity>
              </View>
            )}

            {subGoals.length >= 10 && (
              <Text style={[styles.subGoalsLimitText, { color: currentTheme.textSecondary }]}>
                サブ目標は最大10個まで設定できます
              </Text>
            )}
          </View>
        )}

        {/* 目標数制限の表示（フリープランの場合） */}
        {!entitlement?.isEntitled && goalLimitStatus && (
          <View style={[styles.limitInfoContainer, { backgroundColor: currentTheme.surface, borderColor: goalLimitStatus.canCreate ? currentTheme.primary : '#FF4444' }]}>
            <Text style={[styles.limitInfoText, { color: currentTheme.text }]}>
              {goalLimitStatus.canCreate 
                ? `目標数: ${goalLimitStatus.currentCount}/${goalLimitStatus.limit}（あと${goalLimitStatus.limit - goalLimitStatus.currentCount}個追加可能）`
                : `上限に達しています: ${goalLimitStatus.currentCount}/${goalLimitStatus.limit}`
              }
            </Text>
            {!goalLimitStatus.canCreate && (
              <Text style={[styles.limitInfoSubText, { color: currentTheme.textSecondary }]}>
                プレミアムで無制限に設定できます
              </Text>
            )}
          </View>
        )}

        {/* 保存ボタン */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              { 
                backgroundColor: (isLoading || (!entitlement?.isEntitled && goalLimitStatus && !goalLimitStatus.canCreate)) ? currentTheme.textSecondary : currentTheme.primary,
                opacity: (isLoading || (!entitlement?.isEntitled && goalLimitStatus && !goalLimitStatus.canCreate)) ? 0.6 : 1
              }
            ]} 
            onPress={saveGoal}
            disabled={isLoading || (!entitlement?.isEntitled && goalLimitStatus !== null && !goalLimitStatus.canCreate)}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isLoading ? '保存中...' : '目標を保存'}
            </Text>
          </TouchableOpacity>
          
          {!isLoading && (
            <Text style={[styles.saveButtonSubText, { color: currentTheme.textSecondary }]}>
              保存後は目標画面に戻ります
            </Text>
          )}
        </View>
      </ScrollView>

      {/* カレンダーモーダル */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Text style={styles.calendarCloseButtonText}>閉じる</Text>
              </TouchableOpacity>
            </View>
            
            <EventCalendar
              onDateSelect={(date: Date) => {
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                setNewGoal({...newGoal, target_date: formattedDate});
                setShowCalendar(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  goalTypeSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  goalTypeCards: {
    flexDirection: 'row',
    gap: 12,
  },
  goalTypeCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    gap: 4,
  },
  goalTypeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  goalTypeDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  formSection: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  input: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 70,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  calendarIconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitInfoContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  limitInfoText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  limitInfoSubText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  saveButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  saveButtonSubText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // カレンダーモーダル用のスタイル
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
    backgroundColor: '#FFFFFF',
    
    
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarCloseButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateInputText: {
    fontSize: 16,
    flex: 1,
  },
  // サブ目標関連のスタイル
  subGoalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  subGoalsDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  subGoalsList: {
    marginBottom: 12,
    gap: 6,
  },
  subGoalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  subGoalItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subGoalIndex: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
  },
  subGoalText: {
    fontSize: 14,
    flex: 1,
  },
  subGoalDeleteButton: {
    padding: 4,
    marginLeft: 4,
  },
  subGoalInputContainer: {
    gap: 8,
  },
  subGoalInput: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 8,
  },
  addSubGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addSubGoalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  subGoalsLimitText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
