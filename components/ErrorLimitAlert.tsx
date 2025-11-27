import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';

interface ErrorLimitAlertProps {
  errorCount: number;
  isErrorLimitReached: boolean;
  onReset: () => void;
}

export default function ErrorLimitAlert({ errorCount, isErrorLimitReached, onReset }: ErrorLimitAlertProps) {
  const { currentTheme } = useInstrumentTheme();

  if (!isErrorLimitReached) {
    return null;
  }

  const handleReset = () => {
    Alert.alert(
      'エラーカウントをリセット',
      'エラーカウントを0にリセットしますか？これにより、認証処理が再開されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'リセット', 
          onPress: onReset,
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.error || '#FEE2E2' }]}>
      <View style={styles.iconContainer}>
        <AlertTriangle size={24} color={currentTheme.errorText || '#DC2626'} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: currentTheme.errorText || '#DC2626' }]}>
          🚫 エラー制限に達しました
        </Text>
        <Text style={[styles.message, { color: currentTheme.errorText || '#DC2626' }]}>
          エラーが{errorCount}回発生したため、認証処理を停止しています。
        </Text>
        <Text style={[styles.suggestion, { color: currentTheme.errorText || '#DC2626' }]}>
          アプリを再起動するか、下のボタンでエラーカウントをリセットしてください。
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.resetButton, { backgroundColor: currentTheme.primary }]}
        onPress={handleReset}
      >
        <RefreshCw size={16} color={currentTheme.surface} />
        <Text style={[styles.resetButtonText, { color: currentTheme.surface }]}>
          リセット
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 4,
  },
  suggestion: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});



