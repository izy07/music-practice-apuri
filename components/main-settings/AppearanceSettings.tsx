import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Palette, Save } from 'lucide-react-native';
import { Instrument } from '@/services';

interface PresetPalette {
  id: string;
  name: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textSecondary: string;
  };
}


interface AppearanceSettingsProps {
  currentTheme: Instrument;
  useCustomTheme: boolean;
  setUseCustomTheme: (value: boolean) => void;
  customColors: Instrument;
  setCustomColors: (colors: Instrument | ((prev: Instrument) => Instrument)) => void;
  selectedInstrument: string;
  setCustomTheme: (theme: Instrument) => Promise<void>;
  resetToInstrumentTheme: () => Promise<void>;
  isCustomTheme: boolean; // InstrumentThemeContextから取得した、保存済みかどうかのフラグ
}

const presetPalettes: PresetPalette[] = [
  // レッド系
  {
    id: 'red',
    name: 'レッド',
    colors: {
      background: '#FFEBEE',
      surface: '#FFFFFF',
      primary: '#F44336',
      secondary: '#FFCDD2',
      accent: '#D32F2F',
      text: '#B71C1C',
      textSecondary: '#C62828',
    }
  },
  {
    id: 'rose',
    name: 'ローズ',
    colors: {
      background: '#FFF1F2',
      surface: '#FFFFFF',
      primary: '#F43F5E',
      secondary: '#FECDD3',
      accent: '#E11D48',
      text: '#BE123C',
      textSecondary: '#9F1239',
    }
  },
  {
    id: 'muted-red',
    name: 'ローズグレー',
    colors: {
      background: '#F6F3F3',
      surface: '#FFFFFF',
      primary: '#B88A8A',
      secondary: '#E8D0D0',
      accent: '#9A6A6A',
      text: '#6B4A4A',
      textSecondary: '#8B6A6A',
    }
  },
  // オレンジ系
  {
    id: 'amber',
    name: 'アンバー',
    colors: {
      background: '#FFFBEB',
      surface: '#FFFFFF',
      primary: '#F59E0B',
      secondary: '#FDE68A',
      accent: '#D97706',
      text: '#92400E',
      textSecondary: '#78350F',
    }
  },
  // イエロー/ベージュ系
  {
    id: 'muted-yellow',
    name: 'ベージュ',
    colors: {
      background: '#F8F6F0',
      surface: '#FFFFFF',
      primary: '#B8A88A',
      secondary: '#E8E0D0',
      accent: '#9A8A6A',
      text: '#6B5A4A',
      textSecondary: '#8B7A6A',
    }
  },
  // グリーン系
  {
    id: 'green',
    name: 'グリーン',
    colors: {
      background: '#E8F5E9',
      surface: '#FFFFFF',
      primary: '#4CAF50',
      secondary: '#C8E6C9',
      accent: '#388E3C',
      text: '#1B5E20',
      textSecondary: '#2E7D32',
    }
  },
  {
    id: 'moss',
    name: 'モス',
    colors: {
      background: '#F0F4ED',
      surface: '#FFFFFF',
      primary: '#6B8A6B',
      secondary: '#D0D8C8',
      accent: '#5A7A5A',
      text: '#4A5A4A',
      textSecondary: '#5A6A5A',
    }
  },
  // シアン/ターコイズ系
  {
    id: 'turquoise-green',
    name: 'ティール',
    colors: {
      background: '#E0F2F1',
      surface: '#FFFFFF',
      primary: '#26A69A',
      secondary: '#80CBC4',
      accent: '#00897B',
      text: '#004D40',
      textSecondary: '#00695C',
    }
  },
  {
    id: 'turquoise',
    name: 'ターコイズ',
    colors: {
      background: '#E0F7FA',
      surface: '#FFFFFF',
      primary: '#00ACC1',
      secondary: '#B2EBF2',
      accent: '#00838F',
      text: '#004D40',
      textSecondary: '#00695C',
    }
  },
  // ブルー系
  {
    id: 'ocean-blue',
    name: 'スカイブルー',
    colors: {
      background: '#E0F2FE',
      surface: '#FFFFFF',
      primary: '#0EA5E9',
      secondary: '#BAE6FD',
      accent: '#0284C7',
      text: '#0369A1',
      textSecondary: '#075985',
    }
  },
  {
    id: 'steel-blue',
    name: 'スチールブルー',
    colors: {
      background: '#E0F6FF',
      surface: '#FFFFFF',
      primary: '#4682B4',
      secondary: '#87CEEB',
      accent: '#2F4F4F',
      text: '#2F4F4F',
      textSecondary: '#4682B4',
    }
  },
  {
    id: 'steel-blue-dark',
    name: 'ペールブルー',
    colors: {
      background: '#D1E7F0',
      surface: '#FFFFFF',
      primary: '#5A8FA8',
      secondary: '#7FB3C5',
      accent: '#3D5F6F',
      text: '#2C4A5A',
      textSecondary: '#4A6B7A',
    }
  },
  {
    id: 'muted-blue',
    name: 'スレートブルー',
    colors: {
      background: '#F3F4F6',
      surface: '#FFFFFF',
      primary: '#7A9AAA',
      secondary: '#D0E0E8',
      accent: '#5A7A8A',
      text: '#3A5A6A',
      textSecondary: '#5A7A8A',
    }
  },
  {
    id: 'midnight-blue',
    name: 'ミッドナイトブルー',
    colors: {
      background: '#E8EAED',
      surface: '#FFFFFF',
      primary: '#1E3A8A',
      secondary: '#C7D2FE',
      accent: '#1E40AF',
      text: '#1E293B',
      textSecondary: '#334155',
    }
  },
  {
    id: 'indigo',
    name: 'スレートグレー',
    colors: {
      background: '#F2F3F6',
      surface: '#FFFFFF',
      primary: '#6A7A9A',
      secondary: '#D0D8E8',
      accent: '#4A5A7A',
      text: '#3A4A6A',
      textSecondary: '#5A6A8A',
    }
  },
  // パープル/バイオレット系
  {
    id: 'violet',
    name: 'バイオレット',
    colors: {
      background: '#F5F3FF',
      surface: '#FFFFFF',
      primary: '#8B5CF6',
      secondary: '#DDD6FE',
      accent: '#7C3AED',
      text: '#6D28D9',
      textSecondary: '#5B21B6',
    }
  },
  {
    id: 'purple',
    name: 'パープル',
    colors: {
      background: '#F3E5F5',
      surface: '#FFFFFF',
      primary: '#9C27B0',
      secondary: '#E1BEE7',
      accent: '#7B1FA2',
      text: '#4A148C',
      textSecondary: '#6A1B9A',
    }
  },
  {
    id: 'lavender',
    name: 'ラベンダー',
    colors: {
      background: '#F5F4F8',
      surface: '#FFFFFF',
      primary: '#9A8AAA',
      secondary: '#E0D8E8',
      accent: '#7A6A8A',
      text: '#5A4A6A',
      textSecondary: '#7A6A8A',
    }
  },
  // グレー系（無彩色）
  {
    id: 'classic',
    name: 'クラシック',
    colors: {
      background: '#F5F5F5',
      surface: '#FFFFFF',
      primary: '#4A5568',
      secondary: '#E2E8F0',
      accent: '#2D3748',
      text: '#1A202C',
      textSecondary: '#718096',
    }
  }
];

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  currentTheme,
  useCustomTheme,
  setUseCustomTheme,
  customColors,
  setCustomColors,
  selectedInstrument,
  setCustomTheme,
  resetToInstrumentTheme,
  isCustomTheme,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const handlePresetSelect = (palette: PresetPalette) => {
    // プリセット選択時は一時的に適用するだけで、保存はしない
    const newTheme = { ...customColors, ...palette.colors };
    setCustomColors(newTheme);
    setUseCustomTheme(true);
    setSelectedPresetId(palette.id);
  };

  const handleSaveTheme = async () => {
    // 「テーマを保存」ボタンが押されたときにのみ永続的に保存
    try {
      const presetName = getCurrentPresetName();
      const themeToSave: Instrument = {
        ...customColors,
        id: selectedInstrument || customColors.id || 'custom',
        name: presetName || customColors.name || 'カスタム',
        nameEn: customColors.nameEn || 'Custom',
      };
      await setCustomTheme(themeToSave);
      Alert.alert('保存完了', 'この楽器のテーマを保存しました。この楽器では次回からこのテーマが自動的に適用されます。');
    } catch (error) {
      Alert.alert('エラー', 'テーマの保存に失敗しました');
    }
  };


  const handleResetTheme = async () => {
    setUseCustomTheme(false);
    await resetToInstrumentTheme();
    Alert.alert('リセット完了', '楽器の自動テーマに戻しました');
  };

  const getCurrentPresetName = () => {
    if (!useCustomTheme) return null;
    
    if (selectedPresetId) {
      const selectedPalette = presetPalettes.find(p => p.id === selectedPresetId);
      if (selectedPalette) {
        const matches = 
          customColors.background === selectedPalette.colors.background &&
          customColors.surface === selectedPalette.colors.surface &&
          customColors.primary === selectedPalette.colors.primary &&
          customColors.secondary === selectedPalette.colors.secondary &&
          customColors.accent === selectedPalette.colors.accent &&
          customColors.text === selectedPalette.colors.text &&
          customColors.textSecondary === selectedPalette.colors.textSecondary;
        
        if (matches) {
          return selectedPalette.name;
        }
      }
    }
    
    return null;
  };

  return (
    <View style={[styles.settingsContainer, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
      <View style={styles.sectionHeader}>
        <Palette size={24} color={currentTheme?.primary || '#4A5568'} />
        <Text style={[styles.sectionTitle, { color: currentTheme?.text || '#2D3748' }]}>外観設定</Text>
      </View>
      <Text style={[styles.sectionDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
        外観設定
      </Text>
      
      {/* テーマモード選択 */}
      <View style={styles.themeModeContainer}>
        <View style={[styles.themeModeRow, { backgroundColor: currentTheme?.background || '#F7FAFC', borderColor: currentTheme?.secondary || '#E2E8F0' }]}>
          <View style={styles.themeModeInfo}>
            <Text style={[styles.themeModeTitle, { color: currentTheme?.text }]}>
              {useCustomTheme ? (() => {
                const presetName = getCurrentPresetName();
                return presetName || 'カスタム';
              })() : (selectedInstrument && currentTheme?.name ? currentTheme.name : '楽器の自動テーマ')}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.themeModeToggle,
              useCustomTheme && { backgroundColor: currentTheme?.primary || '#4A5568' }
            ]}
            onPress={async () => {
              const newValue = !useCustomTheme;
              setUseCustomTheme(newValue);
              if (!newValue) {
                await resetToInstrumentTheme();
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.themeModeToggleText,
              { color: useCustomTheme ? currentTheme?.surface || '#FFFFFF' : currentTheme?.text || '#2D3748' }
            ]}>
              {useCustomTheme ? 'カスタム' : '自動'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* プリセットカラーパレット */}
      <View style={styles.presetSection}>
        <Text style={[styles.presetTitle, { color: currentTheme?.text || '#2D3748' }]}>プリセットカラーパレット</Text>
        <View style={styles.presetGrid}>
          {presetPalettes.map((palette) => {
            const isSelected = selectedPresetId === palette.id && useCustomTheme;
            return (
              <TouchableOpacity
                key={palette.id}
                style={[
                  styles.presetButton,
                  { 
                    backgroundColor: currentTheme?.background || '#F7FAFC',
                    borderColor: isSelected ? currentTheme?.primary || '#4A5568' : currentTheme?.secondary || '#E2E8F0',
                    borderWidth: isSelected ? 2 : 1
                  }
                ]}
                onPress={() => handlePresetSelect(palette)}
                activeOpacity={0.7}
              >
                <View style={styles.presetColors}>
                  <View 
                    style={[styles.presetColor, { backgroundColor: palette.colors.primary }]}
                  />
                  <View 
                    style={[styles.presetColor, { backgroundColor: palette.colors.secondary }]}
                  />
                  <View 
                    style={[styles.presetColor, { backgroundColor: palette.colors.accent }]}
                  />
                </View>
                <Text
                  style={[styles.presetName, { color: currentTheme?.text || '#2D3748' }]}
                >
                  {palette.name}
                </Text>
                {isSelected && (
                  <Text
                    style={[styles.presetCheckmark, { color: currentTheme?.primary || '#4A5568' }]}
                  >
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* テーマを保存ボタン */}
      {useCustomTheme && (
        <TouchableOpacity
          style={[styles.saveThemeButton, { backgroundColor: currentTheme?.primary || '#4A5568' }]}
          onPress={handleSaveTheme}
          activeOpacity={0.7}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveThemeButtonText}>
            {isCustomTheme ? 'テーマを更新' : 'テーマを保存'}
          </Text>
        </TouchableOpacity>
      )}


      {/* リセットボタン */}
      <TouchableOpacity
        style={[styles.resetButton, { borderColor: currentTheme?.secondary || '#E2E8F0' }]}
        onPress={handleResetTheme}
        activeOpacity={0.7}
      >
        <Text style={[styles.resetButtonText, { color: currentTheme?.textSecondary || '#718096' }]}>
          楽器の自動テーマに戻す
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  settingsContainer: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666666',
  },
  themeModeContainer: {
    marginBottom: 12,
  },
  themeModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeModeInfo: {
    flex: 1,
  },
  themeModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 0,
  },
  themeModeToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  themeModeToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetSection: {
    marginBottom: 12,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  presetButton: {
    width: '31%',
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  presetColors: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  presetColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  presetCheckmark: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  saveThemeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  saveThemeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

