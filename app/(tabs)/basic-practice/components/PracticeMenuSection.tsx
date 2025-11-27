/**
 * 練習メニュー一覧セクションコンポーネント
 * 練習メニューのリストを表示
 */

import React from 'react';
import { View } from 'react-native';
import type { PracticeItem } from '../types/practice.types';
import { PracticeItemCard } from './PracticeItemCard';
import { styles } from '../styles/styles';

export interface PracticeMenuSectionProps {
  menus: PracticeItem[];
  onMenuPress: (item: PracticeItem) => void;
}

export function PracticeMenuSection({ menus, onMenuPress }: PracticeMenuSectionProps) {
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



