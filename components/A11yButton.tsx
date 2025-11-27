import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { ensureContrast } from '@/lib/colors';

type Props = {
  label: string;
  onPress: () => void;
  backgroundColor: string;
  textColor?: string; // optional override
  accessibilityLabel?: string;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  disabled?: boolean;
};

export const A11yButton: React.FC<Props> = ({
  label,
  onPress,
  backgroundColor,
  textColor,
  accessibilityLabel,
  style,
  textStyle,
  disabled,
}) => {
  const computedTextColor = textColor || ensureContrast('#FFFFFF', backgroundColor);
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, { color: computedTextColor }, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default A11yButton;


