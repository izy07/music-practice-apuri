import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Instrument } from '@/services';
import { getCurrentUser } from '@/lib/authService';
import { userRepository } from '@/repositories/userRepository';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { ErrorHandler } from '@/lib/errorHandler';

interface LevelSettingsProps {
  currentTheme: Instrument;
  practiceLevel: string;
  setPracticeLevel: (level: string) => void;
}

const practiceLevels = [
  { id: 'beginner', name: '初級', description: '' },
  { id: 'intermediate', name: '中級', description: '' },
  { id: 'advanced', name: 'マスター', description: '' },
];

export const LevelSettings: React.FC<LevelSettingsProps> = ({
  currentTheme,
  practiceLevel,
  setPracticeLevel,
}) => {
  const handleLevelChange = async (levelId: string) => {
    try {
      setPracticeLevel(levelId);
      const { user, error: userError } = await getCurrentUser();
      if (!userError && user) {
        await userRepository.updatePracticeLevel(user.id, levelId);
        try {
          await AsyncStorage.setItem(STORAGE_KEYS.userPracticeLevel, levelId);
        } catch (storageError) {
          ErrorHandler.handle(storageError, 'ローカルストレージ保存', false);
        }
      }
    } catch (e) {
      ErrorHandler.handle(e, '演奏レベル保存', true);
      Alert.alert('エラー', '演奏レベルの保存に失敗しました');
    }
  };

  return (
    <View style={[styles.settingsContainer, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
      <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#2D3748' }]}>
        演奏レベル
      </Text>
      <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
        演奏レベル
      </Text>
      <View style={styles.levelContainer}>
        {practiceLevels.map((level) => (
          <TouchableOpacity
            key={level.id}
            style={[
              styles.levelItem,
              {
                backgroundColor: practiceLevel === level.id 
                  ? currentTheme?.primary || '#4A5568'
                  : currentTheme?.background || '#F7FAFC',
                borderColor: practiceLevel === level.id 
                  ? currentTheme?.primary || '#4A5568'
                  : currentTheme?.secondary || '#E2E8F0',
              }
            ]}
            onPress={() => handleLevelChange(level.id)}
            activeOpacity={0.7}
          >
            <View style={styles.levelContent}>
              <Text
                style={[
                  styles.levelName,
                  { color: practiceLevel === level.id 
                    ? currentTheme?.surface || '#FFFFFF'
                    : currentTheme?.text || '#2D3748'
                  }
                ]}
              >
                {level.name}
              </Text>
            </View>
            {practiceLevel === level.id && (
              <View 
                style={[styles.levelCheckmark, { backgroundColor: currentTheme?.accent || '#2D3748' }]}
              >
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
        基礎練では選択済みレベルのみ表示されます。変更はここで行えます。
      </Text>
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
  levelContainer: {
    gap: 8,
    alignItems: 'center',
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    width: '92%',
    alignSelf: 'center',
  },
  levelContent: {
    flex: 1,
  },
  levelName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 0,
  },
  levelCheckmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

