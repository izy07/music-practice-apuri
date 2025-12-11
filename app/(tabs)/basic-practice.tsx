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
import { useLanguage } from '@/components/LanguageContext';
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
import { safeGoBack } from '@/lib/navigationUtils';

export default function BasicPracticeScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { t } = useLanguage();
  const { user } = useAuthAdvanced();
  const [selectedMenu, setSelectedMenu] = useState<PracticeItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // 楽器キーと名前の取得
  const instrumentKey = getInstrumentKey(selectedInstrument);
  const instrumentName = getInstrumentName(selectedInstrument, null);

  // レベル管理フック（楽器ごとにレベルを管理）
  const {
    selectedLevel,
    userLevel,
    showLevelModal,
    setShowLevelModal,
    handleLevelChange,
    handleLevelSelection,
    levels,
  } = usePracticeLevel(selectedInstrument);

  // 練習メニュー管理フック（DB取得版、フォールバック付き）
  const { filteredPracticeMenus, loading: menusLoading } = usePracticeMenu(selectedInstrument, selectedLevel);

  // カメラ機能を起動して姿勢確認
  const openCameraForPostureCheck = () => {
    setShowCameraModal(true);
  };

  // 戻るボタン
  const goBack = () => {
    safeGoBack('/(tabs)/settings');
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
          {t('basicPracticeMenuFor').replace('{instrument}', instrumentName)}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* レベル選択 - ヘッダーの直下に配置 */}
      <LevelSelector
        levels={levels}
        selectedLevel={selectedLevel}
        userLevel={userLevel}
        onLevelChange={handleLevelChange}
        onOpenModal={() => setShowLevelModal(true)}
      />

      {/* メインコンテンツ - 全体をスクロール可能にする */}
      <ScrollView 
        style={styles.mainContent} 
        contentContainerStyle={{ paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 基礎情報セクション - レベル選択の直下、マスターレベルでは表示しない */}
        {userLevel && userLevel !== 'advanced' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 0 }}>
            <BasicInfoSection
              instrumentKey={instrumentKey}
              onOpenCamera={openCameraForPostureCheck}
            />
          </View>
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

