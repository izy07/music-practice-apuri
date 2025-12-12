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
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        logger.debug('ローカルキャッシュ確認（楽器ごと）:', { cached, cacheKey, instrumentId });

        if (cached && cached !== '' && (cached === 'beginner' || cached === 'intermediate' || cached === 'advanced')) {
          const level = cached as PracticeLevel;
          setUserLevel(level);
          setSelectedLevel(level);
          setHasSelectedLevel(true);
          setIsFirstTime(false);
          setShowLevelModal(false);
          logger.debug('✅ ローカルキャッシュからレベル復元（楽器ごと）:', { level, cacheKey, instrumentId });
          return;
        } else if (cached) {
          // 無効な値がキャッシュされている場合は削除
          logger.warn('⚠️ 無効なキャッシュ値を検出、削除します:', { cached, cacheKey });
          await AsyncStorage.removeItem(cacheKey).catch(() => {});
        }
      } catch (cacheReadError) {
        logger.warn('キャッシュ読み込みエラー（続行）:', cacheReadError);
      }

      // キャッシュがない場合: データベースから取得を試みる（オフライン時はスキップ）
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && instrumentId) {
          // まずuser_instrument_profilesテーブルから楽器ごとのレベルを取得を試みる
          try {
            const { data: instrumentProfile, error: instrumentProfileError } = await supabase
              .from('user_instrument_profiles')
              .select('practice_level')
              .eq('user_id', user.id)
              .eq('instrument_id', instrumentId)
              .maybeSingle();

            if (!instrumentProfileError && instrumentProfile?.practice_level) {
              const level = instrumentProfile.practice_level as PracticeLevel;
              setUserLevel(level);
              setSelectedLevel(level);
              setHasSelectedLevel(true);
              setIsFirstTime(false);
              setShowLevelModal(false);
              // キャッシュに保存
              await AsyncStorage.setItem(cacheKey, level);
              logger.debug('✅ user_instrument_profilesからレベル復元（楽器ごと）:', { level, instrumentId });
              return;
            } else if (instrumentProfileError && instrumentProfileError.code !== 'PGRST116') {
              // テーブルが存在しない場合（PGRST116）以外のエラーはログに記録
              logger.debug('user_instrument_profiles取得エラー（無視）:', instrumentProfileError);
            }
          } catch (instrumentProfileError) {
            // user_instrument_profilesテーブルが存在しない可能性があるため、エラーは無視
            logger.debug('user_instrument_profilesアクセスエラー（テーブルが存在しない可能性）:', instrumentProfileError);
          }

          // user_instrument_profilesにない場合、全体のpractice_levelをフォールバックとして使用
          const profileResult = await getUserProfile(user.id);
          if (!profileResult.error && profileResult.data?.practice_level) {
            const level = profileResult.data.practice_level as PracticeLevel;
            // フォールバックとして全体のレベルを使用（初回のみ）
            logger.debug('データベースのレベル（全体、フォールバック）:', level);
            // フォールバックレベルはキャッシュに保存しない（楽器ごとの設定を優先）
          }
        }
      } catch (dbError) {
        logger.warn('データベースアクセスエラー（オフライン時など）:', dbError);
      }

      // ここまで来たら未設定: チェック完了後にのみモーダルを表示
      logger.warn('⚠️ レベル未設定（楽器ごと）。モーダルを表示', { 
        instrumentId, 
        cacheKey,
        selectedInstrument 
      });
      
      // 念のため、もう一度キャッシュを確認（タイミングの問題を回避）
      try {
        const doubleCheckCache = await AsyncStorage.getItem(cacheKey);
        if (doubleCheckCache && doubleCheckCache !== '' && 
            (doubleCheckCache === 'beginner' || doubleCheckCache === 'intermediate' || doubleCheckCache === 'advanced')) {
          const level = doubleCheckCache as PracticeLevel;
          logger.debug('✅ 再確認でキャッシュを発見、レベルを復元:', { level, cacheKey });
          setUserLevel(level);
          setSelectedLevel(level);
          setHasSelectedLevel(true);
          setIsFirstTime(false);
          setShowLevelModal(false);
          return;
        }
      } catch (doubleCheckError) {
        logger.debug('再確認時のキャッシュ読み込みエラー（無視）:', doubleCheckError);
      }
      
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
        logger.debug('エラー時のフォールバック: キャッシュ確認中', { instrumentId, cacheKey });
        
        const cached = await AsyncStorage.getItem(cacheKey);
        logger.debug('エラー時のキャッシュ値:', { cached, cacheKey });
        
        if (cached && cached !== '' && (cached === 'beginner' || cached === 'intermediate' || cached === 'advanced')) {
          const level = cached as PracticeLevel;
          setUserLevel(level);
          setSelectedLevel(level);
          setHasSelectedLevel(true);
          setIsFirstTime(false);
          setShowLevelModal(false);
          logger.debug('✅ エラー時のフォールバック: ローカルキャッシュからレベル復元:', { level, cacheKey });
        } else {
          // キャッシュもない場合はモーダルを表示
          logger.warn('⚠️ キャッシュもないため、モーダルを表示', { instrumentId, cacheKey });
          setIsFirstTime(true);
          setHasSelectedLevel(false);
          setUserLevel(null);
          setShowLevelModal(true);
        }
      } catch (cacheError) {
        logger.error('❌ キャッシュ読み込みエラー:', cacheError);
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
        logger.debug('✅ ローカルストレージに保存完了（楽器ごと）:', { level, instrumentId, cacheKey });
        
        // 保存が成功したことを確認
        const verifyCache = await AsyncStorage.getItem(cacheKey);
        if (verifyCache !== level) {
          logger.error('❌ キャッシュ保存の検証に失敗:', { expected: level, actual: verifyCache, cacheKey });
        } else {
          logger.debug('✅ キャッシュ保存の検証成功:', { level, cacheKey });
        }
      } catch (storageError) {
        logger.error('❌ ローカルストレージ保存エラー:', storageError);
        ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
      }

      // データベースに楽器ごとのレベルを保存（user_instrument_profilesテーブル）
      const { data: { user } } = await supabase.auth.getUser();
      if (user && instrumentId) {
        // user_instrument_profilesテーブルに楽器ごとのレベルを保存
        try {
          const { error: instrumentProfileError } = await supabase
            .from('user_instrument_profiles')
            .upsert({
              user_id: user.id,
              instrument_id: instrumentId,
              practice_level: level,
              level_selected_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'user_id,instrument_id' 
            });

          if (instrumentProfileError) {
            // テーブルが存在しない場合（PGRST116）は無視
            if (instrumentProfileError.code !== 'PGRST116' && instrumentProfileError.code !== '42P01') {
              logger.warn('user_instrument_profiles保存エラー:', instrumentProfileError);
              ErrorHandler.handle(instrumentProfileError, '楽器ごとのレベル保存', false);
            } else {
              logger.debug('user_instrument_profilesテーブルが存在しないため、スキップ');
            }
          } else {
            logger.debug('✅ user_instrument_profilesに保存完了（楽器ごと）:', { level, instrumentId });
          }
        } catch (instrumentProfileError) {
          // テーブルが存在しない可能性があるため、エラーは無視
          logger.debug('user_instrument_profiles保存エラー（テーブルが存在しない可能性）:', instrumentProfileError);
        }

        // 後方互換性のため、全体のpractice_levelも更新
        try {
          const result = await updatePracticeLevel(user.id, level);
          if (result.error) {
            ErrorHandler.handle(result.error, 'データベース保存（全体）', false);
          } else {
            logger.debug('データベースに保存完了（全体）:', level);
          }
        } catch (updateError) {
          logger.warn('全体レベルの保存エラー（無視）:', updateError);
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
    AsyncStorage.setItem(cacheKey, newLevel)
      .then(() => {
        logger.debug('✅ ローカルストレージに更新完了（楽器ごと）:', { newLevel, instrumentId, cacheKey });
        // 保存が成功したことを確認
        return AsyncStorage.getItem(cacheKey);
      })
      .then((verifyCache) => {
        if (verifyCache !== newLevel) {
          logger.error('❌ キャッシュ更新の検証に失敗:', { expected: newLevel, actual: verifyCache, cacheKey });
        } else {
          logger.debug('✅ キャッシュ更新の検証成功:', { newLevel, cacheKey });
        }
      })
      .catch((error) => {
        logger.error('❌ ローカルストレージ更新エラー:', error);
        ErrorHandler.handle(error, 'ローカルストレージ保存', false);
      });
    
    // データベース更新（楽器ごとと全体の両方）
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user && instrumentId) {
        // user_instrument_profilesテーブルに楽器ごとのレベルを保存
        try {
          const { error: instrumentProfileError } = await supabase
            .from('user_instrument_profiles')
            .upsert({
              user_id: user.id,
              instrument_id: instrumentId,
              practice_level: newLevel,
              level_selected_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'user_id,instrument_id' 
            });

          if (instrumentProfileError) {
            if (instrumentProfileError.code !== 'PGRST116' && instrumentProfileError.code !== '42P01') {
              logger.warn('user_instrument_profiles更新エラー:', instrumentProfileError);
            }
          } else {
            logger.debug('✅ user_instrument_profilesに更新完了（楽器ごと）:', { newLevel, instrumentId });
          }
        } catch (instrumentProfileError) {
          logger.debug('user_instrument_profiles更新エラー（無視）:', instrumentProfileError);
        }

        // 後方互換性のため、全体のpractice_levelも更新
        try {
          const result = await updatePracticeLevel(user.id, newLevel);
          if (result.error) {
            ErrorHandler.handle(result.error, 'データベース更新（全体）', false);
          } else {
            logger.debug('データベースに更新完了（全体）:', newLevel);
          }
        } catch (updateError) {
          logger.warn('全体レベルの更新エラー（無視）:', updateError);
        }
      }
    });
  }, [selectedLevel, selectedInstrument, getLevelCacheKey]);

  // 楽器が変更された時、または初回マウント時にレベルを確認
  // 楽器ごとに初回のみモーダルを表示するため、楽器が変更されたら必ずチェック
  useEffect(() => {
    let isMounted = true;
    
    const checkLevel = async () => {
      // 楽器が選択されている場合のみチェック
      const instrumentId = getInstrumentId(selectedInstrument);
      if (instrumentId) {
        logger.debug('🔍 楽器変更を検出、レベル確認を開始:', { instrumentId, selectedInstrument });
        await checkUserLevel();
        if (isMounted) {
          logger.debug('✅ レベル確認完了');
        }
      } else {
        // 楽器が選択されていない場合はモーダルを非表示
        if (isMounted) {
          setShowLevelModal(false);
          setSelectedLevel('beginner');
          setUserLevel(null);
          setHasSelectedLevel(false);
          setIsFirstTime(false);
        }
      }
    };
    
    checkLevel();
    
    return () => {
      isMounted = false;
    };
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

