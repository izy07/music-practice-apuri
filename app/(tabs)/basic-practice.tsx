import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Play, 
  Target, 
  Star,
  BookOpen,
  Music,
  Zap,
  Camera
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostureCameraModal from '@/components/PostureCameraModal';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { practiceService } from '@/services/practiceService';
import { getCurrentUser, getUserProfileFields, updateUserProfile } from '@/repositories/userRepository';
import { getPracticeSessionsByDate, updatePracticeSession, createPracticeSession } from '@/repositories/practiceSessionRepository';
import type { PracticeItem, Level } from './basic-practice/types/practice.types';
import { genericMenus } from './basic-practice/data/genericMenus';
import { instrumentSpecificMenus } from './basic-practice/data/instrumentSpecificMenus';

export default function BasicPracticeScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { t } = useLanguage();
  const { user } = useAuthAdvanced();
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [hasSelectedLevel, setHasSelectedLevel] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<PracticeItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const LEVEL_CACHE_KEY = 'user_practice_level';

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


  // 楽器ID(選択ID) → 楽器キーへの変換
  const getInstrumentKey = () => {
    // UUID → 楽器キーの対応（instrument-selection.tsx で使用している固定UUID）
    const id = selectedInstrument;
    const map: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440001': 'piano',
      '550e8400-e29b-41d4-a716-446655440002': 'guitar',
      '550e8400-e29b-41d4-a716-446655440003': 'violin',
      '550e8400-e29b-41d4-a716-446655440004': 'flute',
      '550e8400-e29b-41d4-a716-446655440005': 'trumpet',
      '550e8400-e29b-41d4-a716-446655440006': 'drums',
      '550e8400-e29b-41d4-a716-446655440007': 'saxophone',
      '550e8400-e29b-41d4-a716-446655440008': 'horn',
      '550e8400-e29b-41d4-a716-446655440009': 'clarinet',
      '550e8400-e29b-41d4-a716-446655440010': 'tuba',
      '550e8400-e29b-41d4-a716-446655440011': 'cello',
      '550e8400-e29b-41d4-a716-446655440012': 'bassoon',
      '550e8400-e29b-41d4-a716-446655440013': 'trombone',
      // TODO: 実装完了後にコメントアウトを解除
      // '550e8400-e29b-41d4-a716-446655440014': 'harp',
      // '550e8400-e29b-41d4-a716-446655440015': 'harp',
      '550e8400-e29b-41d4-a716-446655440016': 'other',
    };
    return map[id] || id || 'other';
  };

  // 楽器名を取得する関数
  const getInstrumentName = () => {
    const instrumentKey = getInstrumentKey();
    const instrumentNames: { [key: string]: string } = {
      'piano': 'ピアノ',
      'guitar': 'ギター',
      'violin': 'バイオリン',
      'flute': 'フルート',
      'trumpet': 'トランペット',
      'drums': '打楽器',
      'saxophone': 'サックス',
      'horn': 'ホルン',
      'clarinet': 'クラリネット',
      'tuba': 'チューバ',
      'cello': 'チェロ',
      'bassoon': 'ファゴット',
      'trombone': 'トロンボーン',
      'oboe': 'オーボエ',
      'harp': 'ハープ',
      'other': '楽器'
    };
    return instrumentNames[instrumentKey] || '楽器';
  };

  // カメラ機能を起動して姿勢確認
  const openCameraForPostureCheck = () => {
    setShowCameraModal(true);
  };

  // 選択された楽器キーでメニューを差し替え
  const instrumentKey = getInstrumentKey();
  const sourceMenus = [
    ...(instrumentSpecificMenus[instrumentKey] || []),
    ...genericMenus,
  ];
  // 選択されたレベルの練習メニューをフィルタリング
  const filteredPracticeMenus = sourceMenus
    .filter(menu => menu.difficulty === selectedLevel);

  // レベル変更時の確認ダイアログ
  const handleLevelChange = (newLevel: 'beginner' | 'intermediate' | 'advanced') => {
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
  };

  // 初回レベル選択の決定
  const handleLevelSelection = async (level: 'beginner' | 'intermediate' | 'advanced') => {
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
  };


  // 楽器名の日本語表示

  const goBack = () => {
    router.back();
  };

  // ユーザーの演奏レベルを確認
  useEffect(() => {
    checkUserLevel();
  }, []);

  // レベル選択後の処理を分離
  useEffect(() => {
    if (userLevel && !isFirstTime) {
      logger.debug('レベル選択完了:', userLevel);
    }
  }, [userLevel, isFirstTime]);

  // ユーザーの演奏レベルを確認する関数
  const checkUserLevel = async () => {
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
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ChevronLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {getInstrumentName()}の基礎練メニュー
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* メインコンテンツ - 全体をスクロール可能にする */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* レベル切り替えタブ */}
        <View style={styles.levelTabs}>
          {userLevel ? (
            <TouchableOpacity 
              style={[styles.levelTab, { backgroundColor: currentTheme.primary, alignSelf: 'center', width: '92%' }]}
              onPress={() => setShowLevelModal(true)}
            >
              <Text style={[styles.levelTabText, { color: currentTheme.surface }]}>
                {levels.find(l => l.id === selectedLevel)?.label}
              </Text>
              {/* 経験年数表示は不要のため非表示 */}
            </TouchableOpacity>
          ) : (
            levels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.levelTab,
                  selectedLevel === level.id && { backgroundColor: currentTheme.primary }
                ]}
                onPress={() => handleLevelSelection(level.id)}
              >
                <Text
                  style={[
                    styles.levelTabText,
                    { color: selectedLevel === level.id ? currentTheme.surface : currentTheme.text }
                  ]}
                >
                  {level.label}
                </Text>
                {/* 経験年数表示は削除 */}
              </TouchableOpacity>
            ))
          )}
        </View>

        {userLevel && (
          <Text style={[styles.levelFixedNotice, { color: currentTheme.textSecondary }]}>
            演奏レベルは設定から変更できます
          </Text>
        )}

        {/* 基礎情報セクション - マスターレベルでは表示しない */}
        {userLevel && userLevel !== 'advanced' && (
          <View style={[styles.basicInfoSection, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}>
            <View style={styles.basicInfoHeader}>
              <Target size={16} color={currentTheme.primary} />
              <Text style={[styles.basicInfoTitle, { color: currentTheme.primary }]}>基礎・姿勢・楽器の持ち方</Text>
            </View>
            
            <View style={styles.basicInfoContent}>
              <View style={styles.basicInfoItem}>
                <View style={styles.basicInfoItemHeader}>
                  <Text style={[styles.basicInfoLabel, { color: currentTheme.text }]}>正しい姿勢</Text>
                  <TouchableOpacity 
                    style={[styles.cameraButton, { backgroundColor: currentTheme.primary }]}
                    onPress={openCameraForPostureCheck}
                  >
                    <Camera size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.basicInfoText, { color: currentTheme.textSecondary }]}>
                  {/* instrumentBasics データが不足しているため一時的にコメントアウト */}
                  {'正しい姿勢を保ちましょう'}
                </Text>
              </View>
              
              <View style={styles.basicInfoItem}>
                <Text style={[styles.basicInfoLabel, { color: currentTheme.text }]}>楽器の持ち方</Text>
                <Text style={[styles.basicInfoText, { color: currentTheme.textSecondary }]}>
                  {/* instrumentBasics データが不足しているため一時的にコメントアウト */}
                  {'正しい持ち方を学びましょう'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 練習メニュー一覧 */}
        <View style={styles.practiceList}>
        {filteredPracticeMenus.map((item, index) => {
          return (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.compactCard, { backgroundColor: currentTheme.surface, borderLeftColor: currentTheme.primary }]}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedMenu(item);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.compactCardContent}>
                <View style={styles.compactCardLeft}>
                  <Text style={[styles.compactCardTitle, { color: currentTheme.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.compactCardDescription, { color: currentTheme.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
                <View style={styles.compactCardRight}>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        </View>
      </ScrollView>

      {/* 初回レベル選択モーダル */}
      <Modal
        visible={showLevelModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              あなたの演奏レベルを選んでください
            </Text>
            
            <View style={styles.levelSelectionContainer}>
              {levels.map((level) => {
                return (
                  <TouchableOpacity
                    key={level.id}
                    style={[styles.levelSelectionButton, { borderColor: currentTheme.primary }]}
                    onPress={() => handleLevelSelection(level.id)}
                  >
                    <Text style={[styles.levelSelectionLabel, { color: currentTheme.text }]}>
                      {level.label}
                    </Text>
                    <Text style={[styles.levelSelectionDescription, { color: currentTheme.textSecondary }]}>
                      {level.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 練習メニュー詳細モーダル */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: currentTheme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ヘッダー */}
              <View style={[styles.detailHeader, { backgroundColor: currentTheme.primary }]}>
                <TouchableOpacity 
                  onPress={() => setShowDetailModal(false)}
                  style={styles.detailCloseButton}
                >
                  <Text style={styles.detailCloseText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.detailTitle}>{selectedMenu?.title}</Text>
                <View style={styles.detailHeaderSpacer} />
              </View>

              <View style={styles.detailBody}>
                {/* 概要 */}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>概要</Text>
                  <Text style={[styles.detailSectionText, { color: currentTheme.textSecondary }]}>
                    {selectedMenu?.description}
                  </Text>
                </View>

                {/* YouTube動画 */}
                {selectedMenu?.videoUrl && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>参考動画</Text>
                    <TouchableOpacity
                      style={[styles.youtubeButton, { backgroundColor: '#FF0000' }]}
                      onPress={() => {
                        if (selectedMenu?.videoUrl) {
                          Alert.alert('YouTube再生', 'ブラウザでYouTube動画を開きます', [
                            { text: 'キャンセル' },
                            { text: '開く', onPress: () => {
                              // 実際のアプリではLinking.openURL(selectedMenu.videoUrl)を使用
                              logger.debug('Opening:', selectedMenu.videoUrl);
                            }}
                          ]);
                        }
                      }}
                    >
                      <Play size={20} color="#FFFFFF" />
                      <Text style={styles.youtubeButtonText}>YouTubeで見る</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 練習の仕方 */}
                {selectedMenu?.howToPractice && selectedMenu.howToPractice.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>練習の仕方</Text>
                    {selectedMenu.howToPractice.map((step, index) => (
                      <View key={index} style={styles.stepItem}>
                        <Text style={[styles.stepText, { color: currentTheme.textSecondary }]}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 推奨テンポ・時間 */}
                <View style={styles.detailInfoRow}>
                  {selectedMenu?.recommendedTempo && (
                    <View style={[styles.detailInfoCard, { backgroundColor: currentTheme.surface }]}>
                      <Text style={[styles.detailInfoLabel, { color: currentTheme.textSecondary }]}>推奨テンポ</Text>
                      <Text style={[styles.detailInfoValue, { color: currentTheme.primary }]}>
                        {selectedMenu.recommendedTempo}
                      </Text>
                    </View>
                  )}
                  {selectedMenu?.duration && (
                    <View style={[styles.detailInfoCard, { backgroundColor: currentTheme.surface }]}>
                      <Text style={[styles.detailInfoLabel, { color: currentTheme.textSecondary }]}>練習時間</Text>
                      <Text style={[styles.detailInfoValue, { color: currentTheme.primary }]}>
                        {selectedMenu.duration}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 練習ポイント */}
                {selectedMenu?.points && selectedMenu.points.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>練習ポイント</Text>
                    {selectedMenu.points.map((point, index) => (
                      <View key={index} style={styles.detailPointItem}>
                        <View style={[styles.detailPointBullet, { backgroundColor: currentTheme.primary }]} />
                        <Text style={[styles.detailPointText, { color: currentTheme.textSecondary }]}>{point}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 追加のヒント */}
                {selectedMenu?.tips && selectedMenu.tips.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: currentTheme.text }]}>💡 追加のヒント</Text>
                    {selectedMenu.tips.map((tip, index) => (
                      <View key={index} style={styles.tipItem}>
                        <Text style={[styles.tipText, { color: currentTheme.textSecondary }]}>• {tip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* アクションボタン */}
                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={[styles.detailStartButton, { backgroundColor: currentTheme.primary }]}
                    onPress={async () => {
                      if (!user) {
                        Alert.alert('エラー', 'ログインが必要です');
                        return;
                      }

                      if (!selectedMenu) {
                        return;
                      }

                      try {
                        // 基礎練の完了を記録（時間は追加しない、✅マークだけ）
                        const today = new Date().toISOString().split('T')[0];
                        
                        // 今日の既存の練習記録を取得
                        const authUser = await getCurrentUser();
                        if (!authUser) {
                          Alert.alert('エラー', 'ログインが必要です');
                          return;
                        }

                        const existingRecords = await getPracticeSessionsByDate(
                          authUser.id,
                          today,
                          selectedInstrument || null
                        );

                        if (existingRecords && existingRecords.length > 0) {
                          // 既存の記録がある場合は、時間を追加せずcontentだけを更新
                          const existing = existingRecords[0];
                          let existingContent = existing.content || '';
                          
                          // 既存のcontentから時間詳細を削除（「累計XX分」「XX分」などを削除）
                          existingContent = existingContent
                            .replace(/\s*\(累計\d+分\)/g, '') // 「（累計XX分）」を削除
                            .replace(/\s*累計\d+分/g, '') // 「累計XX分」を削除
                            .replace(/\s*\+\s*[^,]+?\d+分/g, '') // 「+ XX分」を削除
                            .replace(/\s*[^,]+?\d+分/g, '') // 「XX分」を含む文字列を削除
                            .replace(/練習記録/g, '') // 「練習記録」を削除
                            .replace(/^[\s,]+|[\s,]+$/g, '') // 前後のカンマとスペースを削除
                            .replace(/,\s*,/g, ',') // 連続するカンマを1つに
                            .trim();
                          
                          // 基礎練のメニュー名を追加
                          const newContent = existingContent 
                            ? `${existingContent}, ${selectedMenu.title}`
                            : selectedMenu.title;
                          
                          const success = await updatePracticeSession(existing.id, {
                            content: newContent,
                          });
                          
                          if (!success) {
                            Alert.alert('エラー', '練習記録の更新に失敗しました');
                            return;
                          }
                        } else {
                          // 新規記録を作成（基礎練は時間を追加しないため、duration_minutes: 0）
                          const success = await createPracticeSession({
                            user_id: authUser.id,
                            practice_date: today,
                            duration_minutes: 0, // 基礎練は時間を追加しない
                            content: selectedMenu.title,
                            input_method: 'preset',
                            instrument_id: selectedInstrument || null,
                          });
                          
                          if (!success) {
                            Alert.alert('エラー', '練習記録の作成に失敗しました');
                            return;
                          }
                        }

                        // 統計画面の更新通知を発火
                        if (typeof window !== 'undefined') {
                          const event = new CustomEvent('practiceRecordUpdated', {
                            detail: { 
                              action: 'practice_saved',
                              content: selectedMenu.title
                            }
                          });
                          window.dispatchEvent(event);
                        }

                        setShowDetailModal(false);
                        Alert.alert('保存完了', `${selectedMenu.title}の練習記録を保存しました！`);
                      } catch (error) {
                        logger.error('練習記録保存エラー:', error);
                        Alert.alert('エラー', '練習記録の保存に失敗しました');
                      }
                    }}
                  >
                    <Play size={20} color="#FFFFFF" />
                    <Text style={styles.detailStartButtonText}>練習した！</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* カメラモーダル */}
      <PostureCameraModal
        visible={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        instrumentName={getInstrumentName()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  levelTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTab: {
    // flex: 1, // コンテンツサイズに合わせるため削除
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  levelTabText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  levelTabExperience: {
    fontSize: 11,
    fontWeight: '400',
  },
  practiceList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  levelFixedNotice: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 0,
  },
  practiceCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  videoButton: {
    padding: 10,
    borderRadius: 12,
    marginLeft: 12,
    elevation: 3,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  pointsSection: {
    marginBottom: 16,
  },
  pointsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pointsList: {
    gap: 6,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pointText: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  morePointsText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    
    
    
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  levelSelectionContainer: {
    gap: 16,
    marginBottom: 24,
  },
  levelSelectionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  levelSelectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  levelSelectionExperience: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  levelSelectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalButtons: {
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // コンパクトカードスタイル
  compactCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  compactCardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactCardLeft: {
    flex: 1,
  },
  compactCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  compactCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  compactCardRight: {
    marginLeft: 12,
  },
  // 詳細モーダルスタイル
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailModalContent: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailCloseButton: {
    padding: 8,
    width: 40,
  },
  detailCloseText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  detailHeaderSpacer: {
    width: 40,
  },
  detailBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailSectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  youtubeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepItem: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  detailInfoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailInfoLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  detailInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  detailPointBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  detailPointText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailActions: {
    marginTop: 20,
    marginBottom: 40,
  },
  detailStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  detailStartButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // 基礎情報セクションのスタイル
  basicInfoSection: {
    margin: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
  },
  basicInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  basicInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  basicInfoContent: {
    padding: 12,
    paddingTop: 8,
  },
  basicInfoItem: {
    marginBottom: 12,
  },
  basicInfoItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cameraButton: {
    padding: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    marginLeft: -4,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
    marginRight: 8,
  },
  basicInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  basicInfoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  basicInfoTips: {
    marginTop: 4,
  },
  basicInfoTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  basicInfoTipBullet: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  basicInfoTipText: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
});
