import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Play, ExternalLink } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { createShadowStyle } from '@/lib/shadowStyles';

const { width } = Dimensions.get('window');

interface RepresentativeSong {
  id: string;
  instrument_id: string;
  title: string;
  composer: string;
  era?: string;
  genre?: string;
  difficulty_level?: number;
  youtube_url?: string;
  spotify_url?: string;
  description_ja?: string;
  description_en?: string;
  is_popular: boolean;
  display_order: number;
  famous_performer?: string;
  famous_video_url?: string;
  famous_note?: string;
}

interface Instrument {
  id: string;
  name: string;
  name_en: string;
}

export default function RepresentativeSongsScreen() {
  const router = useRouter();
  const { instrumentId } = useLocalSearchParams();
  const { currentTheme } = useInstrumentTheme();
  
  const [songs, setSongs] = useState<RepresentativeSong[]>([]);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>('');
  const [selectedSongDescription, setSelectedSongDescription] = useState<string>('');

  useEffect(() => {
    if (instrumentId) {
      loadSongs();
    }
  }, [instrumentId]);

  const loadSongs = async () => {
    try {
      setLoading(true);
      
      // 楽器情報を取得
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('*')
        .eq('id', instrumentId)
        .single();
      
      if (instrumentError) {
        console.error('楽器情報取得エラー:', instrumentError);
        return;
      }
      
      setInstrument(instrumentData);
      
      // 代表曲を取得
      const { data: songsData, error: songsError } = await supabase
        .from('representative_songs')
        .select('*')
        .eq('instrument_id', instrumentId)
        .order('display_order', { ascending: true });
      
      if (songsError) {
        // テーブルが存在しない場合（PGRST205エラー）は空配列を設定
        if (songsError.code === 'PGRST205' || songsError.code === 'PGRST116' || songsError.status === 404 || 
            songsError.message?.includes('Could not find the table') || 
            songsError.message?.includes('does not exist')) {
          // 開発環境でのみ警告を表示
          if (__DEV__) {
            console.warn('representative_songsテーブルが存在しません。空のリストを表示します。', songsError);
          }
          setSongs([]);
          return;
        }
        console.error('代表曲取得エラー:', songsError);
        Alert.alert('エラー', '代表曲の取得に失敗しました');
        return;
      }
      
      setSongs(songsData || []);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      Alert.alert('エラー', 'データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = async (song: RepresentativeSong) => {
    if (!song.youtube_url) {
      Alert.alert('エラー', 'この曲の再生URLが設定されていません');
      return;
    }
    
    setSelectedVideoUrl(song.youtube_url);
    setSelectedSongDescription(song.description_ja || '');
    setShowVideoModal(true);
  };


  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={currentTheme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>代表曲</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: currentTheme.text }]}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          console.log('戻るボタン押下');
          router.back();
        }} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {instrument?.name}の代表曲
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* スクロール可能なコンテンツ */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 楽器情報 */}
        {instrument && (
          <View style={[styles.instrumentInfo, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.instrumentName, { color: currentTheme.text }]}>
              {instrument.name}
            </Text>
            <Text style={[styles.instrumentNameEn, { color: currentTheme.textSecondary }]}>
              {instrument.name_en}
            </Text>
          </View>
        )}

        {/* 代表曲一覧 */}
        <View style={styles.content}>
          {songs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                代表曲が登録されていません
              </Text>
            </View>
          ) : (
            songs.map((song) => (
              <View key={song.id} style={[styles.songCard, { backgroundColor: currentTheme.surface }]} {...({} as any)}>
                <View style={styles.songHeader}>
                  <View style={styles.songTitleContainer}>
                    <Text style={[styles.songTitle, { color: currentTheme.text }]}>
                      {song.title}{song.famous_performer ? ` / ${song.famous_performer}` : ''}{song.famous_note ? `（${song.famous_note}）` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: currentTheme.primary }]}
                    onPress={() => handlePlaySong(song)}
                    activeOpacity={0.7}
                  >
                    <Play size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.composer, { color: currentTheme.textSecondary }]}>
                  作曲者: {song.composer}{song.era ? ` | 時代: ${song.era}` : ''}
                </Text>
                
                {song.genre && (
                  <View style={styles.songDetails}>
                    <Text style={[styles.detail, { color: currentTheme.textSecondary }]}>ジャンル: {song.genre}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* YouTube再生モーダル */}
      <Modal
        visible={showVideoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVideoModal(false)}
      >
        <View style={styles.videoModalOverlay}>
          <View style={[styles.videoModalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.videoModalHeader}>
              <Text style={[styles.videoModalTitle, { color: currentTheme.text }]}>
                YouTubeで再生
              </Text>
              <TouchableOpacity
                onPress={() => setShowVideoModal(false)}
                style={styles.closeButton}
              >
                <Text style={[styles.closeButtonText, { color: currentTheme.text }]}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.videoModalBody}>
              <Text style={[styles.videoModalText, { color: currentTheme.text }]}>
                {selectedSongDescription && `${selectedSongDescription} `}この曲をYouTubeで再生しますか？
              </Text>
              
              <View style={styles.videoModalButtons}>
                <TouchableOpacity
                  style={[styles.videoModalButton, { backgroundColor: currentTheme.secondary }]}
                  onPress={() => setShowVideoModal(false)}
                >
                  <Text style={[styles.videoModalButtonText, { color: currentTheme.text }]}>
                    キャンセル
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.videoModalButton, { backgroundColor: currentTheme.primary }]}
                  onPress={() => {
                    // YouTube URLを開く
                    if (selectedVideoUrl) {
                      window.open(selectedVideoUrl, '_blank');
                    }
                    setShowVideoModal(false);
                  }}
                >
                  <ExternalLink size={16} color="#FFFFFF" />
                  <Text style={[styles.videoModalButtonText, { color: '#FFFFFF' }]}>
                    YouTubeで開く
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContent: {
    flex: 1,
  },
  instrumentInfo: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  instrumentName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  instrumentNameEn: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  songCard: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    }),
  },
  songHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  songTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  songDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  detail: {
    fontSize: 12,
  },
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: width * 0.9,
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  videoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  videoModalBody: {
    padding: 20,
  },
  videoModalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  videoModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  videoModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  videoModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
