/**
 * 練習メニュー一覧セクションコンポーネント
 * 練習メニューのリストを表示（メニュー数に応じて動的に増減）
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import type { PracticeItem } from '../types/practice.types';
import { PracticeItemCard } from './PracticeItemCard';
import { styles } from '../styles';

export interface PracticeMenuSectionProps {
  menus: PracticeItem[];
  onMenuPress: (item: PracticeItem) => void;
}

export function PracticeMenuSection({ menus, onMenuPress }: PracticeMenuSectionProps) {
  const { currentTheme } = useInstrumentTheme();

  if (menus.length === 0) {
    return (
      <View style={[styles.practiceList, styles.practiceListEmpty]}>
        <Text style={[styles.practiceListEmptyText, { color: currentTheme.textSecondary }]}>
          このレベルにはメニューがありません。他のレベルを選んでみてください。
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.practiceList}>
      {menus.map((item) => (
        <PracticeItemCard
          key={item.id}
          item={item}
          onPress={() => onMenuPress(item)}
        />
      ))}
    </View>
  );
}



