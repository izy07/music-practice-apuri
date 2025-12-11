import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, Trash2, Star, StarOff, Calendar, Clock, Music, ArrowLeft, Video, Search, X } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { supabase } from '@/lib/supabase';
import { listAllRecordings, deleteRecording } from '@/lib/database';
import { useSubscription } from '@/hooks/useSubscription';
import { canAccessFeature } from '@/lib/subscriptionService';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { safeGoBack } from '@/lib/navigationUtils';
import { createShadowStyle } from '@/lib/shadowStyles';

const { width } = Dimensions.get('window');

interface Recording {
  id: string;
  title: string | null;
  memo: string | null;
  file_path: string;
  duration_seconds: number;
  is_favorite: boolean;
  recorded_at: string;
  created_at: string;
}

type TimeFilter = 'all' | '1week' | '1month' | '3months' | '6months' | '1year';

export default function RecordingsLibraryScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { entitlement, loading: entitlementLoading } = useSubscription();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadRecordings();
  }, [entitlement]);

  // Audioオブジェクトのクリーンアップ（メモリリーク防止）
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = ''; // リソースを解放
        setAudioElement(null);
        logger.debug('Audioオブジェクトをクリーンアップ');
      }
    };
  }, [audioElement]);

  // 画面がフォーカスされた時にデータを再読み込み
  useFocusEffect(
    React.useCallback(() => {
      loadRecordings();
    }, [entitlement, selectedInstrument])
  );

  const loadRecordings = async () => {
    try {
      logger.debug('録音ライブラリ読み込み開始');
      logger.debug('録音機能アクセス可否:', canAccessFeature('recordings', entitlement));
      
      // ペイウォール: 未購読かつトライアル外の場合はデータをロードしない
      if (!canAccessFeature('recordings', entitlement)) {
        logger.debug('ペイウォール: 録音ライブラリアクセス拒否');
        setRecordings([]);
        setLoading(false);
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // コンテキストから楽器IDを取得（DBアクセス不要）
        const instrumentId = selectedInstrument || null;
        
        const { data, error } = await listAllRecordings(user.id, instrumentId);
        if (error) {
          ErrorHandler.handle(error, '録音データ読み込み', true);
          Alert.alert('エラー', '録音データの読み込みに失敗しました');
        } else {
          logger.debug('録音データ取得成功:', data?.length || 0, '件');
          // データを更新（0件の場合は空配列を設定）
          setRecordings(data || []);
        }
      } else {
        logger.debug('ユーザー情報なし');
      }
    } catch (error) {
      ErrorHandler.handle(error, '録音ライブラリ読み込み', true);
      Alert.alert('エラー', '録音データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecordings();
    setRefreshing(false);
  };

  const toggleFavorite = async (recordingId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('recordings')
        .update({ is_favorite: !currentFavorite })
        .eq('id', recordingId);

      if (error) {
        throw error;
      }

      // ローカル状態を更新
      setRecordings(prev => 
        prev.map(rec => 
          rec.id === recordingId 
            ? { ...rec, is_favorite: !currentFavorite }
            : rec
        )
      );
    } catch (error) {
      ErrorHandler.handle(error, 'お気に入り更新', true);
      Alert.alert('エラー', 'お気に入りの更新に失敗しました');
    }
  };

  const deleteRecordingItem = async (recordingId: string) => {
    logger.debug('削除ボタンがタップされました:', recordingId);
    
    Alert.alert(
      '録音削除',
      'この録音を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              logger.debug('削除処理開始:', recordingId);
              const { error } = await deleteRecording(recordingId);
              if (error) {
                ErrorHandler.handle(error, '録音削除', true);
                throw error;
              }

              // ローカル状態から削除
              setRecordings(prev => prev.filter(rec => rec.id !== recordingId));
              logger.debug('削除完了');
              Alert.alert('成功', '録音を削除しました');
            } catch (error) {
              ErrorHandler.handle(error, '録音削除', true);
              Alert.alert('エラー', '録音の削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  const isVideoUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  const playRecording = async (recording: Recording) => {
    // 動画URLの場合はブラウザで開く
    if (isVideoUrl(recording.file_path)) {
      if (typeof window !== 'undefined') {
        window.open(recording.file_path, '_blank');
      }
      return;
    }

    if (playingRecording === recording.id) {
      // 現在再生中の録音を停止
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setPlayingRecording(null);
      setAudioElement(null);
      return;
    }

    try {
      // 他の録音を停止
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      logger.debug('録音再生開始:', recording.file_path);

      // 新しい録音を再生
      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(recording.file_path);

      logger.debug('録音URL:', publicUrl);

      const audio = new Audio(publicUrl);
      audio.onended = () => {
        logger.debug('録音再生終了');
        setPlayingRecording(null);
        setAudioElement(null);
      };
      audio.onerror = (e) => {
        logger.error('録音再生エラー:', e);
        ErrorHandler.handle(e, '録音再生', false);
        Alert.alert('エラー', '録音の再生に失敗しました。ファイルが見つからない可能性があります。');
        setPlayingRecording(null);
        setAudioElement(null);
      };

      await audio.play();
      logger.debug('録音再生中');
      setPlayingRecording(recording.id);
      setAudioElement(audio);
    } catch (error) {
      logger.error('録音再生エラー:', error);
      ErrorHandler.handle(error, '録音再生', false);
      Alert.alert('エラー', '録音の再生に失敗しました');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 時間フィルターに基づいて録音をフィルタリング
  const getFilteredRecordings = (filter: TimeFilter = timeFilter) => {
    let filtered = recordings;

    // 時間フィルター適用
    if (filter !== 'all') {
      const now = new Date();
      let filterDate: Date;

      switch (filter) {
        case '1week':
          filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          filterDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '3months':
          filterDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case '6months':
          filterDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          break;
        case '1year':
          filterDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default:
          filterDate = new Date(0);
      }

      filtered = filtered.filter(recording => {
        const recordedDate = new Date(recording.recorded_at);
        return recordedDate >= filterDate;
      });
    }

    // 検索クエリ適用
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(recording => {
        const title = (recording.title || '').toLowerCase();
        const memo = (recording.memo || '').toLowerCase();
        return title.includes(query) || memo.includes(query);
      });
    }

    return filtered;
  };

  // 指定された期間の録音を表示（7日前から最新まで）
  const handleTimeFilter = (filter: TimeFilter) => {
    setTimeFilter(filter);
    // フィルター適用後、先頭にスクロール
    if (typeof window !== 'undefined' && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ 
          y: 0, 
          animated: true 
        });
      }, 100);
    }
  };

  const sortedRecordings = [...getFilteredRecordings()].sort((a, b) => {
    // 「全て」以外のフィルターの場合は、古い順（昇順）で表示（最新が下に来る）
    // 「全て」の場合は、お気に入りを優先、次に録音日時で降順（新しいものが上）
    if (timeFilter === 'all') {
      // お気に入りを優先、次に録音日時で降順
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
    } else {
      // 時間フィルター適用時は、録音日時で昇順（古いものが上、最新が下）
      return new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime();
    }
  });

  // エンタイトルメントの読み込み中はローディング画面を表示
  if (entitlementLoading || loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
        <InstrumentHeader />
        <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
          <Text style={[styles.loadingText, { color: currentTheme.text }]}>
            録音データを読み込み中...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 非購読時のゲート表示（エンタイトルメント読み込み完了後のみ表示）
  if (!entitlementLoading && !loading && !canAccessFeature('recordings', entitlement)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} > 
        <InstrumentHeader />
        <View style={styles.emptyContainer}>
          <Music size={64} color={currentTheme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>プレミアム限定</Text>
          <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary }]}>録音ライブラリはプレミアムでご利用いただけます</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: currentTheme.primary }]}
            onPress={() => router.push('/(tabs)/pricing-plans')}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>料金プランを見る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => safeGoBack('/(tabs)/settings', true)} // 強制的にsettings画面に戻る
              activeOpacity={0.7}
            >
              <ArrowLeft size={18} color={currentTheme.text} />
              <Text style={[styles.backButtonText, { color: currentTheme.text }]}>戻る</Text>
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: currentTheme.text }]}>
                録音ライブラリ
              </Text>
              <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
                {sortedRecordings.length}件の録音
                {(timeFilter !== 'all' || searchQuery.trim()) && ` (全${recordings.length}件)`}
              </Text>
            </View>
          </View>
        </View>

        {/* 検索バー */}
        {recordings.length > 0 && (
          <View style={[styles.searchContainer, { backgroundColor: currentTheme.surface }]}>
            <Search size={20} color={currentTheme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: currentTheme.text }]}
              placeholder="タイトルやメモで検索..."
              placeholderTextColor={currentTheme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              nativeID="recordings-search-input"
              accessibilityLabel="録音検索"
            />
            {searchQuery.trim() && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <X size={18} color={currentTheme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 聴き比べモード：時間フィルター */}
        {recordings.length > 0 && (
          <View style={[styles.timeFilterContainer, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.timeFilterTitle, { color: currentTheme.text }]}>
              聴き比べモード
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeFilterButtons}
            >
              <TouchableOpacity
                style={[
                  styles.timeFilterButton,
                  {
                    backgroundColor: timeFilter === 'all' ? currentTheme.primary : currentTheme.secondary,
                  }
                ]}
                onPress={() => setTimeFilter('all')}
              >
                <Text style={[
                  styles.timeFilterButtonText,
                  { color: timeFilter === 'all' ? currentTheme.surface : currentTheme.text }
                ]}>
                  全て
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeFilterButton,
                  {
                    backgroundColor: timeFilter === '1week' ? currentTheme.primary : currentTheme.secondary,
                  }
                ]}
                onPress={() => handleTimeFilter('1week')}
              >
                <Text style={[
                  styles.timeFilterButtonText,
                  { color: timeFilter === '1week' ? currentTheme.surface : currentTheme.text }
                ]}>
                  1週間前
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeFilterButton,
                  {
                    backgroundColor: timeFilter === '1month' ? currentTheme.primary : currentTheme.secondary,
                  }
                ]}
                onPress={() => handleTimeFilter('1month')}
              >
                <Text style={[
                  styles.timeFilterButtonText,
                  { color: timeFilter === '1month' ? currentTheme.surface : currentTheme.text }
                ]}>
                  1ヶ月前
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeFilterButton,
                  {
                    backgroundColor: timeFilter === '3months' ? currentTheme.primary : currentTheme.secondary,
                  }
                ]}
                onPress={() => handleTimeFilter('3months')}
              >
                <Text style={[
                  styles.timeFilterButtonText,
                  { color: timeFilter === '3months' ? currentTheme.surface : currentTheme.text }
                ]}>
                  3ヶ月前
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeFilterButton,
                  {
                    backgroundColor: timeFilter === '6months' ? currentTheme.primary : currentTheme.secondary,
                  }
                ]}
                onPress={() => handleTimeFilter('6months')}
              >
                <Text style={[
                  styles.timeFilterButtonText,
                  { color: timeFilter === '6months' ? currentTheme.surface : currentTheme.text }
                ]}>
                  半年前
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeFilterButton,
                  {
                    backgroundColor: timeFilter === '1year' ? currentTheme.primary : currentTheme.secondary,
                  }
                ]}
                onPress={() => handleTimeFilter('1year')}
              >
                <Text style={[
                  styles.timeFilterButtonText,
                  { color: timeFilter === '1year' ? currentTheme.surface : currentTheme.text }
                ]}>
                  1年前
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {recordings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Music size={64} color={currentTheme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
              録音がありません
            </Text>
            <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary }]}>
              録音機能を使って演奏を録音してみましょう
            </Text>
          </View>
        ) : (
          <View style={styles.recordingsContainer}>
            {sortedRecordings.length === 0 && timeFilter !== 'all' ? (
              <View style={styles.emptyContainer}>
                <Calendar size={64} color={currentTheme.textSecondary} />
                <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
                  該当する録音がありません
                </Text>
                <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary }]}>
                  選択した期間に録音はありません
                </Text>
              </View>
            ) : (
              sortedRecordings.map((recording) => (
                <View
                  key={recording.id}
                  style={[styles.recordingCard, { backgroundColor: currentTheme.surface }]}
                >
                  <View style={styles.recordingHeader}>
                    <View style={styles.recordingInfo}>
                      <View style={styles.titleContainer}>
                        {isVideoUrl(recording.file_path) && (
                          <Video
                            size={16}
                            color={currentTheme.primary}
                            style={styles.mediaIcon}
                          />
                        )}
                        <Text style={[styles.recordingTitle, { color: currentTheme.text }]}>
                          {recording.title || (isVideoUrl(recording.file_path) ? '無題の動画' : '無題の録音')}
                        </Text>
                      </View>
                      <View style={styles.recordingMeta}>
                        <View style={styles.metaItem}>
                          <Calendar size={14} color={currentTheme.textSecondary} />
                          <Text style={[styles.metaText, { color: currentTheme.textSecondary }]}>
                            {formatDate(recording.recorded_at)}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Clock size={14} color={currentTheme.textSecondary} />
                          <Text style={[styles.metaText, { color: currentTheme.textSecondary }]}>
                            {formatDuration(recording.duration_seconds)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.recordingActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => toggleFavorite(recording.id, recording.is_favorite)}
                      >
                        {recording.is_favorite ? (
                          <Star size={20} color="#FFD700" fill="#FFD700" />
                        ) : (
                          <StarOff size={20} color={currentTheme.textSecondary} />
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => playRecording(recording)}
                      >
                        {playingRecording === recording.id ? (
                          <Pause size={20} color={currentTheme.primary} />
                        ) : (
                          <Play size={20} color={currentTheme.primary} />
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: 'rgba(255, 68, 68, 0.1)' }]}
                        onPress={() => {
                          logger.debug('削除ボタンタッチイベント発生:', recording.id);
                          deleteRecordingItem(recording.id);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={20} color="#FF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {recording.memo && (
                    <Text style={[styles.recordingMemo, { color: currentTheme.textSecondary }]}>
                      {recording.memo}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColorは各SafeAreaViewでテーマ色を指定
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomBackButton: {
    marginTop: 16,
    marginBottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  bottomBackButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
    paddingHorizontal: 32,
  },
  timeFilterContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    elevation: 2,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  timeFilterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeFilterButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  timeFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeFilterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordingsContainer: {
    paddingBottom: 20,
  },
  recordingCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    elevation: 4,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordingInfo: {
    flex: 1,
    marginRight: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingLeft: 8,
  },
  mediaIcon: {
    marginRight: 6,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  recordingMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '400',
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingMemo: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
  },
  clearButton: {
    padding: 4,
  },
});


