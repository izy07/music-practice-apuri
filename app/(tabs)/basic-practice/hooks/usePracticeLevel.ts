/**
 * 練習レベル管理フック
 * ユーザーの練習レベルの取得、保存、変更を管理
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { getCurrentUser, getUserProfileFields, updateUserProfile } from '@/repositories/userRepository';
import type { Level } from '../types/practice.types';

const LEVEL_CACHE_KEY = 'user_practice_level';

export interface UsePracticeLevelReturn {
  selectedLevel: 'beginner' | 'intermediate' | 'advanced';
  userLevel: string | null;
  hasSelectedLevel: boolean;
  isFirstTime: boolean;
  showLevelModal: boolean;
  setShowLevelModal: (show: boolean) => void;
  handleLevelChange: (newLevel: 'beginner' | 'intermediate' | 'advanced') => void;
  handleLevelSelection: (level: 'beginner' | 'intermediate' | 'advanced') => Promise<void>;
  setSelectedLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  levels: Level[];
}

export function usePracticeLevel(): UsePracticeLevelReturn {
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [hasSelectedLevel, setHasSelectedLevel] = useState(false);

  // レベル定義
  const levels: Level[] = [
    {
      id: 'beginner',
      label: '初級',
      description: '基礎を固める段階',
    },
    {
      id: 'intermediate',
      label: '中級',
      description: '技術を向上させる段階',
    },
    {
      id: 'advanced',
      label: 'マスター',
      description: '表現力を高める段階',
    }
  ];

  // ユーザーの演奏レベルを確認する関数
  const checkUserLevel = useCallback(async () => {
    try {
      logger.debug('ユーザーレベル確認開始');

      // まず現在のユーザーを取得（新規ユーザーかどうかを判断するため）
      const user = await getCurrentUser();
      
      // ユーザーが存在しない場合は、レベル未設定として扱う
      if (!user) {
        logger.warn('ユーザーがログインしていません。レベル未設定として扱います');
        setIsFirstTime(true);
        setHasSelectedLevel(false);
        setUserLevel(null);
        setShowLevelModal(true);
        return;
      }

      // ユーザーIDを含むキャッシュキーを使用（ユーザーごとにキャッシュを分離）
      const userSpecificCacheKey = `${LEVEL_CACHE_KEY}_${user.id}`;
      
      // オフライン対応: まずローカルから読み込み（ユーザー固有のキャッシュ）
      const cached = await AsyncStorage.getItem(userSpecificCacheKey);
      logger.debug('ローカルキャッシュ:', cached);

      if (cached && cached !== '') {
        // キャッシュが存在する場合でも、データベースで確認する（整合性のため）
        const profile = await getUserProfileFields(user.id, 'practice_level');
        
        // データベースにレベルが設定されている場合はそれを優先
        if (profile?.practice_level) {
          setUserLevel(profile.practice_level);
          setSelectedLevel(profile.practice_level as 'beginner' | 'intermediate' | 'advanced');
          setHasSelectedLevel(true);
          setIsFirstTime(false);
          // キャッシュを更新
          await AsyncStorage.setItem(userSpecificCacheKey, profile.practice_level);
          logger.debug('データベースからレベル復元:', profile.practice_level);
          return;
        }
        
        // データベースにレベルがないが、キャッシュがある場合はキャッシュを使用
        setUserLevel(cached);
        setSelectedLevel(cached as 'beginner' | 'intermediate' | 'advanced');
        setHasSelectedLevel(true);
        setIsFirstTime(false);
        logger.debug('ローカルキャッシュからレベル復元:', cached);
        return;
      }

      // オンラインなら最新を取得
      logger.debug('データベースからレベル取得中...');
      const profile = await getUserProfileFields(user.id, 'practice_level');

      logger.debug('データベースのレベル:', profile?.practice_level);

      if (profile?.practice_level) {
        setUserLevel(profile.practice_level);
        setSelectedLevel(profile.practice_level as 'beginner' | 'intermediate' | 'advanced');
        setHasSelectedLevel(true);
        setIsFirstTime(false);
        await AsyncStorage.setItem(userSpecificCacheKey, profile.practice_level);
        logger.debug('データベースからレベル復元:', profile.practice_level);
        return;
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

  // ユーザーの演奏レベルを確認
  useEffect(() => {
    checkUserLevel();
  }, [checkUserLevel]);

  // レベル選択後の処理を分離
  useEffect(() => {
    if (userLevel && !isFirstTime) {
      logger.debug('レベル選択完了:', userLevel);
    }
  }, [userLevel, isFirstTime]);

  // レベル変更時の確認ダイアログ
  const handleLevelChange = useCallback((newLevel: 'beginner' | 'intermediate' | 'advanced') => {
    if (newLevel === selectedLevel) return;
    
    Alert.alert(
      'レベル変更の確認',
      `${levels.find(l => l.id === newLevel)?.label}に変更しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '変更する', 
          onPress: async () => {
            try {
              // レベル設定
              setSelectedLevel(newLevel);
              setUserLevel(newLevel);
              
              // ユーザーを取得してからキャッシュキーを生成
              const user = await getCurrentUser();
              if (user) {
                const userSpecificCacheKey = `${LEVEL_CACHE_KEY}_${user.id}`;
                
                // 即時ローカル保存（オフラインでも次回反映）
                try { 
                  await AsyncStorage.setItem(userSpecificCacheKey, newLevel);
                  logger.debug('ローカルストレージに保存完了:', newLevel);
                } catch (storageError) {
                  ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
                }
                
                // ユーザープロフィールに演奏レベルを保存
                const success = await updateUserProfile(user.id, {
                  practice_level: newLevel,
                  updated_at: new Date().toISOString()
                });

                if (success) {
                  logger.debug('データベースに更新完了:', newLevel);
                }
              }
              
              // レベル変更完了の確認
              logger.debug('レベル変更完了:', newLevel);
            } catch (error) {
              // レベル変更処理エラー
              ErrorHandler.handle(error, 'レベル変更', false);
            }
          }
        }
      ]
    );
  }, [selectedLevel, levels]);

  // 初回レベル選択の決定
  const handleLevelSelection = useCallback(async (level: 'beginner' | 'intermediate' | 'advanced') => {
    try {
      logger.debug('レベル選択開始:', level);
      
      // モーダルを先に閉じる
      setShowLevelModal(false);
      
      // レベル設定
      setSelectedLevel(level);
      setUserLevel(level);
      setHasSelectedLevel(true); // レベル選択完了
      setIsFirstTime(false);
      
      // ユーザーを取得してからキャッシュキーを生成
      const user = await getCurrentUser();
      if (user) {
        const userSpecificCacheKey = `${LEVEL_CACHE_KEY}_${user.id}`;
        
        // 即時ローカル保存（オフラインでも次回反映）
        try { 
          await AsyncStorage.setItem(userSpecificCacheKey, level);
          logger.debug('ローカルストレージに保存完了:', level);
        } catch (storageError) {
          ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
        }

        // ユーザープロフィールに演奏レベルを保存
        const success = await updateUserProfile(user.id, {
          practice_level: level,
          updated_at: new Date().toISOString()
        });

        if (success) {
          logger.debug('データベースに保存完了:', level);
        }
      }
      
      logger.debug('レベル選択完了:', level);
    } catch (error) {
      ErrorHandler.handle(error, 'レベル選択', false);
    }
  }, []);

  return {
    selectedLevel,
    userLevel,
    hasSelectedLevel,
    isFirstTime,
    showLevelModal,
    setShowLevelModal,
    handleLevelChange,
    handleLevelSelection,
    setSelectedLevel,
    levels,
  };
}

