import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { Plus, ArrowLeft, CheckCircle2, BookOpen, Users, Edit2, Trash2 } from 'lucide-react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

type MusicTerm = {
  id: string;
  term: string;
  reading: string;
  category: string;
  meaning_ja: string;
  meaning_en: string;
  description_ja?: string | null;
  description_en?: string | null;
  frequency?: 'rare' | 'common' | 'very_common' | null;
  is_user_added?: boolean;
};

type EnsembleTerm = {
  id: string;
  term: string;
  reading: string;
  meaning_ja: string;
  description_ja?: string | null;
  instrument: string;
};

export default function MusicDictionaryScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const [query, setQuery] = useState('');
  const [terms, setTerms] = useState<MusicTerm[]>([]);
  const [ensembleTerms, setEnsembleTerms] = useState<EnsembleTerm[]>([]);
  const [filtered, setFiltered] = useState<MusicTerm[]>([]);
  const [filteredEnsemble, setFilteredEnsemble] = useState<EnsembleTerm[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'tempo' | 'dynamics' | 'expression' | 'articulation' | 'accidental'>('all');
  const [activeTab, setActiveTab] = useState<'music' | 'ensemble'>('music');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<MusicTerm | null>(null);
  const [newTerm, setNewTerm] = useState({
    term: '',
    reading: '',
    meaning_ja: '',
    description_ja: '',
    category: 'tempo'
  });

  useEffect(() => {
    loadTerms();
    loadEnsembleTerms();
  }, []);

  const loadTerms = async () => {
    try {
      const { data, error } = await supabase
        .from('music_terms')
        .select('*')
        .order('term', { ascending: true });
      
      if (error) {
        ErrorHandler.handle(error, '音楽用語取得', false);
        return;
      }
      
      setTerms(data || []);
      setFiltered(data || []);
    } catch (err) {
      ErrorHandler.handle(err, '音楽用語取得', false);
    }
  };

  const loadEnsembleTerms = async () => {
    // 合奏用語のデータ（楽器別）
    const ensembleData: EnsembleTerm[] = [
      // ヴァイオリンの合奏用語
      { id: 'v1', term: 'div.', reading: 'ディビジ', meaning_ja: '分割', description_ja: 'パートを複数に分けて演奏する', instrument: 'Violin' },
      { id: 'v2', term: 'unis.', reading: 'ユニゾン', meaning_ja: '同音', description_ja: '全パートが同じ音を演奏する', instrument: 'Violin' },
      { id: 'v3', term: 'solo', reading: 'ソロ', meaning_ja: '独奏', description_ja: '一人で演奏する部分', instrument: 'Violin' },
      { id: 'v4', term: 'tutti', reading: 'トゥッティ', meaning_ja: '全奏', description_ja: '全員で演奏する部分', instrument: 'Violin' },
      
      // ピアノの合奏用語
      { id: 'p1', term: 'm.g.', reading: 'マノ・ガウチェ', meaning_ja: '左手', description_ja: '左手で演奏する部分', instrument: 'Piano' },
      { id: 'p2', term: 'm.d.', reading: 'マノ・デストラ', meaning_ja: '右手', description_ja: '右手で演奏する部分', instrument: 'Piano' },
      { id: 'p3', term: 'colla parte', reading: 'コラ・パルテ', meaning_ja: 'パートに合わせて', description_ja: '他の楽器に合わせて演奏', instrument: 'Piano' },
      
      // フルートの合奏用語
      { id: 'f1', term: 'a2', reading: 'ア・ドゥエ', meaning_ja: '2人で', description_ja: '2人で同じパートを演奏', instrument: 'Flute' },
      { id: 'f2', term: 'a3', reading: 'ア・トレ', meaning_ja: '3人で', description_ja: '3人で同じパートを演奏', instrument: 'Flute' },
      
      // トランペットの合奏用語
      { id: 't1', term: 'rip.', reading: 'リピエノ', meaning_ja: '補強', description_ja: '他の楽器を補強する', instrument: 'Trumpet' },
      { id: 't2', term: 'fanfare', reading: 'ファンファーレ', meaning_ja: 'ファンファーレ', description_ja: '華やかな合奏部分', instrument: 'Trumpet' },
      
      // ドラムの合奏用語
      { id: 'd1', term: 'fill', reading: 'フィル', meaning_ja: 'フィル', description_ja: 'フレーズのつなぎ部分', instrument: 'Drums' },
      { id: 'd2', term: 'break', reading: 'ブレイク', meaning_ja: 'ブレイク', description_ja: '他の楽器が休む間の演奏', instrument: 'Drums' },
    ];
    
    setEnsembleTerms(ensembleData);
    setFilteredEnsemble(ensembleData);
  };

  useEffect(() => {
    const q = query.trim().toLowerCase();
    
    // 音楽用語のフィルタリング
    const byText = (list: MusicTerm[]) => {
      if (!q) return list;
      return list.filter((t) =>
        [t.term, t.reading, t.meaning_ja, t.meaning_en, t.description_ja || '', t.description_en || '']
          .join(' ').toLowerCase().includes(q)
      );
    };
    
    const byCategory = (list: MusicTerm[]) => {
      if (categoryFilter === 'all') return list;
      return list.filter((t) => t.category === categoryFilter);
    };
    
    setFiltered(byCategory(byText(terms)));
    
    // 合奏用語のフィルタリング
    const byTextEnsemble = (list: EnsembleTerm[]) => {
      if (!q) return list;
      return list.filter((t) =>
        [t.term, t.reading, t.meaning_ja, t.description_ja || '']
          .join(' ').toLowerCase().includes(q)
      );
    };
    
    const byInstrument = (list: EnsembleTerm[]) => {
      return list.filter(t => t.instrument === selectedInstrument?.name_en);
    };
    
    setFilteredEnsemble(byInstrument(byTextEnsemble(ensembleTerms)));
  }, [query, terms, ensembleTerms, categoryFilter, selectedInstrument]);

  const addUserTerm = async () => {
    if (!newTerm.term.trim() || !newTerm.meaning_ja.trim()) {
      Alert.alert('エラー', '用語と意味は必須です');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', '認証が必要です');
        return;
      }

      if (editingTerm) {
        // 編集モード
        const { error } = await supabase
          .from('music_terms')
          .update({
            term: newTerm.term,
            reading: newTerm.reading,
            meaning_ja: newTerm.meaning_ja,
            description_ja: newTerm.description_ja || null,
            category: newTerm.category,
          })
          .eq('id', editingTerm.id)
          .eq('user_id', user.id)
          .eq('is_user_added', true);

        if (error) {
          logger.error('用語更新エラー:', error);
          Alert.alert('エラー', `用語の更新に失敗しました: ${error.message}`);
          return;
        }

        Alert.alert('成功', '用語を更新しました');
      } else {
        // 新規追加モード
        const { error } = await supabase
          .from('music_terms')
          .insert({
            term: newTerm.term,
            reading: newTerm.reading,
            meaning_ja: newTerm.meaning_ja,
            meaning_en: '',
            description_ja: newTerm.description_ja || null,
            description_en: null,
            category: newTerm.category,
            frequency: 'rare',
            is_user_added: true,
            user_id: user.id
          });

        if (error) {
          logger.error('用語追加エラー:', error);
          Alert.alert('エラー', `用語の追加に失敗しました: ${error.message}`);
          return;
        }

        Alert.alert('成功', '用語を追加しました');
      }

      setShowAddModal(false);
      setEditingTerm(null);
      setNewTerm({
        term: '',
        reading: '',
        meaning_ja: '',
        description_ja: '',
        category: 'tempo'
      });
      loadTerms();
    } catch (error) {
      ErrorHandler.handle(error, editingTerm ? '用語更新' : '用語追加', true);
      Alert.alert('エラー', editingTerm ? '用語の更新に失敗しました' : '用語の追加に失敗しました');
    }
  };

  const handleEditTerm = (term: MusicTerm) => {
    setEditingTerm(term);
    setNewTerm({
      term: term.term,
      reading: term.reading,
      meaning_ja: term.meaning_ja,
      description_ja: term.description_ja || '',
      category: term.category
    });
    setShowAddModal(true);
  };

  const handleDeleteTerm = async (term: MusicTerm) => {
    Alert.alert(
      '確認',
      `「${term.term}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('エラー', '認証が必要です');
                return;
              }

              const { error } = await supabase
                .from('music_terms')
                .delete()
                .eq('id', term.id)
                .eq('user_id', user.id)
                .eq('is_user_added', true);

              if (error) {
                logger.error('用語削除エラー:', error);
                Alert.alert('エラー', `用語の削除に失敗しました: ${error.message}`);
                return;
              }

              Alert.alert('成功', '用語を削除しました');
              loadTerms();
            } catch (error) {
              ErrorHandler.handle(error, '用語削除', true);
              Alert.alert('エラー', '用語の削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}> 
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}> 
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings' as any)} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>音楽用語辞典</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: currentTheme.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* タブ切り替え */}
      <View style={[styles.tabContainer, { backgroundColor: currentTheme.surface }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { 
              backgroundColor: activeTab === 'music' ? currentTheme.primary : 'transparent',
              borderColor: currentTheme.primary
            }
          ]}
          onPress={() => setActiveTab('music')}
        >
          <BookOpen size={16} color={activeTab === 'music' ? '#FFFFFF' : currentTheme.primary} />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'music' ? '#FFFFFF' : currentTheme.text }
          ]}>
            音楽用語
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { 
              backgroundColor: activeTab === 'ensemble' ? currentTheme.primary : 'transparent',
              borderColor: currentTheme.primary
            }
          ]}
          onPress={() => setActiveTab('ensemble')}
        >
          <Users size={16} color={activeTab === 'ensemble' ? '#FFFFFF' : currentTheme.primary} />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'ensemble' ? '#FFFFFF' : currentTheme.text }
          ]}>
            合奏用語
          </Text>
        </TouchableOpacity>
      </View>


      {/* 検索バー */}
      <View style={[styles.searchSection, { backgroundColor: currentTheme.surface }]}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: currentTheme.background, 
            color: currentTheme.text, 
            borderColor: currentTheme.secondary 
          }]}
          placeholder="用語・よみ・意味で検索"
          placeholderTextColor={currentTheme.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* カテゴリフィルタ（音楽用語のみ） */}
      {activeTab === 'music' && (
        <View style={[styles.filterSection, { backgroundColor: currentTheme.surface }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <View style={styles.filterRowInner}>
            <TouchableOpacity
              style={[styles.filterBtn, categoryFilter === 'tempo' && { backgroundColor: '#FF9800' }]}
              onPress={() => setCategoryFilter('tempo')}
            >
              <Text style={[styles.filterText, { color: categoryFilter === 'tempo' ? '#FFFFFF' : currentTheme.text }]}>🎵 速度記号</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, categoryFilter === 'dynamics' && { backgroundColor: '#2196F3' }]}
              onPress={() => setCategoryFilter('dynamics')}
            >
              <Text style={[styles.filterText, { color: categoryFilter === 'dynamics' ? '#FFFFFF' : currentTheme.text }]}>💪 強弱記号</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, categoryFilter === 'expression' && { backgroundColor: '#9C27B0' }]}
              onPress={() => setCategoryFilter('expression')}
            >
              <Text style={[styles.filterText, { color: categoryFilter === 'expression' ? '#FFFFFF' : currentTheme.text }]}>💡 発想標語</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, categoryFilter === 'articulation' && { backgroundColor: '#4CAF50' }]}
              onPress={() => setCategoryFilter('articulation')}
            >
              <Text style={[styles.filterText, { color: categoryFilter === 'articulation' ? '#FFFFFF' : currentTheme.text }]}>🎸 奏法記号</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, categoryFilter === 'accidental' && { backgroundColor: '#F44336' }]}
              onPress={() => setCategoryFilter('accidental')}
            >
              <Text style={[styles.filterText, { color: categoryFilter === 'accidental' ? '#FFFFFF' : currentTheme.text }]}>♯ 変化記号</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, categoryFilter === 'all' && { backgroundColor: currentTheme.secondary }]}
              onPress={() => setCategoryFilter('all')}
            >
              <Text style={[styles.filterText, { color: currentTheme.text }]}>すべて</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {activeTab === 'music' ? (
          filtered.map((t) => (
            <View key={t.id} style={[styles.card, { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary }]}> 
              <View style={styles.termHeader}>
                <View style={styles.termHeaderLeft}>
                  <Text style={[styles.term, { color: currentTheme.text }]}>{t.term} <Text style={styles.reading}>({t.reading})</Text></Text>
                  <View style={styles.badgeContainer}>
                    {t.is_user_added && (
                      <View style={[styles.userBadge, { backgroundColor: '#9C27B0' }]}>
                        <Text style={styles.userBadgeText}>ユーザー追加</Text>
                      </View>
                    )}
                    <View style={[
                      styles.categoryBadge, 
                      { 
                        backgroundColor: t.category === 'tempo' ? '#FF9800' : 
                                         t.category === 'dynamics' ? '#2196F3' : 
                                         t.category === 'expression' ? '#9C27B0' :
                                         t.category === 'articulation' ? '#4CAF50' :
                                         t.category === 'accidental' ? '#F44336' : '#757575'
                      }
                    ]}>
                      <Text style={styles.categoryBadgeText}>
                        {t.category === 'tempo' ? '速度' : 
                         t.category === 'dynamics' ? '強弱' : 
                         t.category === 'expression' ? '発想' :
                         t.category === 'articulation' ? '奏法' :
                         t.category === 'accidental' ? '変化' : 'その他'}
                      </Text>
                    </View>
                  </View>
                </View>
                {t.is_user_added && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => handleEditTerm(t)}
                      style={[styles.actionButton, { backgroundColor: currentTheme.primary + '20' }]}
                    >
                      <Edit2 size={16} color={currentTheme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteTerm(t)}
                      style={[styles.actionButton, { backgroundColor: '#F44336' + '20' }]}
                    >
                      <Trash2 size={16} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={[styles.meaning, { color: currentTheme.text }]}>{t.meaning_ja}</Text>
              {t.description_ja ? (
                <Text style={[styles.desc, { color: currentTheme.textSecondary }]}>{t.description_ja}</Text>
              ) : null}
            </View>
          ))
        ) : (
          filteredEnsemble.map((t) => (
            <View key={t.id} style={[styles.card, { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary }]}> 
              <View style={styles.termHeader}>
                <Text style={[styles.term, { color: currentTheme.text }]}>{t.term} <Text style={styles.reading}>({t.reading})</Text></Text>
              </View>
              <Text style={[styles.meaning, { color: currentTheme.text }]}>{t.meaning_ja}</Text>
              {t.description_ja && <Text style={[styles.desc, { color: currentTheme.textSecondary }]}>{t.description_ja}</Text>}
            </View>
          ))
        )}
        {((activeTab === 'music' && filtered.length === 0) || (activeTab === 'ensemble' && filteredEnsemble.length === 0)) && (
          <Text style={[styles.empty, { color: currentTheme.textSecondary }]}>一致する用語がありません</Text>
        )}
      </ScrollView>

      {/* 用語追加モーダル */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currentTheme.secondary }]}>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                setEditingTerm(null);
                setNewTerm({
                  term: '',
                  reading: '',
                  meaning_ja: '',
                  description_ja: '',
                  category: 'tempo'
                });
              }}
              style={styles.modalCloseButton}
            >
              <Text style={[styles.modalCloseText, { color: currentTheme.textSecondary }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              {editingTerm ? '用語を編集' : '用語を追加'}
            </Text>
            <TouchableOpacity
              onPress={addUserTerm}
              style={[styles.modalSaveButton, { backgroundColor: currentTheme.primary }]}
            >
              <CheckCircle2 size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>用語 *</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text,
                  borderColor: currentTheme.secondary
                }]}
                value={newTerm.term}
                onChangeText={(text) => setNewTerm(prev => ({ ...prev, term: text }))}
                placeholder="用語を入力"
                placeholderTextColor={currentTheme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>読み方</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text,
                  borderColor: currentTheme.secondary
                }]}
                value={newTerm.reading}
                onChangeText={(text) => setNewTerm(prev => ({ ...prev, reading: text }))}
                placeholder="読み方を入力"
                placeholderTextColor={currentTheme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>意味 *</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text,
                  borderColor: currentTheme.secondary
                }]}
                value={newTerm.meaning_ja}
                onChangeText={(text) => setNewTerm(prev => ({ ...prev, meaning_ja: text }))}
                placeholder="意味を入力"
                placeholderTextColor={currentTheme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>説明</Text>
              <TextInput
                style={[styles.formTextArea, { 
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text,
                  borderColor: currentTheme.secondary
                }]}
                value={newTerm.description_ja}
                onChangeText={(text) => setNewTerm(prev => ({ ...prev, description_ja: text }))}
                placeholder="詳細な説明を入力"
                placeholderTextColor={currentTheme.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>カテゴリ</Text>
              <View style={styles.categoryContainer}>
                {['tempo', 'dynamics', 'expression', 'articulation', 'accidental'].map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      newTerm.category === category && { 
                        backgroundColor: category === 'tempo' ? '#FF9800' :
                                         category === 'dynamics' ? '#2196F3' :
                                         category === 'expression' ? '#9C27B0' :
                                         category === 'articulation' ? '#4CAF50' : '#F44336'
                      }
                    ]}
                    onPress={() => setNewTerm(prev => ({ ...prev, category }))}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      { color: newTerm.category === category ? '#FFFFFF' : currentTheme.text }
                    ]}>
                      {category === 'tempo' ? '🎵 速度記号' :
                       category === 'dynamics' ? '💪 強弱記号' :
                       category === 'expression' ? '💡 発想標語' :
                       category === 'articulation' ? '🎸 奏法記号' : '♯ 変化記号'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  backButton: { padding: 8 },
  backText: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '600' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchRow: { padding: 16 },
  searchInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  filterRow: { paddingHorizontal: 16, marginBottom: 8 },
  filterRowInner: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0' },
  filterText: { fontSize: 13, fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: 16 },
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginVertical: 8 },
  termHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  termHeaderLeft: { flex: 1, marginRight: 8 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  term: { fontSize: 16, fontWeight: '700', flex: 1 },
  reading: { fontSize: 12, fontWeight: '400' },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  userBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  userBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  meaning: { fontSize: 14, marginTop: 8 },
  desc: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  empty: { textAlign: 'center', marginTop: 24 },
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
  modalSaveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
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
    textAlignVertical: 'top',
    minHeight: 100,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
});


