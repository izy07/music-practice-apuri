/**
 * 練習レベル管理のカスタムフック
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

const LEVEL_CACHE_KEY = 'user_practice_level';

interface UsePracticeLevelOptions {
  selectedInstrument: string | null;
  userId: string | null;
}

export const usePracticeLevel = ({ selectedInstrument, userId }: UsePracticeLevelOptions) => {
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [hasSelectedLevel, setHasSelectedLevel] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showLevelModal, setShowLevelModal] = useState(false);

  // ユーザーの演奏レベルを確認する関数（楽器ごと）
  const checkUserLevel = useCallback(async () => {
    try {
      logger.debug('ユーザーレベル確認開始');

      // 楽器が選択されていない場合はスキップ
      if (!selectedInstrument) {
        logger.debug('楽器が選択されていません');
        return;
      }

      // オフライン対応: まずローカルから読み込み（楽器ごとのキー）
      const levelCacheKey = `${LEVEL_CACHE_KEY}_${selectedInstrument}`;
      const cached = await AsyncStorage.getItem(levelCacheKey);
      logger.debug('ローカルキャッシュ:', cached);

      if (cached && cached !== '') {
        setUserLevel(cached);
        setSelectedLevel(cached as 'beginner' | 'intermediate' | 'advanced');
        setHasSelectedLevel(true);
        setIsFirstTime(false);
        logger.debug('ローカルキャッシュからレベル復元:', cached);
        return;
      }

      // オンラインなら最新を取得（楽器プロフィールから）
      logger.debug('データベースからレベル取得中...');
      if (userId && selectedInstrument) {
        const { data: instrumentProfile } = await supabase
          .from('user_instrument_profiles')
          .select('practice_level')
          .eq('user_id', userId)
          .eq('instrument_id', selectedInstrument)
          .maybeSingle();

        logger.debug('データベースのレベル:', instrumentProfile?.practice_level);

        if (instrumentProfile?.practice_level) {
          setUserLevel(instrumentProfile.practice_level);
          setSelectedLevel(instrumentProfile.practice_level as 'beginner' | 'intermediate' | 'advanced');
          setHasSelectedLevel(true);
          setIsFirstTime(false);
          await AsyncStorage.setItem(levelCacheKey, instrumentProfile.practice_level);
          logger.debug('データベースからレベル復元:', instrumentProfile.practice_level);
          return;
        }
      }

      // ここまで来たら未設定: チェック完了後にのみモーダルを表示
      logger.debug('レベル未設定。モーダルを表示');
      setIsFirstTime(true);
      setHasSelectedLevel(false);
      setUserLevel(null);
      setShowLevelModal(true);
    } catch (error) {
      ErrorHandler.handle(error, 'ユーザーレベル確認', false);
    }
  }, [selectedInstrument, userId]);

  // レベル変更時の確認ダイアログ
  const handleLevelChange = useCallback((newLevel: 'beginner' | 'intermediate' | 'advanced') => {
    if (newLevel === selectedLevel) return;
    
    Alert.alert(
      'レベル変更の確認',
      `新しいレベルに変更しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '変更する', 
          onPress: async () => {
            try {
              setSelectedLevel(newLevel);
              setUserLevel(newLevel);
              
              // 即時ローカル保存
              const levelCacheKey = selectedInstrument ? `${LEVEL_CACHE_KEY}_${selectedInstrument}` : LEVEL_CACHE_KEY;
              try { 
                await AsyncStorage.setItem(levelCacheKey, newLevel);
                logger.debug('ローカルストレージに保存完了:', newLevel);
              } catch (storageError) {
                ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
              }
              
              // 楽器プロフィールに演奏レベルを保存
              if (userId && selectedInstrument) {
                const { error } = await supabase
                  .from('user_instrument_profiles')
                  .upsert({
                    user_id: userId,
                    instrument_id: selectedInstrument,
                    practice_level: newLevel,
                    level_selected_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'user_id,instrument_id' });

                if (error) {
                  ErrorHandler.handle(error, 'データベース更新', false);
                } else {
                  logger.debug('データベースに更新完了:', newLevel);
                }
              }
              
              logger.debug('レベル変更完了:', newLevel);
            } catch (error) {
              ErrorHandler.handle(error, 'レベル変更', false);
            }
          }
        }
      ]
    );
  }, [selectedLevel, selectedInstrument, userId]);

  // 初回レベル選択の決定
  const handleLevelSelection = useCallback(async (level: 'beginner' | 'intermediate' | 'advanced') => {
    try {
      logger.debug('レベル選択開始:', level);
      
      setShowLevelModal(false);
      setSelectedLevel(level);
      setUserLevel(level);
      setHasSelectedLevel(true);
      setIsFirstTime(false);
      
      // 即時ローカル保存
      const levelCacheKey = selectedInstrument ? `${LEVEL_CACHE_KEY}_${selectedInstrument}` : LEVEL_CACHE_KEY;
      try { 
        await AsyncStorage.setItem(levelCacheKey, level);
        logger.debug('ローカルストレージに保存完了:', level);
      } catch (storageError) {
        ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
      }

      // 楽器プロフィールに演奏レベルを保存
      if (userId && selectedInstrument) {
        const { error } = await supabase
          .from('user_instrument_profiles')
          .upsert({
            user_id: userId,
            instrument_id: selectedInstrument,
            practice_level: level,
            level_selected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,instrument_id' });

        if (error) {
          ErrorHandler.handle(error, 'データベース保存', false);
        } else {
          logger.debug('データベースに保存完了:', level);
        }
      }
      
      logger.debug('レベル選択完了:', level);
    } catch (error) {
      ErrorHandler.handle(error, 'レベル選択', false);
    }
  }, [selectedInstrument, userId]);

  // 初回起動時にレベル選択モーダルを表示
  useEffect(() => {
    if (isFirstTime && !userLevel && !hasSelectedLevel) {
      const timer = setTimeout(() => {
        setShowLevelModal(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isFirstTime, userLevel, hasSelectedLevel]);

  // 初期化時にレベルを確認
  useEffect(() => {
    checkUserLevel();
  }, [checkUserLevel]);

  return {
    selectedLevel,
    userLevel,
    hasSelectedLevel,
    isFirstTime,
    showLevelModal,
    setShowLevelModal,
    handleLevelChange,
    handleLevelSelection,
  };
};

