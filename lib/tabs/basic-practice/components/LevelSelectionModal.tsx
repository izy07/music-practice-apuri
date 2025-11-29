/**
 * レベル選択モーダルコンポーネント
 * 初回レベル選択時に表示されるモーダル
 */

import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import type { Level } from '../types/practice.types';
import { styles } from '../styles';

export interface LevelSelectionModalProps {
  visible: boolean;
  levels: Level[];
  onLevelSelect: (level: 'beginner' | 'intermediate' | 'advanced') => void;
}

export function LevelSelectionModal({
  visible,
  levels,
  onLevelSelect,
}: LevelSelectionModalProps) {
  const { currentTheme } = useInstrumentTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
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
                onPress={() => onLevelSelect(level.id)}
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



