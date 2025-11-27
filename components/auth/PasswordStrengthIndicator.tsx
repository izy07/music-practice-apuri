import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPasswordStrength } from '@/lib/authSecurity';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const strength = getPasswordStrength(password);
  
  if (!password) {
    return null;
  }

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak': return '#F44336';
      case 'medium': return '#FF9800';
      case 'strong': return '#4CAF50';
      default: return '#E0E0E0';
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 'weak': return '弱い';
      case 'medium': return '普通';
      case 'strong': return '強い';
      default: return '';
    }
  };

  const getStrengthWidth = () => {
    switch (strength) {
      case 'weak': return '33%';
      case 'medium': return '66%';
      case 'strong': return '100%';
      default: return '0%';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={[styles.bar, { width: getStrengthWidth(), backgroundColor: getStrengthColor() }]} />
      </View>
      <Text style={[styles.text, { color: getStrengthColor() }]}>
        パスワード強度: {getStrengthText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  barContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  text: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
