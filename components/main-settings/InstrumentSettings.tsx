import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Instrument } from '@/services';

interface InstrumentSettingsProps {
  currentTheme: Instrument;
}

export const InstrumentSettings: React.FC<InstrumentSettingsProps> = ({
  currentTheme,
}) => {
  const router = useRouter();

  return (
    <View style={[styles.settingsContainer, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
      <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#2D3748' }]}>
        練習楽器
      </Text>
      <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
        複数の楽器を練習している場合、楽器ごとにデータが分けられます
      </Text>

      <TouchableOpacity
        style={[styles.changeInstrumentButton, { 
          backgroundColor: currentTheme?.primary || '#4A5568',
          borderColor: currentTheme?.accent || '#2D3748'
        }]}
        onPress={() => router.push('/(tabs)/instrument-selection')}
        activeOpacity={0.8}
      >
        <Text style={styles.changeInstrumentButtonText}>
          楽器を変更・追加
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  settingsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    color: '#666666',
  },
  changeInstrumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    marginTop: 16,
  },
  changeInstrumentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

