import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Instrument } from '@/services';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { instrumentService } from '@/services';

interface InstrumentSettingsProps {
  currentTheme: Instrument;
}

export const InstrumentSettings: React.FC<InstrumentSettingsProps> = ({
  currentTheme,
}) => {
  const router = useRouter();
  const { selectedInstrument } = useInstrumentTheme();
  
  // 現在選択されている楽器名を取得
  const getCurrentInstrumentName = () => {
    if (!selectedInstrument) {
      return '未選択';
    }
    
    const defaultInstruments = instrumentService.getDefaultInstruments();
    const instrument = defaultInstruments.find(inst => inst.id === selectedInstrument);
    return instrument ? instrument.name : '不明';
  };

  return (
    <View style={[styles.settingsContainer, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
      <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#2D3748' }]}>
        練習楽器
      </Text>
      <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
        複数の楽器を練習している場合、楽器ごとにデータが分けられます
      </Text>
      
      {/* 現在選択されている楽器を表示 */}
      <View style={[styles.currentInstrumentContainer, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
        <Text style={[styles.currentInstrumentLabel, { color: currentTheme?.textSecondary || '#718096' }]}>
          現在の楽器:
        </Text>
        <Text style={[styles.currentInstrumentName, { color: currentTheme?.text || '#2D3748' }]}>
          {getCurrentInstrumentName()}
        </Text>
      </View>

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
  currentInstrumentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentInstrumentLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  currentInstrumentName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

