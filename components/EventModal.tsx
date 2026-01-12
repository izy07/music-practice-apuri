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
import { getInstrumentId } from '@/lib/instrumentUtils';
import EventCalendar from './EventCalendar';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { disableBackgroundFocus, enableBackgroundFocus, focusFirstElement, blurActiveElement } from '@/lib/modalFocusManager';
import { isColumnNotFoundError, handleColumnError } from '@/lib/columnErrorHandler';
import { EVENT_COLORS, DEFAULT_EVENT_COLOR, EventColor, getEventColorOption } from '@/lib/eventColors';

interface Event {
  id: string;
  title: string;
  date: string;
  description?: string;
  is_completed: boolean;
  color?: EventColor | string | null;
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
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [eventColor, setEventColor] = useState<EventColor>(DEFAULT_EVENT_COLOR);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const modalContentRef = useRef<View>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(event.date);
      setEventColor((event.color as EventColor) || DEFAULT_EVENT_COLOR);
    } else if (selectedDate) {
      setTitle('');
      setDate(formatLocalDate(selectedDate));
      setEventColor(DEFAULT_EVENT_COLOR);
    } else if (visible && !event && !selectedDate) {
      // 新規イベント作成時でselectedDateがない場合は、今日の日付を初期値として設定
      setTitle('');
      setDate(formatLocalDate(new Date()));
      setEventColor(DEFAULT_EVENT_COLOR);
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
        // dateとevent_dateの両方を設定（テーブルスキーマの互換性のため）
        const updateData: any = {
          title: title.trim(),
          date,
          description: null,
          color: eventColor,
          updated_at: new Date().toISOString(),
        };
        
        // event_dateカラムが存在する場合は、dateと同じ値を設定
        if (date) {
          updateData.event_date = date;
        }
        
        // 楽器IDを設定（selectedInstrumentがある場合）
        const instrumentId = getInstrumentId(selectedInstrument);
        if (instrumentId) {
          updateData.instrument_id = instrumentId;
        }
        
        // event_dateカラムが存在する場合は、dateと同じ値を設定
        if (date) {
          updateData.event_date = date;
        }
        
        let { error } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', event.id);

        // カラムが存在しないエラーの場合、該当カラムを除外して再試行
        if (error && isColumnNotFoundError(error)) {
          const optionalColumns = ['instrument_id', 'event_date', 'color'];
          const handled = handleColumnError(error, updateData, optionalColumns);
          
          if (handled) {
            logger.warn('[EventModal] カラムが存在しないため、除外して再試行します', {
              errorCode: error.code,
              errorMessage: error.message,
              excludedColumns: handled.excludedColumns
            });
            
            let retryResult = await supabase
              .from('events')
              .update(handled.payload)
              .eq('id', event.id);
            
            // 再試行後もエラーが発生した場合、さらに他のカラムを除外して再試行
            if (retryResult.error && isColumnNotFoundError(retryResult.error)) {
              const secondHandled = handleColumnError(retryResult.error, handled.payload, optionalColumns);
              if (secondHandled) {
                retryResult = await supabase
                  .from('events')
                  .update(secondHandled.payload)
                  .eq('id', event.id);
              }
            }
            
            if (retryResult.error) {
              logger.error('[EventModal] イベント更新エラー（再試行後）:', retryResult.error);
              throw retryResult.error;
            }
            
            logger.info('[EventModal] カラムを除外してイベントの更新に成功しました', {
              excludedColumns: handled.excludedColumns
            });
          } else if (error) {
            throw error;
          }
        } else if (error) {
          throw error;
        }
        logger.debug('イベントを更新しました', { eventId: event.id, date, event_date: updateData.event_date });
      } else {
        // 新規イベントの作成
        // dateとevent_dateの両方を設定（テーブルスキーマの互換性のため）
        const insertData: any = {
          user_id: user.id,
          title: title.trim(),
          date,
          description: null,
          color: eventColor,
        };
        
        // event_dateカラムが存在する場合は、dateと同じ値を設定
        if (date) {
          insertData.event_date = date;
        }
        
        // 楽器IDを設定（selectedInstrumentがある場合）
        const instrumentId = getInstrumentId(selectedInstrument);
        if (instrumentId) {
          insertData.instrument_id = instrumentId;
        }
        
        let { error } = await supabase
          .from('events')
          .insert(insertData);

        // カラムが存在しないエラーの場合、該当カラムを除外して再試行
        if (error && isColumnNotFoundError(error)) {
          const optionalColumns = ['instrument_id', 'event_date', 'color'];
          const handled = handleColumnError(error, insertData, optionalColumns);
          
          if (handled) {
            logger.warn('[EventModal] カラムが存在しないため、除外して再試行します', {
              errorCode: error.code,
              errorMessage: error.message,
              excludedColumns: handled.excludedColumns
            });
            
            let retryResult = await supabase
              .from('events')
              .insert(handled.payload);
            
            // 再試行後もエラーが発生した場合、さらに他のカラムを除外して再試行
            if (retryResult.error && isColumnNotFoundError(retryResult.error)) {
              const secondHandled = handleColumnError(retryResult.error, handled.payload, optionalColumns);
              if (secondHandled) {
                retryResult = await supabase
                  .from('events')
                  .insert(secondHandled.payload);
              }
            }
            
            if (retryResult.error) {
              logger.error('[EventModal] イベント作成エラー（再試行後）:', retryResult.error);
              throw retryResult.error;
            }
            
            logger.info('[EventModal] カラムを除外してイベントの作成に成功しました', {
              excludedColumns: handled.excludedColumns
            });
          } else if (error) {
            throw error;
          }
        } else if (error) {
          throw error;
        }
        logger.debug('イベントを登録しました', { date, event_date: insertData.event_date });
      }

      // コールバックを先に実行してからモーダルを閉じる（データベース反映を待つため）
      // 保存された日付をコールバックに渡す（カレンダーの表示月を調整するため）
      onEventSaved();
      
      // モーダルを閉じる前に少し待機（データベース反映を確実にするため）
      await new Promise(resolve => setTimeout(resolve, 200));
      // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
      blurActiveElement();
      onClose();
    } catch (error) {
      ErrorHandler.handle(error, 'イベント保存', true);
      Alert.alert('エラー', 'イベントの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    logger.debug('EventModal: 削除ボタンがクリックされました', event);
    if (!event) {
      logger.debug('EventModal: イベントが存在しません');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('イベントが見つかりません');
      } else {
        Alert.alert('エラー', 'イベントが見つかりません');
      }
      return;
    }

    logger.debug('EventModal: 削除確認ダイアログを表示します');
    
    // Web環境ではwindow.confirmを使用
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(`「${event.title}」を削除しますか？`);
    } else {
      // React Native環境ではAlert.alertを使用
      await new Promise<void>((resolve) => {
        Alert.alert(
          '削除の確認',
          `「${event.title}」を削除しますか？`,
          [
            { 
              text: 'キャンセル', 
              style: 'cancel',
              onPress: () => {
                logger.debug('EventModal: 削除がキャンセルされました');
                resolve();
              }
            },
            {
              text: '削除',
              style: 'destructive',
              onPress: () => {
                confirmed = true;
                resolve();
              }
            }
          ],
          { cancelable: true, onDismiss: () => resolve() }
        );
      });
    }
    
    if (!confirmed) {
      logger.debug('EventModal: 削除がキャンセルされました');
      return;
    }
    
    logger.debug('EventModal: 削除を実行します', event.id);
    setLoading(true);
    try {
      logger.debug('EventModal: Supabase削除クエリを実行します');
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)
        .select();

      logger.debug('EventModal: 削除結果', { data, error });

      if (error) {
        logger.error('EventModal: イベント削除エラー', error);
        ErrorHandler.handle(error, 'イベント削除', true);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('イベントの削除に失敗しました');
        } else {
          Alert.alert('エラー', 'イベントの削除に失敗しました');
        }
        setLoading(false);
        return;
      }
      
      logger.debug('EventModal: イベントを削除しました、コールバックを実行します');
      onEventSaved();
      logger.debug('EventModal: onEventSavedコールバックを実行しました');
      
      // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
      blurActiveElement();
      onClose();
      
      // 削除成功のアラートは削除後に表示
      setTimeout(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('イベントを削除しました');
        } else {
          Alert.alert('削除完了', 'イベントを削除しました');
        }
      }, 100);
    } catch (error) {
      logger.error('EventModal: イベント削除例外', error);
      ErrorHandler.handle(error, 'イベント削除', true);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('イベントの削除に失敗しました');
      } else {
        Alert.alert('エラー', 'イベントの削除に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setEventColor(DEFAULT_EVENT_COLOR);
  };

  const handleClose = () => {
    resetForm();
    // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
    blurActiveElement();
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
          <SafeAreaView style={styles.safeArea}>
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

            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
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

              {/* 色選択 */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: currentTheme.text }]}>
                  イベントの色 *
                </Text>
                <Text style={[styles.colorDescription, { color: currentTheme.textSecondary }]}>
                  {getEventColorOption(eventColor).description}
                </Text>
                <View style={styles.colorPickerContainer}>
                  {Object.values(EVENT_COLORS).map((colorOption) => (
                    <View key={colorOption.value} style={styles.colorOptionContainer}>
                      <TouchableOpacity
                        style={[
                          styles.colorOption,
                          {
                            backgroundColor: colorOption.color,
                            borderColor: eventColor === colorOption.value ? currentTheme.text : 'transparent',
                            borderWidth: eventColor === colorOption.value ? 3 : 1,
                          },
                        ]}
                        onPress={() => setEventColor(colorOption.value)}
                      >
                        {eventColor === colorOption.value && (
                          <Text style={styles.colorCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.colorLabel,
                          {
                            color: eventColor === colorOption.value ? currentTheme.primary : currentTheme.textSecondary,
                            fontWeight: eventColor === colorOption.value ? '600' : '400',
                          },
                        ]}
                      >
                        {colorOption.label}
                      </Text>
                    </View>
                  ))}
                </View>
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
    ...(Platform.OS === 'web' ? { zIndex: 10000 } : {}), // PracticeRecordModalの上に表示
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    width: '100%',
    ...(Platform.OS === 'web' ? { zIndex: 10001 } : {}), // PracticeRecordModalの上に表示
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
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
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
  colorDescription: {
    fontSize: 12,
    marginBottom: 12,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    marginBottom: 8,
    gap: 8,
  },
  colorOptionContainer: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // flex: 1で均等に配置するため、minWidthを0に設定
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 4,
  },
  colorCheckmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  colorLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
});
