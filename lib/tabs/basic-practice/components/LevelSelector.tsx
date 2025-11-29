/**
 * レベル選択コンポーネント
 * 演奏レベルの選択と表示を管理
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import type { Level } from '../types/practice.types';
import { styles } from '../styles';

export interface LevelSelectorProps {
  levels: Level[];
  selectedLevel: 'beginner' | 'intermediate' | 'advanced';
  userLevel: string | null;
  onLevelChange: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  onOpenModal: () => void;
}

export function LevelSelector({
  levels,
  selectedLevel,
  userLevel,
  onLevelChange,
  onOpenModal,
}: LevelSelectorProps) {
  const { currentTheme } = useInstrumentTheme();

  return (
    <>
      <View style={styles.levelTabs}>
        {userLevel ? (
          <TouchableOpacity 
            style={[styles.levelTab, { backgroundColor: currentTheme.primary, alignSelf: 'center', width: '92%' }]}
            onPress={onOpenModal}
          >
            <Text style={[styles.levelTabText, { color: currentTheme.surface }]}>
              {levels.find(l => l.id === selectedLevel)?.label}
            </Text>
          </TouchableOpacity>
        ) : (
          levels.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.levelTab,
                selectedLevel === level.id && { backgroundColor: currentTheme.primary }
              ]}
              onPress={() => onLevelChange(level.id)}
            >
              <Text
                style={[
                  styles.levelTabText,
                  { color: selectedLevel === level.id ? currentTheme.surface : currentTheme.text }
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {userLevel && (
        <Text style={[styles.levelFixedNotice, { color: currentTheme.textSecondary }]}>
          演奏レベルは設定から変更できます
        </Text>
      )}
    </>
  );
}



