import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { getMusicTerms, getMusicTermCategories, MusicTerm } from '@/repositories/musicTermRepository';
import logger from '@/lib/logger';

export default function MusicDictionaryScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const [terms, setTerms] = useState<MusicTerm[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<MusicTerm | null>(null);

  // カテゴリ一覧を取得
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await getMusicTermCategories();
      if (error) {
        logger.error('カテゴリ取得エラー:', error);
        return;
      }
      if (data) {
        setCategories(data);
      }
    };
    loadCategories();
  }, []);

  // 用語一覧を取得
  useEffect(() => {
    const loadTerms = async () => {
      setLoading(true);
      const { data, error } = await getMusicTerms({
        category: selectedCategory || undefined,
        searchQuery: searchQuery || undefined,
      });
      if (error) {
        logger.error('用語取得エラー:', error);
        setTerms([]);
      } else {
        setTerms(data || []);
      }
      setLoading(false);
    };
    loadTerms();
  }, [selectedCategory, searchQuery]);

  // 検索クエリをクリア
  const clearSearch = () => {
    setSearchQuery('');
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
        <View style={{ width: 40 }} />
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
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={18} color={currentTheme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* カテゴリフィルタ */}
      {categories.length > 0 && (
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
                backgroundColor: selectedCategory === null ? currentTheme.primary : currentTheme.surface,
                borderColor: currentTheme.secondary
              }
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[
              styles.categoryButtonText,
              { color: selectedCategory === null ? currentTheme.surface : currentTheme.text }
            ]}>
              すべて
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                { 
                  backgroundColor: selectedCategory === category ? currentTheme.primary : currentTheme.surface,
                  borderColor: currentTheme.secondary
                }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryButtonText,
                { color: selectedCategory === category ? currentTheme.surface : currentTheme.text }
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 用語一覧 */}
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={currentTheme.primary} />
            <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>
              読み込み中...
            </Text>
          </View>
        ) : terms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
              {searchQuery ? '検索結果が見つかりませんでした' : '用語が登録されていません'}
            </Text>
          </View>
        ) : (
          terms.map((term) => (
            <TouchableOpacity
              key={term.id}
              style={[styles.termCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary }]}
              onPress={() => setSelectedTerm(term)}
            >
              <View style={styles.termHeader}>
                <Text style={[styles.termTitle, { color: currentTheme.text }]}>
                  {term.term_ja}
                </Text>
                {term.term_en && (
                  <Text style={[styles.termEn, { color: currentTheme.textSecondary }]}>
                    {term.term_en}
                  </Text>
                )}
              </View>
              {term.category && (
                <View style={[styles.categoryBadge, { backgroundColor: currentTheme.primary + '20' }]}>
                  <Text style={[styles.categoryBadgeText, { color: currentTheme.primary }]}>
                    {term.category}
                  </Text>
                </View>
              )}
              {term.description_ja && (
                <Text 
                  style={[styles.termDescription, { color: currentTheme.textSecondary }]}
                  numberOfLines={2}
                >
                  {term.description_ja}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 用語詳細モーダル（簡易版） */}
      {selectedTerm && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {selectedTerm.term_ja}
              </Text>
              <TouchableOpacity onPress={() => setSelectedTerm(null)}>
                <X size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedTerm.term_en && (
                <Text style={[styles.modalTermEn, { color: currentTheme.textSecondary }]}>
                  {selectedTerm.term_en}
                </Text>
              )}
              {selectedTerm.description_ja && (
                <Text style={[styles.modalDescription, { color: currentTheme.text }]}>
                  {selectedTerm.description_ja}
                </Text>
              )}
              {selectedTerm.example_usage && (
                <View style={styles.exampleContainer}>
                  <Text style={[styles.exampleLabel, { color: currentTheme.textSecondary }]}>
                    使用例:
                  </Text>
                  <Text style={[styles.exampleText, { color: currentTheme.text }]}>
                    {selectedTerm.example_usage}
                  </Text>
                </View>
              )}
              {selectedTerm.related_terms && selectedTerm.related_terms.length > 0 && (
                <View style={styles.relatedContainer}>
                  <Text style={[styles.relatedLabel, { color: currentTheme.textSecondary }]}>
                    関連用語:
                  </Text>
                  <Text style={[styles.relatedText, { color: currentTheme.text }]}>
                    {selectedTerm.related_terms.join(', ')}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
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
  termCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  termHeader: {
    marginBottom: 8,
  },
  termTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  termEn: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  termDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
    fontSize: 24,
    fontWeight: '600',
    flex: 1,
  },
  modalBody: {
    maxHeight: 400,
  },
  modalTermEn: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  exampleContainer: {
    marginBottom: 16,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  relatedContainer: {
    marginTop: 8,
  },
  relatedLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  relatedText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
