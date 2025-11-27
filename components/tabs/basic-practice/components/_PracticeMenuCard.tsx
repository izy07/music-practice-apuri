/**
 * 練習メニューカードコンポーネント
 */
import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PracticeItem } from '@/lib/tabs/basic-practice/types';
import { styles } from '@/lib/tabs/basic-practice/styles';

interface PracticeMenuCardProps {
  practiceItem: PracticeItem;
  onPress: () => void;
}

export const PracticeMenuCard: React.FC<PracticeMenuCardProps> = memo(({
  practiceItem,
  onPress,
}) => {
  const colors = useThemeColors();

  const cardStyle = useMemo(() => [
    styles.compactCard,
    { borderLeftColor: colors.primary }
  ], [colors.primary]);

  const titleStyle = useMemo(() => [
    styles.compactCardTitle,
    { color: colors.text }
  ], [colors.text]);

  const descriptionStyle = useMemo(() => [
    styles.compactCardDescription,
    { color: colors.textSecondary }
  ], [colors.textSecondary]);

  return (
    <TouchableOpacity 
      style={cardStyle}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.compactCardContent}>
        <View style={styles.compactCardLeft}>
          <Text style={titleStyle}>
            {practiceItem.title}
          </Text>
          <Text style={descriptionStyle}>
            {practiceItem.description}
          </Text>
        </View>
        <View style={styles.compactCardRight} />
      </View>
    </TouchableOpacity>
  );
});

