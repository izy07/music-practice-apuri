/**
 * 練習メニューカードコンポーネント
 * 個々の練習メニューアイテムを表示
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import type { PracticeItem } from '../types/practice.types';
import { styles } from '../styles/styles';

export interface PracticeItemCardProps {
  item: PracticeItem;
  onPress: () => void;
}

export function PracticeItemCard({ item, onPress }: PracticeItemCardProps) {
  const { currentTheme } = useInstrumentTheme();

  return (
    <TouchableOpacity 
      style={[styles.compactCard, { backgroundColor: currentTheme.surface, borderLeftColor: currentTheme.primary }]}
      activeOpacity={0.7}
      onPress={onPress}
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
        <View style={styles.compactCardRight} />
      </View>
    </TouchableOpacity>
  );
}

