import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { ArrowLeft, BookOpen, Users } from 'lucide-react-native';

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

  useEffect(() => {
    const q = query.trim().toLowerCase();
    
    // 音楽用語のフィルタリング（空のリストなので常に空）
    setFiltered([]);
    
    // 合奏用語のフィルタリング（空のリストなので常に空）
    setFilteredEnsemble([]);
  }, [query, categoryFilter, selectedInstrument]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}> 
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}> 
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings' as any)} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>音楽用語辞典</Text>
        <View style={{ width: 40 }} />
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


