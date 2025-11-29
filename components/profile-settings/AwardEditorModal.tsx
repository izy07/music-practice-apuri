import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import SafeView from '@/components/SafeView';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { createShadowStyle } from '@/lib/shadowStyles';

interface AwardEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
}

export default function AwardEditorModal({ visible, onClose, onSave }: AwardEditorModalProps) {
  const { currentTheme } = useInstrumentTheme();
  const [title, setTitle] = useState('');

  const handleSave = () => {
    if (title.trim()) {
      onSave(title);
      setTitle('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="none" presentationStyle="fullScreen">
      <SafeView>
        <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}> 
          <TouchableOpacity style={styles.headerBack} onPress={onClose}>
            <ArrowLeft size={24} color={currentTheme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>受賞/実績を追加</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.subSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: currentTheme.background, 
                  borderColor: currentTheme.secondary, 
                  color: currentTheme.text 
                }]}
                placeholder="例: ○○コンクール 金賞 2022-06"
                placeholderTextColor={currentTheme.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: currentTheme.primary }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>この内容で追加</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  subSection: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    }),
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

