/**
 * 基礎情報セクションコンポーネント
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Target, Camera } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { InstrumentBasics } from '@/lib/tabs/basic-practice/types';
import { styles } from '@/lib/tabs/basic-practice/styles';

interface BasicInfoSectionProps {
  instrumentBasics: InstrumentBasics;
  onOpenCamera: () => void;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  instrumentBasics,
  onOpenCamera,
}) => {
  const { currentTheme } = useInstrumentTheme();

  return (
    <View style={[styles.basicInfoSection, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}>
      <View style={styles.basicInfoHeader}>
        <Target size={16} color={currentTheme.primary} />
        <Text style={[styles.basicInfoTitle, { color: currentTheme.primary }]}>基礎・姿勢・楽器の持ち方</Text>
      </View>
      
      <View style={styles.basicInfoContent}>
        <View style={styles.basicInfoItem}>
          <View style={styles.basicInfoItemHeader}>
            <Text style={[styles.basicInfoLabel, { color: currentTheme.text }]}>正しい姿勢</Text>
            <TouchableOpacity 
              style={[styles.cameraButton, { backgroundColor: currentTheme.primary }]}
              onPress={onOpenCamera}
            >
              <Camera size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.basicInfoText, { color: currentTheme.textSecondary }]}>
            {instrumentBasics.posture}
          </Text>
        </View>
        
        <View style={styles.basicInfoItem}>
          <Text style={[styles.basicInfoLabel, { color: currentTheme.text }]}>楽器の持ち方</Text>
          <Text style={[styles.basicInfoText, { color: currentTheme.textSecondary }]}>
            {instrumentBasics.grip}
          </Text>
        </View>
      </View>
    </View>
  );
};

