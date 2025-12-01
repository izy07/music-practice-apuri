import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Music, Edit3, Trash2, Star, Play, Clock, Target, CheckCircle2, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { supabase } from '@/lib/supabase';
import { canAccessFeature } from '../../lib/subscriptionService';
import EventCalendar from '@/components/EventCalendar';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { safeGoBack } from '@/lib/navigationUtils';

interface Song {
  id: string;
  title: string;
  composer: string;
  genre: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'want_to_play' | 'learning' | 'played' | 'mastered';
  notes: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
}

export default function MyLibraryScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  
  // サブスクリプション状態を模擬（実際の実装では適切なフックを使用）
  const entitlement = { isEntitled: true }; // 仮の値
  const entitlementLoading = false;
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [filterStatus, setFilterStatus] = useState<'want_to_play' | 'learning' | 'played' | 'mastered'>('want_to_play');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 新規追加・編集用の状態
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    genre: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    status: 'want_to_play' as 'want_to_play' | 'learning' | 'played' | 'mastered',
    notes: '',
    target_date: ''
  });

  // 初期ロード + 権限変化時に再評価
  useEffect(() => {
    loadSongs();
  }, [entitlement.isEntitled]);

  // 曲の読み込み
  const loadSongs = async () => {
    try {
      // ペイウォール: 未購読かつトライアル外はデータ非表示
      if (!canAccessFeature('my-library', entitlement)) {
        setSongs([]);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('my_songs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSongs(data || []);
      }
            } catch (error) {
          // 曲の読み込みエラー
        }
  };

  // 曲の保存
  const saveSong = async () => {
    if (!formData.title.trim()) {
      Alert.alert('エラー', '曲名を入力してください');
      return;
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        ErrorHandler.handle(authError, '認証', true);
        Alert.alert('エラー', 'ログインが必要です。再度ログインしてください。');
        return;
      }

      logger.debug('認証成功:', user.id);

      if (editingSong) {
        // 編集
        logger.debug('曲を更新:', editingSong.id, formData);
        const { error } = await supabase
          .from('my_songs')
          .update({
            ...formData
          })
          .eq('id', editingSong.id);

        if (error) {
          ErrorHandler.handle(error, '曲更新', true);
          throw error;
        }
        
        logger.debug('更新成功');
        Alert.alert('成功', '曲の情報を更新しました', [
          {
            text: 'OK',
            onPress: () => {
              setShowAddModal(false);
              setEditingSong(null);
              resetForm();
              loadSongs();
            }
          }
        ]);
      } else {
        // 新規追加
        const songData = {
          user_id: user.id,
          ...formData
        };
        logger.debug('新規追加:', songData);
        
        const { error } = await supabase
          .from('my_songs')
          .insert(songData);

        if (error) {
          ErrorHandler.handle(error, '曲追加', true);
          throw error;
        }
        
        logger.debug('追加成功');
        
        // 保存成功のメッセージを表示
        const statusText = formData.status === 'learning' ? '練習中の曲' : 
                          formData.status === 'played' ? '演奏済みの曲' :
                          formData.status === 'mastered' ? 'マスター済みの曲' : 
                          '弾きたい曲';
        Alert.alert('保存完了！', `${statusText}を追加しました`, [
          {
            text: 'OK',
            onPress: () => {
              setShowAddModal(false);
              setEditingSong(null);
              resetForm();
              loadSongs();
            }
          }
        ]);
      }
    } catch (error: unknown) {
      ErrorHandler.handle(error, '曲保存', true);
      const errorMessage = (error as { message?: string; error_description?: string })?.message || 
                          (error as { error_description?: string })?.error_description || 
                          '曲の保存に失敗しました';
      Alert.alert('エラー', `保存できませんでした\n\n詳細: ${errorMessage}`);
    }
  };

  // 曲の削除
  const deleteSong = async (songId: string) => {
    Alert.alert(
      '削除確認',
      'この曲を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('my_songs')
                .delete()
                .eq('id', songId);

              if (error) throw error;
              Alert.alert('成功', '曲を削除しました');
              loadSongs();
                    } catch (error) {
          Alert.alert('エラー', '曲の削除に失敗しました');
        }
          }
        }
      ]
    );
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      title: '',
      composer: '',
      genre: '',
      difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
      status: 'want_to_play' as 'want_to_play' | 'learning' | 'mastered',
      notes: '',
      target_date: ''
    });
  };

  // 編集開始
  const startEditing = (song: Song) => {
    setEditingSong(song);
    setFormData({
      title: song.title,
      composer: song.composer,
      genre: song.genre,
      difficulty: song.difficulty as 'beginner' | 'intermediate' | 'advanced',
      status: song.status as 'want_to_play' | 'learning' | 'mastered',
      notes: song.notes,
      target_date: song.target_date || ''
    });
    setShowAddModal(true);
  };

  // 新規追加開始
  const startAdding = () => {
    setEditingSong(null);
    resetForm();
    setShowAddModal(true);
  };

  // フィルタリングされた曲リスト
  const filteredSongs = songs.filter(song => song.status === filterStatus);

  // 難易度の表示
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '初級';
      case 'intermediate': return '中級';
      case 'advanced': return 'マスター';
      default: return difficulty;
    }
  };

  // ステータスの表示
  const getStatusText = (status: string) => {
    switch (status) {
      case 'want_to_play': return '弾きたい';
      case 'learning': return '練習中';
      case 'played': return '演奏済み';
      case 'mastered': return 'マスター';
      default: return status;
    }
  };

  // ステータスの色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'want_to_play': return '#FF9800';
      case 'learning': return '#2196F3';
      case 'played': return '#9C27B0';
      case 'mastered': return '#4CAF50';
      default: return '#666666';
    }
  };

  const goBack = () => {
    safeGoBack('/(tabs)/settings', true); // 強制的にsettings画面に戻る
  };

  // サブスク状態読込中は何も表示しない（誤ってプレミアム限定を出さない）
  if (entitlementLoading) {
    return null;
  }

  // 非購読時のゲート表示
  if (!canAccessFeature('my-library', entitlement)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} > 
        <InstrumentHeader />
        <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}> 
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings' as any)} style={styles.backButton}>
            <Text style={{ color: currentTheme.text }}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>マイライブラリ</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.songsContainer}>
          <View style={styles.emptyContainer}>
            <Music size={64} color={currentTheme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>プレミアム限定</Text>
            <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary }]}>マイライブラリはプレミアムでご利用いただけます</Text>
            <TouchableOpacity 
              style={[styles.emptyAddButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => router.push('/(tabs)/pricing-plans')}
            >
              <Text style={styles.emptyAddButtonText}>料金プランを見る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          マイライブラリ
        </Text>
        <TouchableOpacity onPress={startAdding} style={styles.addButton}>
          <Plus size={24} color={currentTheme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* フィルター */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            {[
              { key: 'want_to_play', label: '弾きたい' },
              { key: 'learning', label: '練習中' },
              { key: 'played', label: '演奏済み' },
              { key: 'mastered', label: 'マスター' }
            ].map((filter, index) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  filterStatus === filter.key && { backgroundColor: currentTheme.primary },
                  index === 0 && styles.firstFilterButton
                ]}
                onPress={() => setFilterStatus(filter.key as any)}
              >
                <Text style={[
                  styles.filterButtonText,
                  { color: filterStatus === filter.key ? '#FFFFFF' : currentTheme.text }
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 曲リスト */}
        <View style={styles.songsContainer}>
          {filteredSongs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Music size={64} color={currentTheme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
                まだ曲がありません
              </Text>
              <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary }]}>
                弾きたい曲を追加してみましょう！
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddButton, { backgroundColor: currentTheme.primary }]}
                onPress={startAdding}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.emptyAddButtonText}>曲を追加</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSongs.map(song => (
              <View style={[styles.songCard, { backgroundColor: currentTheme.surface }]}>
                <View style={styles.songHeader}>
                  <View style={styles.songInfo}>
                    <Text style={[styles.songTitle, { color: currentTheme.text }]}>
                      {song.title}
                    </Text>
                    <Text style={[styles.songComposer, { color: currentTheme.textSecondary }]}>
                      {song.composer}
                    </Text>
                  </View>
                  <View style={styles.songActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => startEditing(song)}
                    >
                      <Edit3 size={16} color={currentTheme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => deleteSong(song.id)}
                    >
                      <Trash2 size={16} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.songDetails}>
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: currentTheme.textSecondary }]}>
                      ジャンル
                    </Text>
                    <Text style={[styles.detailValue, { color: currentTheme.text }]}>
                      {song.genre}
                    </Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: currentTheme.textSecondary }]}>
                      難易度
                    </Text>
                    <Text style={[styles.detailValue, { color: currentTheme.text }]}>
                      {getDifficultyText(song.difficulty)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: currentTheme.textSecondary }]}>
                      ステータス
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(song.status) }]}>
                      <Text style={styles.statusText}>
                        {getStatusText(song.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {song.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={[styles.notesLabel, { color: currentTheme.textSecondary }]}>
                      メモ
                    </Text>
                    <Text style={[styles.notesText, { color: currentTheme.text }]}>
                      {song.notes}
                    </Text>
                  </View>
                )}
                
                {song.target_date && (
                  <View style={styles.targetContainer}>
                    <Target size={16} color={currentTheme.primary} />
                    <Text style={[styles.targetText, { color: currentTheme.primary }]}>
                      目標日: {song.target_date}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 追加・編集モーダル */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: currentTheme.secondary }]}>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={[styles.modalCloseText, { color: currentTheme.textSecondary }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              {editingSong ? '曲を編集' : (
                formData.status === 'learning' ? '練習中の曲を追加' : 
                formData.status === 'mastered' ? 'マスター済みの曲を追加' : 
                '弾きたい曲を追加'
              )}
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>曲名 *</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text,
                  borderColor: currentTheme.secondary
                }]}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="曲名を入力"
                placeholderTextColor={currentTheme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>アーティスト</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text,
                  borderColor: currentTheme.secondary
                }]}
                value={formData.composer}
                onChangeText={(text) => setFormData(prev => ({ ...prev, composer: text }))}
                placeholder="作曲者名を入力（任意）"
                placeholderTextColor={currentTheme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>ジャンル</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.genreContainer}>
                  {['クラシック', 'ポップス', 'ジャズ', 'ロック', 'アニメ', 'ゲーム', 'その他'].map(genre => 
                    React.createElement(TouchableOpacity, {
                      key: genre,
                      style: [
                        styles.genreChip,
                        formData.genre === genre && { backgroundColor: currentTheme.primary }
                      ],
                      onPress: () => setFormData(prev => ({ ...prev, genre }))
                    },
                      React.createElement(Text, {
                        style: [
                          styles.genreChipText,
                          { color: formData.genre === genre ? '#FFFFFF' : currentTheme.text }
                        ]
                      }, genre)
                    )
                  )}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: currentTheme.text }]}>難易度</Text>
                <View style={styles.pickerContainer}>
                  {['beginner', 'intermediate', 'advanced'].map(difficulty => (
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        formData.difficulty === difficulty && { backgroundColor: currentTheme.primary }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, difficulty: difficulty as any }))}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        { color: formData.difficulty === difficulty ? '#FFFFFF' : currentTheme.text }
                      ]}>
                        {getDifficultyText(difficulty)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.formLabel, { color: currentTheme.text }]}>ステータス</Text>
                <View style={styles.pickerContainer}>
                  {['want_to_play', 'learning', 'played', 'mastered'].map(status => (
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        formData.status === status && { backgroundColor: currentTheme.primary }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status: status as any }))}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        { color: formData.status === status ? '#FFFFFF' : currentTheme.text }
                      ]}>
                        {getStatusText(status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>目標日</Text>
              <TouchableOpacity
                style={[styles.datePickerButton, { 
                  backgroundColor: currentTheme.surface,
                  borderColor: currentTheme.secondary
                }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={18} color={currentTheme.textSecondary} />
                <Text style={[styles.datePickerText, { 
                  color: formData.target_date ? currentTheme.text : currentTheme.textSecondary 
                }]}>
                  {formData.target_date || '目標日を選択'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>メモ</Text>
              <TextInput
                style={[styles.formTextArea, { 
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text,
                  borderColor: currentTheme.secondary
                }]}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="練習のポイントやメモを入力"
                placeholderTextColor={currentTheme.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* 保存ボタン */}
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity 
                onPress={saveSong} 
                style={[styles.modalSaveButton, { backgroundColor: currentTheme.primary }]}
              >
                <CheckCircle2 size={20} color="#FFFFFF" />
                <Text style={styles.modalSaveText}>
                  保存
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 日付選択モーダル */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currentTheme.secondary }]}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              style={styles.modalCloseButton}
            >
              <Text style={[styles.modalCloseText, { color: currentTheme.textSecondary }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              目標日を選択
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <View style={{ flex: 1, padding: 16 }}>
            <EventCalendar
              onDateSelect={(date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                setFormData(prev => ({ ...prev, target_date: dateString }));
                setShowDatePicker(false);
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterContainer: {
    marginVertical: 20,
    marginLeft: -20,
    paddingLeft: 0,
    marginRight: -20,
  },
  filterScrollContent: {
    paddingLeft: 0,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  firstFilterButton: {
    marginLeft: 4,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  songsContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  songCard: {
    borderRadius: 16,
    padding: 20,
    
    
    
    elevation: 4,
  },
  songHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  songInfo: {
    flex: 1,
    marginRight: 16,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  songComposer: {
    fontSize: 16,
    fontWeight: '500',
  },
  songActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  songDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  targetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalHeaderSpacer: {
    width: 80, // 保存ボタンと同じ幅のスペーサー
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
    
    
    
    elevation: 4,
  },
  saveButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 12,
  },
  genreContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  genreChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  datePickerText: {
    fontSize: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  // 容量関連のスタイル
  capacityInfo: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    
    
    
    elevation: 3,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  capacityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  capacityExpiry: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  capacityBoostButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    
    
    
    elevation: 2,
  },
  capacityBoostText: {
    fontSize: 16,
    fontWeight: '600',
  },

  pickerContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
