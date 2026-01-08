import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, X, Plus, Edit2, Trash2 } from 'lucide-react-native';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { getInstrumentKeyFromId, getInstrumentCategoryFromId, shouldIncludeSyncopation, getInstrumentCategory } from '@/lib/instrumentUtils';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { DEFAULT_MUSIC_TERMS, MUSIC_TERM_CATEGORIES, getTermsForInstrument, MusicTermCategory, MusicTermData } from '@/data/musicTermsData';
import { getMusicTerms, createMusicTerm, updateMusicTerm, deleteMusicTerm, MusicTerm } from '@/repositories/musicTermRepository';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export default function MusicDictionaryScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { user } = useAuthAdvanced();
  const [selectedCategory, setSelectedCategory] = useState<MusicTermCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<MusicTerm | null>(null);
  const [customTerms, setCustomTerms] = useState<MusicTerm[]>([]);
  const [loading, setLoading] = useState(false);

  // 楽器区分を取得
  const instrumentCategory = useMemo(() => {
    if (!selectedInstrument) return 'other';
    return getInstrumentCategoryFromId(selectedInstrument);
  }, [selectedInstrument]);

  // 楽器キーを取得（シンコペーション判定用）
  const instrumentKey = useMemo(() => {
    if (!selectedInstrument) return 'other';
    return getInstrumentKeyFromId(selectedInstrument);
  }, [selectedInstrument]);

  // カスタム用語を読み込み
  useEffect(() => {
    const loadCustomTerms = async () => {
      setLoading(true);
      const { data, error } = await getMusicTerms();
      if (error) {
        logger.error('カスタム用語読み込みエラー:', error);
        setCustomTerms([]);
      } else {
        setCustomTerms(data || []);
      }
      setLoading(false);
    };
    loadCustomTerms();
  }, []);

  // 表示用の用語リストを生成
  const displayTerms = useMemo(() => {
    const allTerms: Array<{ data: MusicTermData; isCustom: boolean; dbTerm?: MusicTerm }> = [];

    // デフォルト用語を追加
    if (selectedCategory === 'all') {
      // 全カテゴリから取得
      Object.keys(MUSIC_TERM_CATEGORIES).forEach((cat) => {
        const category = cat as MusicTermCategory;
        const terms = getTermsForInstrument(category, instrumentCategory);
        terms.forEach(term => {
          // シンコペーションが必要な用語のフィルタリング
          if (term.requiresSyncopation && !shouldIncludeSyncopation(instrumentKey)) {
            return;
          }
          allTerms.push({ data: term, isCustom: false });
        });
      });
    } else {
      const terms = getTermsForInstrument(selectedCategory, instrumentCategory);
      terms.forEach(term => {
        // シンコペーションが必要な用語のフィルタリング
        if (term.requiresSyncopation && !shouldIncludeSyncopation(instrumentKey)) {
          return;
        }
        allTerms.push({ data: term, isCustom: false });
      });
    }

    // カスタム用語を追加（カテゴリが一致する場合のみ）
    customTerms.forEach(term => {
      if (selectedCategory === 'all' || term.category === selectedCategory) {
        allTerms.push({
          data: {
            term_ja: term.term_ja,
            term_en: term.term_en || undefined,
            description_ja: term.description_ja || '',
            description_en: term.description_en || undefined,
          },
          isCustom: true,
          dbTerm: term,
        });
      }
    });

    // 検索クエリでフィルタリング
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return allTerms.filter(item =>
        item.data.term_ja.toLowerCase().includes(query) ||
        (item.data.term_en && item.data.term_en.toLowerCase().includes(query)) ||
        item.data.description_ja.toLowerCase().includes(query)
      );
    }

    return allTerms;
  }, [selectedCategory, instrumentCategory, instrumentKey, customTerms, searchQuery]);

  // 用語をカテゴリごとにグループ化
  const groupedTerms = useMemo(() => {
    const groups: Record<string, typeof displayTerms> = {};
    
    displayTerms.forEach(item => {
      let categoryKey = 'other';
      if (item.isCustom && item.dbTerm?.category) {
        categoryKey = item.dbTerm.category;
      } else {
        // デフォルト用語のカテゴリを判定
        Object.keys(MUSIC_TERM_CATEGORIES).forEach((cat) => {
          const category = cat as MusicTermCategory;
          const terms = getTermsForInstrument(category, instrumentCategory);
          if (terms.some(t => t.term_ja === item.data.term_ja)) {
            categoryKey = category;
          }
        });
      }
      
      if (!groups[categoryKey]) {
        groups[categoryKey] = [];
      }
      groups[categoryKey].push(item);
    });

    return groups;
  }, [displayTerms, instrumentCategory]);

  const handleAddTerm = () => {
    setEditingTerm(null);
    setShowAddModal(true);
  };

  const handleEditTerm = (term: MusicTerm) => {
    setEditingTerm(term);
    setShowAddModal(true);
  };

  const handleDeleteTerm = async (term: MusicTerm) => {
    Alert.alert(
      '削除確認',
      `「${term.term_ja}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteMusicTerm(term.id);
            if (error) {
              ErrorHandler.handle(error, '用語削除', true);
              Alert.alert('エラー', '用語の削除に失敗しました');
            } else {
              // カスタム用語を再読み込み
              const { data } = await getMusicTerms();
              setCustomTerms(data || []);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings' as any)} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>
          音楽用語辞典
        </Text>
        <TouchableOpacity onPress={handleAddTerm} style={styles.addButton}>
          <Plus size={24} color={currentTheme.primary} />
        </TouchableOpacity>
      </View>

      {/* 検索バー */}
      <View style={[styles.searchContainer, { backgroundColor: currentTheme.surface }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: currentTheme.background, borderColor: currentTheme.secondary }]}>
          <Search size={20} color={currentTheme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: currentTheme.text }]}
            placeholder="用語を検索..."
            placeholderTextColor={currentTheme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <X size={18} color={currentTheme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* カテゴリフィルタ */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryButton,
            { 
              backgroundColor: selectedCategory === 'all' ? currentTheme.primary : currentTheme.surface,
              borderColor: currentTheme.secondary
            }
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[
            styles.categoryButtonText,
            { color: selectedCategory === 'all' ? currentTheme.surface : currentTheme.text }
          ]}>
            すべて
          </Text>
        </TouchableOpacity>
        {Object.entries(MUSIC_TERM_CATEGORIES).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryButton,
              { 
                backgroundColor: selectedCategory === key ? currentTheme.primary : currentTheme.surface,
                borderColor: currentTheme.secondary
              }
            ]}
            onPress={() => setSelectedCategory(key as MusicTermCategory)}
          >
            <Text style={[
              styles.categoryButtonText,
              { color: selectedCategory === key ? currentTheme.surface : currentTheme.text }
            ]}>
              {value.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 用語一覧 */}
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={currentTheme.primary} />
            <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>
              読み込み中...
            </Text>
          </View>
        ) : selectedCategory === 'all' ? (
          // 全カテゴリ表示時はカテゴリごとにグループ化
          Object.entries(groupedTerms).map(([categoryKey, terms]) => {
            if (terms.length === 0) return null;
            const categoryInfo = MUSIC_TERM_CATEGORIES[categoryKey as MusicTermCategory];
            return (
              <View key={categoryKey} style={styles.categorySection}>
                <Text style={[styles.categorySectionTitle, { color: currentTheme.text }]}>
                  {categoryInfo?.label || categoryKey}
                </Text>
                {terms.map((item, index) => (
                  <TermCard
                    key={item.isCustom ? item.dbTerm?.id : `default-${categoryKey}-${index}`}
                    item={item}
                    currentTheme={currentTheme}
                    onEdit={item.isCustom && item.dbTerm ? () => handleEditTerm(item.dbTerm!) : undefined}
                    onDelete={item.isCustom && item.dbTerm ? () => handleDeleteTerm(item.dbTerm!) : undefined}
                  />
                ))}
              </View>
            );
          })
        ) : (
          // 特定カテゴリ表示時
          displayTerms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                {searchQuery ? '検索結果が見つかりませんでした' : '用語が登録されていません'}
              </Text>
            </View>
          ) : (
            displayTerms.map((item, index) => (
              <TermCard
                key={item.isCustom ? item.dbTerm?.id : `default-${selectedCategory}-${index}`}
                item={item}
                currentTheme={currentTheme}
                onEdit={item.isCustom && item.dbTerm ? () => handleEditTerm(item.dbTerm!) : undefined}
                onDelete={item.isCustom && item.dbTerm ? () => handleDeleteTerm(item.dbTerm!) : undefined}
              />
            ))
          )
        )}
      </ScrollView>

      {/* 追加・編集モーダル */}
      <AddEditTermModal
        visible={showAddModal}
        term={editingTerm}
        currentTheme={currentTheme}
        onClose={() => {
          setShowAddModal(false);
          setEditingTerm(null);
        }}
        onSave={async () => {
          // カスタム用語を再読み込み
          const { data } = await getMusicTerms();
          setCustomTerms(data || []);
          setShowAddModal(false);
          setEditingTerm(null);
        }}
      />
    </SafeAreaView>
  );
}

// 用語カードコンポーネント
function TermCard({
  item,
  currentTheme,
  onEdit,
  onDelete,
}: {
  item: { data: MusicTermData; isCustom: boolean; dbTerm?: MusicTerm };
  currentTheme: any;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={[styles.termCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary }]}>
      <View style={styles.termHeader}>
        <View style={styles.termTitleContainer}>
          <Text style={[styles.termTitle, { color: currentTheme.text }]}>
            {item.data.term_ja}
          </Text>
          {item.data.symbol && (
            <Text style={[styles.termSymbol, { color: currentTheme.primary }]}>
              {item.data.symbol}
            </Text>
          )}
        </View>
        {item.data.term_en && (
          <Text style={[styles.termEn, { color: currentTheme.textSecondary }]}>
            {item.data.term_en}
          </Text>
        )}
      </View>
      <Text style={[styles.termDescription, { color: currentTheme.textSecondary }]}>
        {item.data.description_ja}
      </Text>
      {item.isCustom && (onEdit || onDelete) && (
        <View style={styles.termActions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <Edit2 size={16} color={currentTheme.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <Trash2 size={16} color="#FF4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// 追加・編集モーダルコンポーネント
function AddEditTermModal({
  visible,
  term,
  currentTheme,
  onClose,
  onSave,
}: {
  visible: boolean;
  term: MusicTerm | null;
  currentTheme: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const [termJa, setTermJa] = useState('');
  const [termEn, setTermEn] = useState('');
  const [category, setCategory] = useState<MusicTermCategory>('dynamics');
  const [descriptionJa, setDescriptionJa] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (term) {
      setTermJa(term.term_ja);
      setTermEn(term.term_en || '');
      setCategory((term.category as MusicTermCategory) || 'dynamics');
      setDescriptionJa(term.description_ja || '');
      setDescriptionEn(term.description_en || '');
    } else {
      setTermJa('');
      setTermEn('');
      setCategory('dynamics');
      setDescriptionJa('');
      setDescriptionEn('');
    }
  }, [term, visible]);

  const handleSave = async () => {
    if (!termJa.trim() || !descriptionJa.trim()) {
      Alert.alert('エラー', '用語名と説明を入力してください');
      return;
    }

    setSaving(true);
    try {
      if (term) {
        // 更新
        const { error } = await updateMusicTerm(term.id, {
          term_ja: termJa.trim(),
          term_en: termEn.trim() || null,
          category: category,
          description_ja: descriptionJa.trim(),
          description_en: descriptionEn.trim() || null,
        });
        if (error) {
          ErrorHandler.handle(error, '用語更新', true);
          Alert.alert('エラー', '用語の更新に失敗しました');
        } else {
          onSave();
        }
      } else {
        // 新規追加
        const { error } = await createMusicTerm({
          term_ja: termJa.trim(),
          term_en: termEn.trim() || null,
          category: category,
          description_ja: descriptionJa.trim(),
          description_en: descriptionEn.trim() || null,
        });
        if (error) {
          ErrorHandler.handle(error, '用語追加', true);
          Alert.alert('エラー', '用語の追加に失敗しました');
        } else {
          onSave();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              {term ? '用語を編集' : '用語を追加'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={currentTheme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>用語名（日本語）*</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: currentTheme.background, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                value={termJa}
                onChangeText={setTermJa}
                placeholder="例: p (piano)"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>用語名（英語）</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: currentTheme.background, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                value={termEn}
                onChangeText={setTermEn}
                placeholder="例: piano"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>カテゴリ*</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {Object.entries(MUSIC_TERM_CATEGORIES).map(([key, value]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryPickerButton,
                      {
                        backgroundColor: category === key ? currentTheme.primary : currentTheme.background,
                        borderColor: currentTheme.secondary,
                      }
                    ]}
                    onPress={() => setCategory(key as MusicTermCategory)}
                  >
                    <Text style={[
                      styles.categoryPickerButtonText,
                      { color: category === key ? currentTheme.surface : currentTheme.text }
                    ]}>
                      {value.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>説明（日本語）*</Text>
              <TextInput
                style={[styles.formTextArea, { backgroundColor: currentTheme.background, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                value={descriptionJa}
                onChangeText={setDescriptionJa}
                placeholder="例: 弱く"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.text }]}>説明（英語）</Text>
              <TextInput
                style={[styles.formTextArea, { backgroundColor: currentTheme.background, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                value={descriptionEn}
                onChangeText={setDescriptionEn}
                placeholder="例: Softly"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: currentTheme.secondary }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: currentTheme.text }]}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: currentTheme.primary, opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                {saving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  categoryContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
  },
  categoryContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 24,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
  },
  termCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  termHeader: {
    marginBottom: 8,
  },
  termTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  termTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  termSymbol: {
    fontSize: 16,
    fontWeight: '500',
  },
  termEn: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  termDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  termActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    marginTop: 8,
  },
  categoryPickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryPickerButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
