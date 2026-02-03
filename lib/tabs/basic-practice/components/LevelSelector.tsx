/**
 * レベル選択コンポーネント
 * 演奏レベルの選択と表示を管理
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import type { Level, LevelData } from '../types/practice.types';
import { styles } from '../styles';

export interface LevelSelectorProps {
  levels: LevelData[];
  selectedLevel: 'beginner' | 'intermediate' | 'advanced';
  userLevel: string | null;
  /** レベル読み込み中は true。読み込み中は「選択してください」を出さず selectedLevel を1つ表示 */
  isLevelChecking?: boolean;
  onLevelChange: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  onOpenModal: () => void;
}

export function LevelSelector({
  levels,
  selectedLevel,
  userLevel,
  isLevelChecking = false,
  onLevelChange,
  onOpenModal,
}: LevelSelectorProps) {
  const { currentTheme } = useInstrumentTheme();
  const showSingleButton = userLevel != null || isLevelChecking;

  return (
    <>
      <View style={styles.levelTabs}>
        {showSingleButton ? (
          <TouchableOpacity 
            style={[styles.levelTab, { backgroundColor: currentTheme.primary, alignSelf: 'center', width: '92%' }]}
            onPress={onOpenModal}
          >
            <Text style={[styles.levelTabText, { color: currentTheme.surface }]}>
              {levels.find(l => l.value === selectedLevel)?.label}
            </Text>
          </TouchableOpacity>
        ) : (
          levels.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.levelTab,
                selectedLevel === level.value && { backgroundColor: currentTheme.primary }
              ]}
              onPress={() => onLevelChange(level.value)}
            >
              <Text
                style={[
                  styles.levelTabText,
                  { color: selectedLevel === level.value ? currentTheme.surface : currentTheme.text }
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {showSingleButton && (
        <Text style={[styles.levelFixedNotice, { color: currentTheme.text }]}>
          レベルは上のボタンを押すと変更できます
        </Text>
      )}
    </>
  );
}



