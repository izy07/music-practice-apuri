import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, Edit, Trash2 } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';
import { formatLocalDate } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';
import EventCalendar from './EventCalendar';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { disableBackgroundFocus, enableBackgroundFocus, focusFirstElement } from '@/lib/modalFocusManager';

interface Event {
  id: string;
  title: string;
  date: string;
  description?: string;
  is_completed: boolean;
}

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate?: Date;
  event?: Event | null;
  onEventSaved: () => void;
}

export default function EventModal({
  visible,
  onClose,
  selectedDate,
  event,
  onEventSaved,
}: EventModalProps) {
  const { currentTheme } = useInstrumentTheme();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const modalContentRef = useRef<View>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(event.date);
      setDescription(event.description || '');
    } else if (selectedDate) {
      setTitle('');
      setDate(formatLocalDate(selectedDate));
      setDescription('');
    } else if (visible && !event && !selectedDate) {
      // 新規イベント作成時でselectedDateがない場合は、今日の日付を初期値として設定
      setTitle('');
      setDate(formatLocalDate(new Date()));
      setDescription('');
    }
  }, [event, selectedDate, visible]);

  // Webプラットフォームでのフォーカス管理
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (visible) {
        disableBackgroundFocus();
        // モーダルコンテンツにフォーカスを移動
        setTimeout(() => {
          if (modalContentRef.current) {
            const element = (modalContentRef.current as any)?.nativeViewRef?.current;
            if (element) {
              focusFirstElement(element);
            }
          }
        }, 100);
      } else {
        enableBackgroundFocus();
      }
    }
    
    return () => {
      if (Platform.OS === 'web' && !visible) {
        enableBackgroundFocus();
      }
    };
  }, [visible]);

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'イベントタイトルを入力してください');
      return;
    }

    if (!date) {
      Alert.alert('エラー', '日付を選択してください');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ユーザーが認証されていません');
        return;
      }

      if (event) {
        // 既存イベントの更新
        const { error } = await supabase
          .from('events')
          .update({
            title: title.trim(),
            date,
            description: description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id);

        if (error) throw error;
        logger.debug('イベントを更新しました', { eventId: event.id, date });
      } else {
        // 新規イベントの作成
        const { error } = await supabase
          .from('events')
          .insert({
            user_id: user.id,
            title: title.trim(),
            date,
            description: description.trim() || null,
          });

        if (error) throw error;
        logger.debug('イベントを登録しました', { date });
      }

      // コールバックを先に実行してからモーダルを閉じる（データベース反映を待つため）
      // 保存された日付をコールバックに渡す（カレンダーの表示月を調整するため）
      onEventSaved();
      
      // モーダルを閉じる前に少し待機（データベース反映を確実にするため）
      await new Promise(resolve => setTimeout(resolve, 200));
      onClose();
    } catch (error) {
      ErrorHandler.handle(error, 'イベント保存', true);
      Alert.alert('エラー', 'イベントの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    logger.debug('削除ボタンがクリックされました', event);
    if (!event) {
      logger.debug('イベントが存在しません');
      return;
    }

    Alert.alert(
      '削除の確認',
      'このイベントを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            logger.debug('削除を実行します:', event.id);
            setLoading(true);
            try {
              const { data, error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id)
                .select();

              logger.debug('削除結果:', { data, error });

              if (error) {
                ErrorHandler.handle(error, 'イベント削除', true);
                throw error;
              }
              
              logger.debug('イベントを削除しました、コールバックを実行します');
              onEventSaved();
              logger.debug('onEventSavedコールバックを実行しました');
              onClose();
              
              // 削除成功のアラートは削除後に表示
              setTimeout(() => {
                Alert.alert('成功', 'イベントを削除しました');
              }, 100);
            } catch (error) {
              ErrorHandler.handle(error, 'イベント削除', true);
              Alert.alert('エラー', 'イベントの削除に失敗しました');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View 
          ref={modalContentRef}
          style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}
          {...(Platform.OS === 'web' ? { 
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'event-modal-title',
            'data-modal-content': true
          } : {})}
        >
          <SafeAreaView>
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text 
                id="event-modal-title"
                style={[styles.headerTitle, { color: currentTheme.text }]}
              >
                {event ? 'イベントを編集' : 'イベントを登録'}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* タイトル入力 */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: currentTheme.text }]}>
                  イベントタイトル *
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.secondary,
                    },
                  ]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="例：定期演奏会、発表会、レッスン"
                  placeholderTextColor={currentTheme.textSecondary}
                  maxLength={50}
                />
              </View>

              {/* 日付入力（手入力を廃止し、カレンダー選択のみ） */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: currentTheme.text }]}>
                  日付 *
                </Text>
                <View style={styles.dateInputContainer}>
                  <TouchableOpacity
                    style={[
                      styles.textInput,
                      styles.dateTextInput,
                      {
                        backgroundColor: currentTheme.background,
                        borderColor: currentTheme.secondary,
                        justifyContent: 'center',
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={openDatePicker}
                  >
                    <Text style={{ color: date ? currentTheme.text : currentTheme.textSecondary }}>
                      {date ? `${new Date(date).getFullYear()}-${String(new Date(date).getMonth() + 1).padStart(2, '0')}-${String(new Date(date).getDate()).padStart(2, '0')}` : '日付を選択'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.calendarButton, { backgroundColor: currentTheme.primary }]}
                    onPress={openDatePicker}
                  >
                    <Calendar size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 説明入力 */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: currentTheme.text }]}>
                  説明（任意）
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.secondary,
                    },
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="イベントの詳細やメモを入力"
                  placeholderTextColor={currentTheme.textSecondary}
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                />
              </View>

              {/* ボタン */}
              <View style={styles.buttonContainer}>
                {event && (
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: '#FF4444' }]}
                    onPress={handleDelete}
                    disabled={loading}
                  >
                    <Trash2 size={20} color="#FF4444" />
                    <Text style={[styles.deleteButtonText, { color: '#FF4444' }]}>
                      削除
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: currentTheme.primary,
                      opacity: loading ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text style={[styles.saveButtonText, { color: currentTheme.surface }]}>
                    {loading ? '保存中...' : event ? '更新' : '登録'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>

      {/* 日付選択カレンダーモーダル */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={[styles.datePickerContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.calendarCloseButtonText, { color: currentTheme.primary }]}>閉じる</Text>
              </TouchableOpacity>
            </View>
            
            <EventCalendar
              onDateSelect={(date: Date) => {
                const formattedDate = formatLocalDate(date);
                setDate(formattedDate);
                setShowDatePicker(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // 日付入力用のスタイル
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTextInput: {
    flex: 1,
  },
  calendarButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 日付選択カレンダー用のスタイル
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContent: {
    width: 320,
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  calendarCloseButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
