import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Mic } from 'lucide-react-native';
import { Instrument } from '@/services';
import { createShadowStyle } from '@/lib/shadowStyles';

interface TunerSettingsProps {
  currentTheme: Instrument;
  a4Frequency: number;
  setA4Frequency: (value: number | ((prev: number) => number)) => void;
  responseSpeed: number;
  setResponseSpeed: (value: number | ((prev: number) => number)) => void;
  smoothing: number;
  setSmoothing: (value: number | ((prev: number) => number)) => void;
  toleranceRange: number;
  setToleranceRange: (value: number | ((prev: number) => number)) => void;
  referenceToneVolume: number;
  setReferenceToneVolume: (value: number | ((prev: number) => number)) => void;
}

export const TunerSettings: React.FC<TunerSettingsProps> = ({
  currentTheme,
  a4Frequency,
  setA4Frequency,
  responseSpeed,
  setResponseSpeed,
  smoothing,
  setSmoothing,
  toleranceRange,
  setToleranceRange,
  referenceToneVolume,
  setReferenceToneVolume,
}) => {
  return (
    <View style={styles.contentContainer}>
      <View style={[styles.settingsCard, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
        <View style={styles.cardHeader}>
          <Mic size={24} color={currentTheme?.primary || '#4A5568'} />
          <Text style={[styles.cardTitle, { color: currentTheme?.text || '#2D3748' }]}>
            チューナー設定
          </Text>
        </View>
        <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
          チューナー
        </Text>
        
        {/* A4基準周波数設定 */}
        <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
          <View style={styles.settingHeader}>
            <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
              A4基準周波数
            </Text>
            <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
              {a4Frequency} Hz
            </Text>
          </View>
          <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
            チューニングの基準となる周波数を設定します
          </Text>
          <View style={styles.settingControls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setA4Frequency(prev => Math.max(440, prev - 1))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
            </TouchableOpacity>
            <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
              <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{a4Frequency}</Text>
            </View>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setA4Frequency(prev => Math.min(450, prev + 1))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 反応速度設定 */}
        <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
          <View style={styles.settingHeader}>
            <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
              反応速度
            </Text>
            <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
              {Math.round(responseSpeed * 100)}%
            </Text>
          </View>
          <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
            メーターの反応速度を調整します
          </Text>
          <View style={styles.settingControls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setResponseSpeed(prev => Math.max(0.1, prev - 0.1))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
            </TouchableOpacity>
            <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
              <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{Math.round(responseSpeed * 100)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setResponseSpeed(prev => Math.min(1.0, prev + 0.1))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 平滑化設定 */}
        <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
          <View style={styles.settingHeader}>
            <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
              平滑化
            </Text>
            <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
              {Math.round(smoothing * 100)}%
            </Text>
          </View>
          <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
            周波数測定の平滑化レベルを調整します
          </Text>
          <View style={styles.settingControls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setSmoothing(prev => Math.max(0.1, prev - 0.1))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
            </TouchableOpacity>
            <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
              <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{Math.round(smoothing * 100)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setSmoothing(prev => Math.min(0.9, prev + 0.1))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 許容範囲設定 */}
        <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
          <View style={styles.settingHeader}>
            <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
              許容範囲
            </Text>
            <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
              ±{toleranceRange}セント
            </Text>
          </View>
          <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
            チューニングの許容範囲を設定します
          </Text>
          <View style={styles.settingControls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setToleranceRange(prev => Math.max(5, prev - 5))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
            </TouchableOpacity>
            <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
              <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{toleranceRange}</Text>
            </View>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setToleranceRange(prev => Math.min(50, prev + 5))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 基準音音量設定 */}
        <View style={[styles.settingCard, { backgroundColor: currentTheme?.background || '#F7FAFC' }]}>
          <View style={styles.settingHeader}>
            <Text style={[styles.settingTitle, { color: currentTheme?.text || '#2D3748' }]}>
              基準音音量
            </Text>
            <Text style={[styles.settingValue, { color: currentTheme?.primary || '#4A5568' }]}>
              {Math.round(referenceToneVolume * 100)}%
            </Text>
          </View>
          <Text style={[styles.settingDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
            基準音の音量を調整します
          </Text>
          <View style={styles.settingControls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setReferenceToneVolume(prev => Math.max(0.1, prev - 0.1))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>-</Text>
            </TouchableOpacity>
            <View style={[styles.valueDisplay, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
              <Text style={[styles.valueText, { color: currentTheme?.primary || '#4A5568' }]}>{Math.round(referenceToneVolume * 100)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme?.secondary || '#E2E8F0' }]}
              onPress={() => setReferenceToneVolume(prev => Math.min(1.0, prev + 0.1))}
            >
              <Text style={[styles.controlButtonText, { color: currentTheme?.text || '#2D3748' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  settingsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    color: '#666666',
  },
  settingCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  settingDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  valueDisplay: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

