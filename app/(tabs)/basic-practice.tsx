/**
 * 基礎練習画面
 * 練習メニューの表示と管理
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import PostureCameraModal from '@/components/PostureCameraModal';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import type { PracticeItem } from '@/lib/tabs/basic-practice/types';
import { usePracticeLevel } from '@/lib/tabs/basic-practice/hooks/usePracticeLevel';
import { usePracticeMenu } from '@/lib/tabs/basic-practice/hooks/usePracticeMenu';
import { LevelSelector } from '@/lib/tabs/basic-practice/components/LevelSelector';
import { PracticeMenuSection } from '@/lib/tabs/basic-practice/components/PracticeMenuSection';
import { BasicInfoSection } from '@/lib/tabs/basic-practice/components/BasicInfoSection';
import { LevelSelectionModal } from '@/lib/tabs/basic-practice/components/LevelSelectionModal';
import { PracticeDetailModal } from '@/lib/tabs/basic-practice/components/PracticeDetailModal';
import { getInstrumentKey, getInstrumentName } from '@/lib/tabs/basic-practice/utils';
import { styles } from '@/lib/tabs/basic-practice/styles';

export default function BasicPracticeScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const [selectedMenu, setSelectedMenu] = useState<PracticeItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // 楽器キーと名前の取得
  const instrumentKey = getInstrumentKey(selectedInstrument);
  const instrumentName = getInstrumentName(selectedInstrument, null);

  // レベル管理フック
  const {
    selectedLevel,
    userLevel,
    showLevelModal,
    setShowLevelModal,
    handleLevelChange,
    handleLevelSelection,
    levels,
  } = usePracticeLevel();

  // 練習メニュー管理フック
  const { filteredPracticeMenus } = usePracticeMenu(selectedInstrument, selectedLevel);

  // カメラ機能を起動して姿勢確認
  const openCameraForPostureCheck = () => {
    setShowCameraModal(true);
  };

  // 戻るボタン
  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} >
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ChevronLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {instrumentName}の基礎練メニュー
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* メインコンテンツ - 全体をスクロール可能にする */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* レベル選択 */}
        <LevelSelector
          levels={levels}
          selectedLevel={selectedLevel}
          userLevel={userLevel}
          onLevelChange={handleLevelChange}
          onOpenModal={() => setShowLevelModal(true)}
        />

        {/* 基礎情報セクション - マスターレベルでは表示しない */}
        {userLevel && userLevel !== 'advanced' && (
          <BasicInfoSection
            instrumentKey={instrumentKey}
            onOpenCamera={openCameraForPostureCheck}
          />
        )}

        {/* 練習メニュー一覧 */}
        <PracticeMenuSection
          menus={filteredPracticeMenus}
          onMenuPress={(item) => {
            setSelectedMenu(item);
            setShowDetailModal(true);
          }}
        />
      </ScrollView>

      {/* レベル選択モーダル */}
      <LevelSelectionModal
        visible={showLevelModal}
        levels={levels}
        onLevelSelect={handleLevelSelection}
      />

      {/* 練習メニュー詳細モーダル */}
      <PracticeDetailModal
        visible={showDetailModal}
        selectedMenu={selectedMenu}
        selectedInstrument={selectedInstrument || null}
        onClose={() => setShowDetailModal(false)}
      />

      {/* カメラモーダル */}
      <PostureCameraModal
        visible={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        instrumentName={instrumentName}
      />
    </SafeAreaView>
  );
}

