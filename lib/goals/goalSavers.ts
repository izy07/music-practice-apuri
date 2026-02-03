/**
 * 目標保存処理を分割
 * 機能を変えずに、大きな関数を小さな関数に分割
 */
import React from 'react';
import { Alert } from 'react-native';
import { Goal, NewGoalData } from '@/lib/tabs/goals/types';
import { goalRepository } from '@/repositories/goalRepository';
import { OfflineStorage, isOnline } from '@/lib/offlineStorage';
import { clearGoalCache } from '@/lib/goals/goalCache';
import { getEffectiveInstrumentId } from '@/lib/instrumentUtils';
import { checkGoalLimit, canSaveDataForInstrument } from '@/lib/subscriptionLimits';
import { validateGoalData } from '@/lib/goals/goalValidators';
import logger from '@/lib/logger';

/**
 * 目標更新処理
 */
export async function updateGoalInDB(
  goalId: string,
  userId: string,
  goalData: NewGoalData,
  instrumentId: string | null,
  onSuccess: () => Promise<void>
): Promise<{ success: boolean; error?: string }> {
  if (!isOnline()) {
    return { success: false, error: 'オフライン時は目標の編集はできません。オンライン時に再度お試しください。' };
  }

  try {
    await goalRepository.updateGoal(goalId, userId, {
      title: goalData.title.trim(),
      description: goalData.description.trim() || null,
      target_date: goalData.target_date || null,
      goal_type: goalData.goal_type,
    });

    await clearGoalCache(userId, instrumentId);
    
    // カレンダー表示更新イベントを発火
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
    }
    
    await onSuccess();
    return { success: true };
  } catch (error) {
    logger.error('目標更新エラー:', error);
    return { success: false, error: '目標の更新に失敗しました' };
  }
}

/**
 * 制限チェック（楽器数制限と目標数制限）
 */
export async function checkGoalLimits(
  userId: string,
  instrumentId: string | null,
  entitlement: { isEntitled?: boolean },
  selectedInstrument: string | null,
  userSelectedInstrumentId: string | null
): Promise<{ canSave: boolean; error?: string; showUpgrade?: boolean }> {
  // Freeプランの場合、新しい楽器でデータを保存できるかチェック
  const canSaveCheck = await canSaveDataForInstrument(userId, instrumentId, entitlement);
  if (!canSaveCheck.canSave) {
    return {
      canSave: false,
      error: canSaveCheck.reason || '新しい楽器で目標を追加するには、プレミアムへアップグレードしてください。',
      showUpgrade: true,
    };
  }

  // Freeプランの場合、目標設定数をチェック（各楽器ごとに4個まで）
  if (!entitlement?.isEntitled) {
    const limitCheck = await checkGoalLimit(userId, instrumentId, entitlement);
    if (!limitCheck.canCreate) {
      // 楽器名を取得（エラーメッセージ表示用）
      const effectiveInstrumentId = getEffectiveInstrumentId(selectedInstrument, userSelectedInstrumentId);
      const { instrumentService } = require('@/services');
      const defaultInstruments = instrumentService.getDefaultInstruments();
      const instrument = defaultInstruments.find((i: { id: string; name: string }) => 
        i.id === instrumentId || i.id === effectiveInstrumentId
      );
      const instrumentName = instrument?.name || 'この楽器';
      
      return {
        canSave: false,
        error: `Freeプランでは各楽器ごとに目標を4つまで設定できます。\n${instrumentName}の現在の設定数: ${limitCheck.currentCount}/${limitCheck.limit}\n\nプレミアムで無制限に設定できます。`,
        showUpgrade: true,
      };
    }
  }

  return { canSave: true };
}

/**
 * オフラインで目標を保存
 */
export async function saveGoalOffline(
  userId: string,
  goalData: NewGoalData,
  instrumentId: string | null
): Promise<Goal> {
  const tempId = `temp_goal_${Date.now()}`;
  const offlineGoal = {
    id: tempId,
    user_id: userId,
    ...goalData,
    progress_percentage: 0,
    is_active: true,
    is_completed: false,
    show_on_calendar: false,
    created_at: new Date().toISOString(),
    is_synced: false,
  };
  
  await OfflineStorage.saveGoal(offlineGoal);
  
  return {
    id: tempId,
    title: goalData.title.trim(),
    description: goalData.description,
    target_date: goalData.target_date,
    progress_percentage: 0,
    goal_type: goalData.goal_type,
    is_active: true,
    is_completed: false,
    show_on_calendar: false,
    instrument_id: instrumentId || null,
    user_id: userId,
  };
}

/**
 * オンラインで目標を保存
 */
export async function saveGoalOnline(
  userId: string,
  goalData: NewGoalData,
  instrumentId: string | null,
  onSuccess: () => Promise<void>
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbSaveStartTime = performance.now();
    await goalRepository.createGoal(userId, goalData);
    const dbSaveEndTime = performance.now();
    logger.debug('[goals.tsx] データベース保存完了:', {
      duration: `${(dbSaveEndTime - dbSaveStartTime).toFixed(2)}ms`,
      goalData
    });
    
    await clearGoalCache(userId, instrumentId);
    
    // カレンダー表示更新イベントを発火
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calendarGoalUpdated'));
    }
    
    await onSuccess();
    return { success: true };
  } catch (error) {
    logger.error('目標保存エラー:', error);
    return { success: false, error: '目標の保存に失敗しました' };
  }
}

/**
 * 目標データを準備（トリム処理など）
 */
export function prepareGoalData(
  newGoal: NewGoalData,
  instrumentId: string | null
): NewGoalData {
  return {
    title: newGoal.title.trim(),
    description: newGoal.description.trim() || undefined,
    target_date: newGoal.target_date || undefined,
    goal_type: newGoal.goal_type,
    instrument_id: instrumentId || null,
  };
}

/**
 * フォームをリセット
 */
export function resetGoalForm(
  setNewGoal: React.Dispatch<React.SetStateAction<{
    title: string;
    description: string;
    target_date: string;
    goal_type: 'personal_short' | 'personal_long';
  }>>,
  setEditingGoalId: React.Dispatch<React.SetStateAction<string | null>>,
  setShowAddGoalForm: React.Dispatch<React.SetStateAction<boolean>>
): void {
  setNewGoal({ title: '', description: '', target_date: '', goal_type: 'personal_short' });
  setEditingGoalId(null);
  setShowAddGoalForm(false);
}
