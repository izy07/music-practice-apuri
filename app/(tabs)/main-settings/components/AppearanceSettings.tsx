import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Palette, Check } from 'lucide-react-native';
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

interface ColorPickerProps {
  label: string;
  color: string;
  onColorChange: (color: string) => void;
  colorType: string;
  currentTheme: Instrument;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, color, onColorChange, colorType, currentTheme }) => (
  <View style={styles.colorPickerContainer}>
    <Text style={[styles.colorPickerLabel, { color: currentTheme?.text || '#2D3748' }]}>{label}</Text>
    <View style={styles.colorPickerRow}>
      <View style={[styles.colorPreview, { backgroundColor: color }]} />
      <TouchableOpacity
        style={[styles.colorButton, { backgroundColor: color }]}
        onPress={() => {
          Alert.alert('カラーピッカー', 'カラーピッカー機能は準備中です');
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.colorButtonText}>変更</Text>
      </TouchableOpacity>
    </View>
  </View>
);

interface AppearanceSettingsProps {
  currentTheme: Instrument;
  useCustomTheme: boolean;
  setUseCustomTheme: (value: boolean) => void;
  customColors: Instrument;
  setCustomColors: (colors: Instrument | ((prev: Instrument) => Instrument)) => void;
  selectedInstrument: string;
  setCustomTheme: (theme: Instrument) => Promise<void>;
  resetToInstrumentTheme: () => Promise<void>;
}

const presetPalettes: PresetPalette[] = [
  {
    id: 'dark',
    name: 'ダーク',
    colors: {
      background: '#1E1E1E',
      surface: '#2C2C2E',
      primary: '#0A84FF',
      secondary: '#3A3A3C',
      accent: '#5AC8FA',
      text: '#FFFFFF',
      textSecondary: '#B0B0B5',
    }
  },
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
  },
  {
    id: 'blue',
    name: 'ブルー',
    colors: {
      background: '#E3F2FD',
      surface: '#FFFFFF',
      primary: '#2196F3',
      secondary: '#BBDEFB',
      accent: '#1976D2',
      text: '#0D47A1',
      textSecondary: '#1565C0',
    }
  },
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
    id: 'midnight',
    name: 'ミッドナイト',
    colors: {
      background: '#2A1F2A',
      surface: '#3A2F3A',
      primary: '#9D4EDD',
      secondary: '#4A3F4A',
      accent: '#7B2CBF',
      text: '#F3E6F3',
      textSecondary: '#C4B9C4',
    }
  },
  {
    id: 'navy',
    name: 'ネイビー',
    colors: {
      background: '#F0F2F5',
      surface: '#FFFFFF',
      primary: '#4A5A7A',
      secondary: '#D4DCE8',
      accent: '#3A4A6A',
      text: '#2A3A5A',
      textSecondary: '#5A6A8A',
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
  {
    id: 'warm-grey',
    name: 'ウォームグレー',
    colors: {
      background: '#F5F5F0',
      surface: '#FFFFFF',
      primary: '#A89B9B',
      secondary: '#E8E5E5',
      accent: '#8A7A7A',
      text: '#5A4A4A',
      textSecondary: '#7A6A6A',
    }
  },
  {
    id: 'muted-pink',
    name: 'ミュートピンク',
    colors: {
      background: '#F8F4F5',
      surface: '#FFFFFF',
      primary: '#B89A9A',
      secondary: '#E8D8DA',
      accent: '#9A7A7A',
      text: '#6B5A5A',
      textSecondary: '#8B7A7A',
    }
  },
  {
    id: 'muted-yellow',
    name: 'ミュートイエロー',
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
  {
    id: 'muted-blue',
    name: 'ミュートブルー',
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
    id: 'muted-red',
    name: 'ミュートレッド',
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
  {
    id: 'flute-pink',
    name: 'フルートピンク',
    colors: {
      background: '#FFF0F8',
      surface: '#FFFFFF',
      primary: '#FFB6D9',
      secondary: '#FFE6F5',
      accent: '#FF91C7',
      text: '#4F2F4F',
      textSecondary: '#8B5A8B',
    }
  },
  {
    id: 'flute-yellow',
    name: 'フルートイエロー',
    colors: {
      background: '#FFFDE7',
      surface: '#FFFFFF',
      primary: '#FFC107',
      secondary: '#FFF59D',
      accent: '#FF8F00',
      text: '#5D4037',
      textSecondary: '#8D6E63',
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
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const handlePresetSelect = async (palette: PresetPalette) => {
    const newTheme = { ...customColors, ...palette.colors };
    setCustomColors(newTheme);
    setUseCustomTheme(true);
    setSelectedPresetId(palette.id);
    await setCustomTheme(newTheme);
    Alert.alert('プリセット適用', `${palette.name}カラーパレットを適用しました`);
  };

  const handleSaveCustomTheme = async () => {
    await setCustomTheme(customColors);
    setUseCustomTheme(true);
    setSelectedPresetId(null);
    Alert.alert('保存完了', 'カスタムテーマを保存しました');
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
            <Text style={[styles.themeModeDescription, { color: currentTheme?.textSecondary || '#718096' }]}>
              選択した楽器に応じて自動的にカラーテーマが変更されます
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

      {/* カスタムカラー設定 */}
      {useCustomTheme && (
        <View style={styles.customSection}>
          <Text style={[styles.customTitle, { color: currentTheme?.text || '#2D3748' }]}>カスタムカラー設定</Text>
          
          <ColorPicker label="背景色" color={customColors.background} colorType="background" currentTheme={currentTheme} onColorChange={() => {}} />
          <ColorPicker label="表面色" color={customColors.surface} colorType="surface" currentTheme={currentTheme} onColorChange={() => {}} />
          <ColorPicker label="プライマリ色" color={customColors.primary} colorType="primary" currentTheme={currentTheme} onColorChange={() => {}} />
          <ColorPicker label="セカンダリ色" color={customColors.secondary} colorType="secondary" currentTheme={currentTheme} onColorChange={() => {}} />
          <ColorPicker label="アクセント色" color={customColors.accent} colorType="accent" currentTheme={currentTheme} onColorChange={() => {}} />
          <ColorPicker label="テキスト色" color={customColors.text} colorType="text" currentTheme={currentTheme} onColorChange={() => {}} />
          <ColorPicker label="サブテキスト色" color={customColors.textSecondary} colorType="textSecondary" currentTheme={currentTheme} onColorChange={() => {}} />
          
          <View style={styles.customActions}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: currentTheme?.primary || '#4A5568' }]}
              onPress={handleSaveCustomTheme}
              activeOpacity={0.7}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>カスタムテーマを保存</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
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
  themeModeContainer: {
    marginBottom: 24,
  },
  themeModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeModeInfo: {
    flex: 1,
  },
  themeModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeModeDescription: {
    fontSize: 14,
    lineHeight: 20,
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
    marginBottom: 24,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  presetButton: {
    width: '30%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  presetColors: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
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
  customSection: {
    marginBottom: 24,
  },
  customTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  colorPickerContainer: {
    marginBottom: 16,
  },
  colorPickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  colorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  colorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  customActions: {
    marginTop: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

