import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { createShadowStyle } from '@/lib/shadowStyles';
import { instrumentGuides } from '@/data/instrumentGuides';

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
            console.warn('representative_songsテーブルが存在しません。フォールバックデータを使用します。', songsError);
          }
        } else {
          console.error('代表曲取得エラー:', songsError);
        }
      }
      
      // データベースから代表曲が取得できた場合はそれを使用
      if (songsData && songsData.length > 0) {
        setSongs(songsData);
        return;
      }
      
      // データベースに代表曲がない場合、instrumentGuides.tsからフォールバックデータを取得
      const fallbackSongs = getFallbackSongs(instrumentData?.name_en || '');
      if (fallbackSongs.length > 0) {
        setSongs(fallbackSongs);
        return;
      }
      
      // フォールバックデータもない場合は空配列
      setSongs([]);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      // エラー時もフォールバックデータを試す
      const fallbackSongs = getFallbackSongs(instrument?.name_en || '');
      if (fallbackSongs.length > 0) {
        setSongs(fallbackSongs);
      } else {
        Alert.alert('エラー', 'データの読み込みに失敗しました');
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

  const handleSongPress = async (song: RepresentativeSong) => {
    if (!song.youtube_url) {
      return;
    }
    
    Alert.alert(
      'YouTubeに移動',
      `${song.title}のYouTubeリンクに飛びます。URLに飛びますか？`,
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '開く',
          onPress: async () => {
            try {
              const url = song.youtube_url;
              const supported = await Linking.canOpenURL(url);
              if (supported) {
                await Linking.openURL(url);
              } else {
                Alert.alert('エラー', 'このURLを開くことができません');
              }
            } catch (error) {
              console.error('URLを開く際にエラーが発生しました:', error);
              Alert.alert('エラー', 'URLを開くことができませんでした');
            }
          },
        },
      ]
    );
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
                activeOpacity={song.youtube_url ? 0.7 : 1}
                disabled={!song.youtube_url}
              >
                <View style={styles.songHeader}>
                  <View style={styles.songTitleContainer}>
                    <Text style={[styles.songTitle, { color: currentTheme.text }]}>
                      {song.title}{song.famous_performer ? ` / ${song.famous_performer}` : ''}{song.famous_note ? `（${song.famous_note}）` : ''}
                    </Text>
                  </View>
                  {song.youtube_url && (
                    <ExternalLink size={20} color={currentTheme.primary} />
                  )}
                </View>
                
                <Text style={[styles.composer, { color: currentTheme.textSecondary }]}>
                  作曲者: {song.composer}{song.era ? ` | 時代: ${song.era}` : ''}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

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
});
