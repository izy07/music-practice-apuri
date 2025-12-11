/**
 * 練習レベル管理のカスタムフック
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getUserProfile, updatePracticeLevel } from '@/repositories/userRepository';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { levels } from '../data/_levels';
import { getInstrumentId } from '@/lib/instrumentUtils';

const LEVEL_CACHE_KEY_PREFIX = 'user_practice_level';

export type PracticeLevel = 'beginner' | 'intermediate' | 'advanced';

interface UsePracticeLevelReturn {
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
  levels: typeof levels;
}

/**
 * 基礎練習レベルの管理フック
 * @param selectedInstrument 選択された楽器ID（楽器ごとにレベルを保存するため）
 */
export const usePracticeLevel = (selectedInstrument?: string | null): UsePracticeLevelReturn => {
  const [selectedLevel, setSelectedLevel] = useState<PracticeLevel>('beginner');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [hasSelectedLevel, setHasSelectedLevel] = useState(false);

  /**
   * 楽器ごとのレベルキャッシュキーを取得
   */
  const getLevelCacheKey = useCallback((instrumentId: string | null): string => {
    if (!instrumentId) {
      return LEVEL_CACHE_KEY_PREFIX;
    }
    return `${LEVEL_CACHE_KEY_PREFIX}:${instrumentId}`;
  }, []);

  /**
   * ユーザーの演奏レベルを確認（楽器ごと）
   * データベースを優先データソースとし、AsyncStorageはキャッシュとして使用
   */
  const checkUserLevel = useCallback(async () => {
    try {
      const instrumentId = getInstrumentId(selectedInstrument);
      const cacheKey = getLevelCacheKey(instrumentId);
      
      logger.debug('ユーザーレベル確認開始', { instrumentId, cacheKey });

      // 楽器が選択されていない場合は、デフォルトレベルを使用
      if (!instrumentId) {
        logger.debug('楽器が選択されていないため、デフォルトレベルを使用');
        setSelectedLevel('beginner');
        setUserLevel(null);
        setHasSelectedLevel(false);
        setIsFirstTime(false);
        setShowLevelModal(false);
        return;
      }

      // まずローカルキャッシュから読み込み（楽器ごと）
      const cached = await AsyncStorage.getItem(cacheKey);
      logger.debug('ローカルキャッシュ（楽器ごと）:', cached);

      if (cached && cached !== '') {
        setUserLevel(cached);
        setSelectedLevel(cached as PracticeLevel);
        setHasSelectedLevel(true);
        setIsFirstTime(false);
        setShowLevelModal(false);
        logger.debug('ローカルキャッシュからレベル復元（楽器ごと）:', cached);
        return;
      }

      // キャッシュがない場合: データベースから取得を試みる（オフライン時はスキップ）
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profileResult = await getUserProfile(user.id);
          
          if (!profileResult.error && profileResult.data) {
            const profile = profileResult.data;
            // データベースに楽器ごとのレベルが保存されている場合は使用
            // 現在は全体のpractice_levelのみなので、楽器ごとの保存はAsyncStorageのみ
            logger.debug('データベースのレベル（全体）:', profile?.practice_level);
          }
        }
      } catch (dbError) {
        logger.warn('データベースアクセスエラー（オフライン時など）:', dbError);
      }

      // ここまで来たら未設定: チェック完了後にのみモーダルを表示
      logger.warn('レベル未設定（楽器ごと）。モーダルを表示', { instrumentId });
      setIsFirstTime(true);
      setHasSelectedLevel(false);
      setUserLevel(null);
      setShowLevelModal(true);
    } catch (error) {
      logger.error('ユーザーレベル確認エラー:', error);
      // エラー時もキャッシュから復元を試みる
      try {
        const instrumentId = getInstrumentId(selectedInstrument);
        const cacheKey = getLevelCacheKey(instrumentId);
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && cached !== '') {
          setUserLevel(cached);
          setSelectedLevel(cached as PracticeLevel);
          setHasSelectedLevel(true);
          setIsFirstTime(false);
          setShowLevelModal(false);
          logger.debug('エラー時のフォールバック: ローカルキャッシュからレベル復元:', cached);
        } else {
          // キャッシュもない場合はモーダルを表示
          setIsFirstTime(true);
          setHasSelectedLevel(false);
          setUserLevel(null);
          setShowLevelModal(true);
        }
      } catch (cacheError) {
        logger.error('キャッシュ読み込みエラー:', cacheError);
        // エラー時もモーダルを表示
        setIsFirstTime(true);
        setHasSelectedLevel(false);
        setUserLevel(null);
        setShowLevelModal(true);
      }
    }
  }, [selectedInstrument, getLevelCacheKey]);

  /**
   * 初回レベル選択の決定（楽器ごとに保存）
   */
  const handleLevelSelection = useCallback(async (level: PracticeLevel) => {
    try {
      const instrumentId = getInstrumentId(selectedInstrument);
      const cacheKey = getLevelCacheKey(instrumentId);
      
      logger.debug('レベル選択開始（楽器ごと）:', { level, instrumentId, cacheKey });
      
      // モーダルを先に閉じる
      setShowLevelModal(false);
      
      // レベル設定
      setSelectedLevel(level);
      setUserLevel(level);
      setHasSelectedLevel(true);
      setIsFirstTime(false);
      
      // 楽器が選択されていない場合は保存しない
      if (!instrumentId) {
        logger.warn('楽器が選択されていないため、レベルを保存しません');
        return;
      }
      
      // 即時ローカル保存（楽器ごと、オフラインでも次回反映）
      try { 
        await AsyncStorage.setItem(cacheKey, level);
        logger.debug('ローカルストレージに保存完了（楽器ごと）:', { level, instrumentId, cacheKey });
      } catch (storageError) {
        ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
      }

      // データベースには全体のレベルとして保存（後方互換性のため）
      // 将来的に楽器ごとのレベルをDBに保存する場合は、ここを変更
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const result = await updatePracticeLevel(user.id, level);

        if (result.error) {
          ErrorHandler.handle(result.error, 'データベース保存', false);
        } else {
          logger.debug('データベースに保存完了（全体）:', level);
        }
      }
      
      logger.debug('レベル選択完了（楽器ごと）:', { level, instrumentId });
    } catch (error) {
      ErrorHandler.handle(error, 'レベル選択', false);
    }
  }, [selectedInstrument, getLevelCacheKey]);

  /**
   * レベル変更時の確認ダイアログ（楽器ごとに保存）
   */
  const handleLevelChange = useCallback((newLevel: PracticeLevel) => {
    if (newLevel === selectedLevel) return;
    
    const instrumentId = getInstrumentId(selectedInstrument);
    const cacheKey = getLevelCacheKey(instrumentId);
    
    // Alertは呼び出し側で実装
    // ここではレベル変更のロジックのみ提供
    setSelectedLevel(newLevel);
    setUserLevel(newLevel);
    
    // 楽器が選択されていない場合は保存しない
    if (!instrumentId) {
      logger.warn('楽器が選択されていないため、レベルを保存しません');
      return;
    }
    
    // ローカル保存（楽器ごと）
    AsyncStorage.setItem(cacheKey, newLevel).catch((error) => {
      ErrorHandler.handle(error, 'ローカルストレージ保存', false);
    });
    
    // データベース更新（全体のレベルとして保存、後方互換性のため）
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const result = await updatePracticeLevel(user.id, newLevel);
        if (result.error) {
          ErrorHandler.handle(result.error, 'データベース更新', false);
        } else {
          logger.debug('データベースに更新完了（全体）:', newLevel);
        }
      }
    });
  }, [selectedLevel, selectedInstrument, getLevelCacheKey]);

  // 楽器が変更された時、または初回マウント時にレベルを確認
  // 楽器ごとに初回のみモーダルを表示するため、楽器が変更されたら必ずチェック
  useEffect(() => {
    // 楽器が選択されている場合のみチェック
    const instrumentId = getInstrumentId(selectedInstrument);
    if (instrumentId) {
      checkUserLevel();
    } else {
      // 楽器が選択されていない場合はモーダルを非表示
      setShowLevelModal(false);
      setSelectedLevel('beginner');
      setUserLevel(null);
      setHasSelectedLevel(false);
      setIsFirstTime(false);
    }
  }, [selectedInstrument, checkUserLevel]);

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
    levels,
  };
};

