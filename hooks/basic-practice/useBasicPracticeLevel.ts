/**
 * 基礎練習レベルの管理フック
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getUserProfile, updatePracticeLevel } from '@/repositories/userRepository';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

const LEVEL_CACHE_KEY = 'user_practice_level';

export type PracticeLevel = 'beginner' | 'intermediate' | 'advanced';

interface UseBasicPracticeLevelReturn {
  selectedLevel: PracticeLevel;
  userLevel: string | null;
  isFirstTime: boolean;
  hasSelectedLevel: boolean;
  showLevelModal: boolean;
  setSelectedLevel: (level: PracticeLevel) => void;
  setShowLevelModal: (show: boolean) => void;
  checkUserLevel: () => Promise<void>;
  handleLevelSelection: (level: PracticeLevel) => Promise<void>;
  handleLevelChange: (newLevel: PracticeLevel) => void;
}

/**
 * 基礎練習レベルの管理フック
 */
export const useBasicPracticeLevel = (): UseBasicPracticeLevelReturn => {
  const [selectedLevel, setSelectedLevel] = useState<PracticeLevel>('beginner');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [hasSelectedLevel, setHasSelectedLevel] = useState(false);

  /**
   * ユーザーの演奏レベルを確認
   */
  const checkUserLevel = useCallback(async () => {
    try {
      logger.debug('ユーザーレベル確認開始');

      // オフライン対応: まずローカルから読み込み
      const cached = await AsyncStorage.getItem(LEVEL_CACHE_KEY);
      logger.debug('ローカルキャッシュ:', cached);

      if (cached && cached !== '') {
        setUserLevel(cached);
        setSelectedLevel(cached as PracticeLevel);
        setHasSelectedLevel(true);
        setIsFirstTime(false);
        logger.debug('ローカルキャッシュからレベル復元:', cached);
        return;
      }

      // オンラインなら最新を取得
      logger.debug('データベースからレベル取得中...');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profileResult = await getUserProfile(user.id);
        
        if (profileResult.error) {
          logger.error('プロフィール取得エラー:', profileResult.error);
          throw profileResult.error;
        }

        const profile = profileResult.data;
        logger.debug('データベースのレベル:', profile?.practice_level);

        if (profile?.practice_level) {
          setUserLevel(profile.practice_level);
          setSelectedLevel(profile.practice_level as PracticeLevel);
          setHasSelectedLevel(true);
          setIsFirstTime(false);
          await AsyncStorage.setItem(LEVEL_CACHE_KEY, profile.practice_level);
          logger.debug('データベースからレベル復元:', profile.practice_level);
          return;
        }
      }

      // ここまで来たら未設定: チェック完了後にのみモーダルを表示
      logger.warn('レベル未設定。モーダルを表示');
      setIsFirstTime(true);
      setHasSelectedLevel(false);
      setUserLevel(null);
      setShowLevelModal(true);
    } catch (error) {
      logger.error('ユーザーレベル確認エラー:', error);
    }
  }, []);

  /**
   * 初回レベル選択の決定
   */
  const handleLevelSelection = useCallback(async (level: PracticeLevel) => {
    try {
      logger.debug('レベル選択開始:', level);
      
      // モーダルを先に閉じる
      setShowLevelModal(false);
      
      // レベル設定
      setSelectedLevel(level);
      setUserLevel(level);
      setHasSelectedLevel(true);
      setIsFirstTime(false);
      
      // 即時ローカル保存（オフラインでも次回反映）
      try { 
        await AsyncStorage.setItem(LEVEL_CACHE_KEY, level);
        logger.debug('ローカルストレージに保存完了:', level);
      } catch (storageError) {
        ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
      }

      // ユーザープロフィールに演奏レベルを保存
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const result = await updatePracticeLevel(user.id, level);

        if (result.error) {
          ErrorHandler.handle(result.error, 'データベース保存', false);
        } else {
          logger.debug('データベースに保存完了:', level);
        }
      }
      
      logger.debug('レベル選択完了:', level);
    } catch (error) {
      ErrorHandler.handle(error, 'レベル選択', false);
    }
  }, []);

  /**
   * レベル変更時の確認ダイアログ
   */
  const handleLevelChange = useCallback((newLevel: PracticeLevel) => {
    if (newLevel === selectedLevel) return;
    
    // Alertは呼び出し側で実装
    // ここではレベル変更のロジックのみ提供
    setSelectedLevel(newLevel);
    setUserLevel(newLevel);
    
    // ローカル保存
    AsyncStorage.setItem(LEVEL_CACHE_KEY, newLevel).catch((error) => {
      ErrorHandler.handle(error, 'ローカルストレージ保存', false);
    });
    
    // データベース更新
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const result = await updatePracticeLevel(user.id, newLevel);
        if (result.error) {
          ErrorHandler.handle(result.error, 'データベース更新', false);
        } else {
          logger.debug('データベースに更新完了:', newLevel);
        }
      }
    });
  }, [selectedLevel]);

  // 初回マウント時にレベルを確認
  useEffect(() => {
    checkUserLevel();
  }, [checkUserLevel]);

  return {
    selectedLevel,
    userLevel,
    isFirstTime,
    hasSelectedLevel,
    showLevelModal,
    setSelectedLevel,
    setShowLevelModal,
    checkUserLevel,
    handleLevelSelection,
    handleLevelChange,
  };
};

