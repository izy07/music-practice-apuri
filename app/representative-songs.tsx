import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { createShadowStyle } from '@/lib/shadowStyles';
import { instrumentGuides } from '@/data/instrumentGuides';
import logger from '@/lib/logger';

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
  const [selectedSong, setSelectedSong] = useState<RepresentativeSong | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (instrumentId) {
      loadSongs();
    }
  }, [instrumentId]);

  const loadSongs = async () => {
    try {
      setLoading(true);
      
      logger.debug('[代表曲画面] 楽器ID:', instrumentId);
      
      // 楽器情報を取得
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('*')
        .eq('id', instrumentId)
        .single();
      
      if (instrumentError) {
        logger.error('[代表曲画面] 楽器情報取得エラー:', instrumentError);
        Alert.alert('エラー', `楽器情報の取得に失敗しました: ${instrumentError.message}`);
        return;
      }
      
      if (!instrumentData) {
        logger.error('[代表曲画面] 楽器データが見つかりません');
        Alert.alert('エラー', '楽器データが見つかりません');
        return;
      }
      
      logger.debug('[代表曲画面] 楽器情報取得成功:', instrumentData.name);
      setInstrument(instrumentData);
      
      // 代表曲を取得（エラーを静かに処理）
      let songsData: RepresentativeSong[] | null = null;
      try {
        const result = await supabase
          .from('representative_songs')
          .select('*')
          .eq('instrument_id', instrumentId)
          .order('display_order', { ascending: true });
        
        songsData = result.data;
        
        // テーブルが存在しない場合（404エラー）は正常なフォールバック動作として処理
        const isTableNotFound = result.error && (
          result.error.code === 'PGRST205' || 
          result.error.code === 'PGRST116' || 
          result.error.status === 404 || 
          result.error.message?.includes('Could not find the table') || 
          result.error.message?.includes('does not exist')
        );
        
        if (result.error && !isTableNotFound) {
          // テーブルが存在しない以外のエラーのみログ出力
          logger.error('[代表曲画面] 代表曲取得エラー:', {
            code: result.error.code,
            message: result.error.message,
            status: result.error.status,
          });
        }
      } catch (error) {
        // ネットワークエラーなど、予期しないエラーをキャッチ
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isTableNotFound = errorMessage.includes('404') || 
                                errorMessage.includes('Not Found') ||
                                errorMessage.includes('Could not find the table');
        
        if (!isTableNotFound) {
          logger.error('[代表曲画面] 代表曲取得で予期しないエラー:', error);
        }
      }
      
      // データベースから代表曲が取得できた場合はそれを使用
      if (songsData && songsData.length > 0) {
        logger.debug('[代表曲画面] データベースから代表曲を取得:', songsData.length, '曲');
        setSongs(songsData);
        return;
      }
      
      // データベースに代表曲がない場合はフォールバックデータを使用（静かに処理）
      if (instrumentData && instrumentData.name_en) {
        const fallbackSongs = getFallbackSongs(instrumentData.name_en);
        if (fallbackSongs.length > 0) {
          logger.debug('[代表曲画面] フォールバックデータを使用:', fallbackSongs.length, '曲');
          setSongs(fallbackSongs);
          return;
        }
      }
      
      // フォールバックデータもない場合は空配列
      logger.debug('[代表曲画面] 代表曲データなし');
      setSongs([]);
    } catch (error) {
      logger.error('[代表曲画面] データ読み込みエラー:', error);
      // エラー時はフォールバックデータを試す
      if (instrument && instrument.name_en) {
        const fallbackSongs = getFallbackSongs(instrument.name_en);
        if (fallbackSongs.length > 0) {
          logger.debug('[代表曲画面] エラー発生。フォールバックデータを使用');
          setSongs(fallbackSongs);
          return;
        }
      }
      // フォールバックデータもない場合は空配列
      setSongs([]);
      // ユーザーに表示するエラーは重大なエラーのみ
      if (error instanceof Error && !error.message.includes('Could not find the table')) {
        Alert.alert('エラー', `データの読み込みに失敗しました: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // instrumentGuides.tsから代表曲データを取得するフォールバック関数
  const getFallbackSongs = (nameEn: string): RepresentativeSong[] => {
    if (!nameEn) return [];
    
    // nameEnを小文字に変換してinstrumentGuidesのキーと一致させる
    const guideKey = nameEn.toLowerCase();
    const guide = instrumentGuides[guideKey as keyof typeof instrumentGuides];
    
    if (!guide || !guide.repertoire) return [];
    
    const songs: RepresentativeSong[] = [];
    let displayOrder = 1;
    
    // 初心者向け曲を追加
    if (guide.repertoire.beginner && Array.isArray(guide.repertoire.beginner)) {
      guide.repertoire.beginner.forEach((title: string) => {
        songs.push({
          id: `fallback-${guideKey}-beginner-${displayOrder}`,
          instrument_id: instrumentId || '',
          title: title,
          composer: '伝統曲',
          era: undefined,
          genre: undefined,
          difficulty_level: 1,
          youtube_url: undefined,
          spotify_url: undefined,
          description_ja: undefined,
          description_en: undefined,
          is_popular: false,
          display_order: displayOrder++,
          famous_performer: undefined,
          famous_video_url: undefined,
          famous_note: undefined,
        });
      });
    }
    
    // 中級者向け曲を追加
    if (guide.repertoire.intermediate && Array.isArray(guide.repertoire.intermediate)) {
      guide.repertoire.intermediate.forEach((title: string) => {
        songs.push({
          id: `fallback-${guideKey}-intermediate-${displayOrder}`,
          instrument_id: instrumentId || '',
          title: title,
          composer: '伝統曲',
          era: undefined,
          genre: undefined,
          difficulty_level: 3,
          youtube_url: undefined,
          spotify_url: undefined,
          description_ja: undefined,
          description_en: undefined,
          is_popular: true,
          display_order: displayOrder++,
          famous_performer: undefined,
          famous_video_url: undefined,
          famous_note: undefined,
        });
      });
    }
    
    // 上級者向け曲を追加
    if (guide.repertoire.advanced && Array.isArray(guide.repertoire.advanced)) {
      guide.repertoire.advanced.forEach((title: string) => {
        songs.push({
          id: `fallback-${guideKey}-advanced-${displayOrder}`,
          instrument_id: instrumentId || '',
          title: title,
          composer: '伝統曲',
          era: undefined,
          genre: undefined,
          difficulty_level: 5,
          youtube_url: undefined,
          spotify_url: undefined,
          description_ja: undefined,
          description_en: undefined,
          is_popular: true,
          display_order: displayOrder++,
          famous_performer: undefined,
          famous_video_url: undefined,
          famous_note: undefined,
        });
      });
    }
    
    return songs;
  };

  const handleSongPress = (song: RepresentativeSong) => {
    // 曲名を押したら、説明を表示するモーダルを開く
    setSelectedSong(song);
    setShowModal(true);
  };

  const handleOpenYouTube = async () => {
    if (!selectedSong || !selectedSong.youtube_url) {
      return;
    }
    
    try {
      const url = selectedSong.youtube_url;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        setShowModal(false);
        setSelectedSong(null);
      } else {
        Alert.alert('エラー', 'このURLを開くことができません');
      }
    } catch (error) {
      console.error('URLを開く際にエラーが発生しました:', error);
      Alert.alert('エラー', 'URLを開くことができませんでした');
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={currentTheme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>代表曲</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
          <Text style={[styles.loadingText, { color: currentTheme.text }]}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
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
              <TouchableOpacity
                key={song.id}
                style={[styles.songCard, { backgroundColor: currentTheme.surface }]}
                onPress={() => handleSongPress(song)}
                activeOpacity={0.7}
              >
                <View style={styles.songHeader}>
                  <View style={styles.songTitleContainer}>
                    <Text style={[styles.songTitle, { color: currentTheme.text }]}>
                      {song.title}{song.famous_performer ? ` / ${song.famous_performer}` : ''}{song.famous_note ? `（${song.famous_note}）` : ''}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.composer, { color: currentTheme.textSecondary }]}>
                  作曲者: {song.composer}{song.era ? ` | 時代: ${song.era}` : ''}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* 曲の説明モーダル */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowModal(false);
          setSelectedSong(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {selectedSong?.title}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setSelectedSong(null);
                }}
                style={styles.modalCloseButton}
              >
                <Text style={[styles.modalCloseText, { color: currentTheme.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {selectedSong?.description_ja ? (
                <Text style={[styles.modalDescription, { color: currentTheme.text }]}>
                  {selectedSong.description_ja}
                </Text>
              ) : (
                <Text style={[styles.modalDescription, { color: currentTheme.textSecondary }]}>
                  説明が登録されていません
                </Text>
              )}
              
              {selectedSong?.composer && (
                <Text style={[styles.modalComposer, { color: currentTheme.textSecondary }]}>
                  作曲者: {selectedSong.composer}
                  {selectedSong.era && ` | 時代: ${selectedSong.era}`}
                </Text>
              )}
            </ScrollView>
            
            {selectedSong?.youtube_url && (
              <View style={styles.modalFooter}>
                <Text style={[styles.modalQuestion, { color: currentTheme.text }]}>
                  YOUTUBEに飛びますか？
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel, { borderColor: currentTheme.secondary }]}
                    onPress={() => {
                      setShowModal(false);
                      setSelectedSong(null);
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: currentTheme.text }]}>いいえ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonYes, { backgroundColor: currentTheme.primary }]}
                    onPress={handleOpenYouTube}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>はい</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  composer: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    maxHeight: '80%',
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  modalBody: {
    padding: 20,
    maxHeight: 300,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  modalComposer: {
    fontSize: 14,
    marginTop: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  modalQuestion: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonYes: {
    // backgroundColorは動的に設定
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
