/**
 * 管理者コード設定モーダルコンポーネント
 * 
 * 管理者コードの設定・入力を行うモーダル
 * 
 * @module app/organization-settings/components/AdminCodeModal
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';

interface AdminCodeModalProps {
  visible: boolean;
  mode: 'set' | 'enter';
  loading: boolean;
  onClose: () => void;
  onSubmit: (code: string, confirmCode?: string) => Promise<void>;
}

/**
 * 管理者コードモーダル
 */
export function AdminCodeModal({
  visible,
  mode,
  loading,
  onClose,
  onSubmit,
}: AdminCodeModalProps) {
  const { currentTheme } = useInstrumentTheme();
  const [code, setCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');

  const handleSubmit = async () => {
    if (mode === 'set') {
      await onSubmit(code, confirmCode);
    } else {
      await onSubmit(code);
    }
    setCode('');
    setConfirmCode('');
  };

  const handleClose = () => {
    setCode('');
    setConfirmCode('');
    onClose();
  };

  const isValid = mode === 'set' 
    ? code.length === 4 && confirmCode.length === 4 && code === confirmCode
    : code.length === 4;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              {mode === 'set' ? '管理者コードを設定' : '管理者コードを入力'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.modalDescription, { color: currentTheme.textSecondary }]}>
              {mode === 'set'
                ? '4桁の数字で管理者コードを設定してください。このコードを入力したユーザーは管理者になります。'
                : '組織作成者から提供された4桁の管理者コードを入力してください。'}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                管理者コード（4桁） *
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: currentTheme.background,
                  color: currentTheme.text,
                  borderColor: currentTheme.secondary,
                  textAlign: 'center',
                  fontSize: 24,
                  letterSpacing: 8,
                  fontWeight: 'bold'
                }]}
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                placeholderTextColor={currentTheme.textSecondary}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>

            {mode === 'set' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  確認用（再入力） *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary,
                    textAlign: 'center',
                    fontSize: 24,
                    letterSpacing: 8,
                    fontWeight: 'bold'
                  }]}
                  value={confirmCode}
                  onChangeText={(text) => setConfirmCode(text.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalButton, { 
                backgroundColor: currentTheme.primary,
                opacity: (loading || !isValid) ? 0.6 : 1
              }]}
              onPress={handleSubmit}
              disabled={loading || !isValid}
            >
              <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                {loading 
                  ? (mode === 'set' ? '設定中...' : '認証中...')
                  : (mode === 'set' ? '管理者コードを設定' : '管理者になる')
                }
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

// デフォルトエクスポートを追加（Expo Routerの警告を抑制）
export default AdminCodeModal;

