/**
 * レベル選択モーダルコンポーネント
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { Level } from '@/lib/tabs/basic-practice/types';
import { styles } from '@/lib/tabs/basic-practice/styles';

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

