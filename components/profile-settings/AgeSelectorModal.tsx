import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

interface AgeSelectorModalProps {
  visible: boolean;
  selectedAge: string;
  onClose: () => void;
  onSelect: (age: number) => void;
}

// 年齢選択肢を生成（3歳から80歳まで）
const generateAgeOptions = () => {
  const ages = [];
  for (let i = 3; i <= 80; i++) {
    ages.push(i);
  }
  return ages;
};

export default function AgeSelectorModal({ visible, selectedAge, onClose, onSelect }: AgeSelectorModalProps) {
  const { currentTheme } = useInstrumentTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.ageSelectorModal, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>音楽開始年齢を選択</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <Text style={[styles.modalCloseText, { color: currentTheme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.ageGridContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.ageGrid}>
              {generateAgeOptions().map((age) => (
                <TouchableOpacity
                  key={age}
                  style={[
                    styles.ageOption,
                    { 
                      backgroundColor: selectedAge === age.toString() ? currentTheme.primary : currentTheme.background,
                      borderColor: currentTheme.secondary
                    }
                  ]}
                  onPress={() => onSelect(age)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.ageOptionText,
                    { 
                      color: selectedAge === age.toString() ? '#FFFFFF' : currentTheme.text
                    }
                  ]}>
                    {age}歳
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  ageSelectorModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '600',
  },
  ageGridContainer: {
    maxHeight: 400,
  },
  ageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  ageOption: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ageOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});





