/**
 * レベル選択モーダルコンポーネント
 */
import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { Level } from '@/lib/tabs/basic-practice/types';
import { styles } from '@/lib/tabs/basic-practice/styles';
import { disableBackgroundFocus, enableBackgroundFocus, blurActiveElement } from '@/lib/modalFocusManager';

interface LevelModalProps {
  visible: boolean;
  levels: Level[];
  onSelectLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void;
}

export const LevelModal: React.FC<LevelModalProps> = ({
  visible,
  levels,
  onSelectLevel,
}) => {
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
                onPress={() => onSelectLevel(level.id)}
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
};

