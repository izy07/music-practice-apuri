/**
 * レベル選択モーダルコンポーネント
 * 初回レベル選択時に表示されるモーダル
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import type { LevelData } from '../types/practice.types';
import { styles } from '../styles';
import { disableBackgroundFocus, enableBackgroundFocus, blurActiveElement } from '@/lib/modalFocusManager';

export interface LevelSelectionModalProps {
  visible: boolean;
  levels: LevelData[];
  onLevelSelect: (level: 'beginner' | 'intermediate' | 'advanced') => void;
}

export function LevelSelectionModal({
  visible,
  levels,
  onLevelSelect,
}: LevelSelectionModalProps) {
  const { currentTheme } = useInstrumentTheme();

  // Webプラットフォームでのフォーカス管理（aria-hidden警告を防ぐため）
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (visible) {
        disableBackgroundFocus();
      } else {
        enableBackgroundFocus();
      }
    }
    
    return () => {
      if (Platform.OS === 'web' && !visible) {
        enableBackgroundFocus();
      }
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
        if (Platform.OS === 'web') {
          blurActiveElement();
          enableBackgroundFocus();
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
            あなたの演奏レベルを選んでください
          </Text>
          
          <View style={styles.levelSelectionContainer}>
            {levels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[styles.levelSelectionButton, { borderColor: currentTheme.primary }]}
                onPress={() => onLevelSelect(level.value)}
              >
                <Text style={[styles.levelSelectionLabel, { color: currentTheme.text }]}>
                  {level.label}
                </Text>
                <Text style={[styles.levelSelectionDescription, { color: currentTheme.textSecondary }]}>
                  {level.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}



