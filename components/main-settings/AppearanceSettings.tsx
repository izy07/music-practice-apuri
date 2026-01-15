import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Modal, TextInput } from 'react-native';
import { Palette, Check, X } from 'lucide-react-native';
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
  onColorChange: (color: string) => void | Promise<void>;
  colorType: string;
  currentTheme: Instrument;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, color, onColorChange, colorType, currentTheme }) => {
  const [showModal, setShowModal] = useState(false);
  const [colorInput, setColorInput] = useState(color);
  const textInputRef = useRef<TextInput>(null);
  
  // モーダルが開いた時にTextInputにフォーカスを当てる
  useEffect(() => {
    if (showModal && Platform.OS !== 'web') {
      // 少し遅延させてからフォーカスを当てる（モーダルのアニメーション完了を待つ）
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

  const handleColorChange = async (newColor: string) => {
    try {
      await onColorChange(newColor);
    } catch (error) {
      console.error('色の変更エラー:', error);
      Alert.alert('エラー', '色の変更に失敗しました');
    }
  };

  const validateColorCode = (code: string): boolean => {
    // #で始まる6桁の16進数か、#なしの6桁の16進数
    const hexColorRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(code);
  };

  const formatColorCode = (code: string): string => {
    // #がない場合は追加
    if (!code.startsWith('#')) {
      return '#' + code;
    }
    return code;
  };

  const handleSaveColor = () => {
    const formattedColor = formatColorCode(colorInput.trim());
    if (validateColorCode(formattedColor)) {
      handleColorChange(formattedColor);
      setShowModal(false);
    } else {
      Alert.alert('エラー', '正しい色コードを入力してください（例: #FF0000 または FF0000）');
    }
  };

  const openColorPicker = () => {
    // Web環境ではHTML5のカラーピッカーを使用
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = color;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        input.style.width = '0';
        input.style.height = '0';
        document.body.appendChild(input);
        
        const handleChange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          if (target.value) {
            handleColorChange(target.value);
          }
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
          input.removeEventListener('change', handleChange);
        };
        
        input.addEventListener('change', handleChange);
        
        // カラーピッカーを開く
        input.click();
      } catch (error) {
        // エラーが発生した場合はモーダルで色コードを入力
        console.error('カラーピッカーエラー:', error);
        setColorInput(color);
        setShowModal(true);
      }
    } else {
      // モバイル環境ではモーダルで色コードを入力
      setColorInput(color);
      setShowModal(true);
    }
  };

  return (
    <>
      <View style={styles.colorPickerContainer}>
        <Text style={[styles.colorPickerLabel, { color: currentTheme?.text || '#2D3748' }]}>{label}</Text>
        <View style={styles.colorPickerRow}>
          <TouchableOpacity
            onPress={openColorPicker}
            activeOpacity={0.7}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
          <View style={[styles.colorPreview, { backgroundColor: color, borderColor: currentTheme?.secondary || '#E2E8F0' }]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.colorButton, { backgroundColor: currentTheme?.primary || '#4A5568' }]}
            onPress={openColorPicker}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.colorButtonText, { color: currentTheme?.surface || '#FFFFFF' }]}>変更</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* モバイル環境用の色コード入力モーダル */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme?.surface || '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme?.text || '#2D3748' }]}>
                {label}を変更
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={currentTheme?.text || '#2D3748'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: currentTheme?.text || '#2D3748' }]}>
                色コードを入力（例: #FF0000 または FF0000）
              </Text>
              <View style={styles.colorInputRow}>
                <View style={[styles.colorPreviewLarge, { backgroundColor: colorInput.startsWith('#') ? colorInput : '#' + colorInput, borderColor: currentTheme?.secondary || '#E2E8F0' }]} />
                <TextInput
                  ref={textInputRef}
                  style={[styles.colorInput, { 
                    color: currentTheme?.text || '#2D3748',
                    borderColor: currentTheme?.secondary || '#E2E8F0',
                    backgroundColor: currentTheme?.background || '#F7FAFC'
                  }]}
                  value={colorInput}
                  onChangeText={setColorInput}
                  placeholder="#FF0000"
                  placeholderTextColor={currentTheme?.textSecondary || '#718096'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={7}
                  keyboardType="default"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveColor}
                />
              </View>
              <Text style={[styles.modalHint, { color: currentTheme?.textSecondary || '#718096' }]}>
                現在の色: {color}
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: currentTheme?.secondary || '#E2E8F0' }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme?.text || '#2D3748' }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: currentTheme?.primary || '#4A5568' }]}
                onPress={handleSaveColor}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme?.surface || '#FFFFFF' }]}>
                  保存
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

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
      <View style={styles.customSection}>
          <Text style={[styles.customTitle, { color: currentTheme?.text || '#2D3748' }]}>カスタムカラー設定</Text>
          
          <View style={styles.colorPickerGrid}>
            <View style={styles.colorPickerColumn}>
              <ColorPicker 
                label="背景色" 
                color={customColors.background} 
                colorType="background" 
                currentTheme={currentTheme} 
                onColorChange={async (color) => {
                  try {
                    const updatedColors = { ...customColors, background: color };
                    setCustomColors(updatedColors);
                    // 即座に反映
                    await setCustomTheme(updatedColors);
                  } catch (error) {
                    console.error('背景色の更新エラー:', error);
                  }
                }} 
              />
              <ColorPicker 
                label="プライマリ色" 
                color={customColors.primary} 
                colorType="primary" 
                currentTheme={currentTheme} 
                onColorChange={async (color) => {
                  try {
                    const updatedColors = { ...customColors, primary: color };
                    setCustomColors(updatedColors);
                    await setCustomTheme(updatedColors);
                  } catch (error) {
                    console.error('プライマリ色の更新エラー:', error);
                  }
                }} 
              />
              <ColorPicker 
                label="アクセント色" 
                color={customColors.accent} 
                colorType="accent" 
                currentTheme={currentTheme} 
                onColorChange={async (color) => {
                  try {
                    const updatedColors = { ...customColors, accent: color };
                    setCustomColors(updatedColors);
                    await setCustomTheme(updatedColors);
                  } catch (error) {
                    console.error('アクセント色の更新エラー:', error);
                  }
                }} 
              />
              <ColorPicker 
                label="テキスト色" 
                color={customColors.text} 
                colorType="text" 
                currentTheme={currentTheme} 
                onColorChange={async (color) => {
                  try {
                    const updatedColors = { ...customColors, text: color };
                    setCustomColors(updatedColors);
                    await setCustomTheme(updatedColors);
                  } catch (error) {
                    console.error('テキスト色の更新エラー:', error);
                  }
                }} 
              />
            </View>
            
            <View style={styles.colorPickerColumn}>
              <ColorPicker 
                label="表面色" 
                color={customColors.surface} 
                colorType="surface" 
                currentTheme={currentTheme} 
                onColorChange={async (color) => {
                  try {
                    const updatedColors = { ...customColors, surface: color };
                    setCustomColors(updatedColors);
                    await setCustomTheme(updatedColors);
                  } catch (error) {
                    console.error('表面色の更新エラー:', error);
                  }
                }} 
              />
              <ColorPicker 
                label="セカンダリ色" 
                color={customColors.secondary} 
                colorType="secondary" 
                currentTheme={currentTheme} 
                onColorChange={async (color) => {
                  try {
                    const updatedColors = { ...customColors, secondary: color };
                    setCustomColors(updatedColors);
                    await setCustomTheme(updatedColors);
                  } catch (error) {
                    console.error('セカンダリ色の更新エラー:', error);
                  }
                }} 
              />
              <ColorPicker 
                label="サブテキスト色" 
                color={customColors.textSecondary} 
                colorType="textSecondary" 
                currentTheme={currentTheme} 
                onColorChange={async (color) => {
                  try {
                    const updatedColors = { ...customColors, textSecondary: color };
                    setCustomColors(updatedColors);
                    await setCustomTheme(updatedColors);
                  } catch (error) {
                    console.error('サブテキスト色の更新エラー:', error);
                  }
                }} 
              />
            </View>
          </View>
          
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
  customSection: {
    marginBottom: 12,
  },
  customTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorPickerGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorPickerColumn: {
    flex: 1,
    gap: 0,
  },
  colorPickerContainer: {
    marginBottom: 10,
  },
  colorPickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
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
    marginTop: 8,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // モーダル用のスタイル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  colorPreviewLarge: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
  },
  colorInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalHint: {
    fontSize: 12,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonSave: {
    // backgroundColorは動的に設定
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

