import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Dimensions, Linking, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink, Youtube, Plus, Trash2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { supabase } from '@/lib/supabase';
import { createShadowStyle } from '@/lib/shadowStyles';
import logger from '@/lib/logger';
import { practiceDataCache, PracticeDataCache } from '@/lib/cache/practiceDataCache';
import { safeGoBack } from '@/lib/navigationUtils';

const { width } = Dimensions.get('window');

interface RepresentativeSong {
  id: string;
  instrument_id: string;
  title: string;
  composer: string;
  era?: string;
  genre?: string;
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

interface UserFavoriteSong {
  id: string;
  user_id: string;
  instrument_id: string;
  title: string;
  composer: string;
  era?: string;
  genre?: string;
  youtube_url?: string;
  spotify_url?: string;
  description_ja?: string;
  description_en?: string;
  famous_performer?: string;
  famous_video_url?: string;
  famous_note?: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  is_user_favorite?: boolean; // お気に入り曲かどうかを識別するフラグ
}

export default function RepresentativeSongsScreen() {
  const router = useRouter();
  const { instrumentId: instrumentIdParam } = useLocalSearchParams();
  // useLocalSearchParams()の戻り値は string | string[] なので、文字列に変換
  const instrumentId = Array.isArray(instrumentIdParam) ? instrumentIdParam[0] : instrumentIdParam;
  const { currentTheme } = useInstrumentTheme();
  const { user, isAuthenticated } = useAuthAdvanced();
  
  const [songs, setSongs] = useState<(RepresentativeSong | UserFavoriteSong)[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<UserFavoriteSong[]>([]);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<RepresentativeSong | UserFavoriteSong | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSong, setNewSong] = useState({
    title: '',
    composer: '',
    era: '',
    genre: '',
    youtube_url: '',
    description_ja: '',
    famous_performer: '',
    famous_note: '',
  });

  useEffect(() => {
    if (instrumentId) {
      loadSongs();
    }
  }, [instrumentId]);

  // 画面がフォーカスされた時にデータを再読み込み（お気に入り曲が追加された場合に反映されるように）
  useFocusEffect(
    React.useCallback(() => {
      if (instrumentId) {
        // お気に入り曲を再読み込み（代表曲はキャッシュから取得されるため、お気に入り曲のみ再読み込み）
        if (isAuthenticated && user) {
          logger.debug('[代表曲画面] 画面フォーカス - お気に入り曲を再読み込み');
          loadFavoriteSongs();
        }
      }
    }, [instrumentId, isAuthenticated, user])
  );

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
      
      // キャッシュから代表曲データを取得を試行
      const cacheKey = PracticeDataCache.generateKey('representative_songs', { instrumentId });
      const cachedSongs = practiceDataCache.get<RepresentativeSong[]>(cacheKey);
      if (cachedSongs) {
        logger.debug('[代表曲画面] キャッシュから代表曲を取得:', cachedSongs.length, '曲');
        setSongs(cachedSongs);
        return;
      }
      
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
          result.error.message?.includes('does not exist') ||
          result.error.message?.includes('Not Found')
        );
        
        if (result.error && isTableNotFound) {
          // テーブルが存在しない場合は、フォールバックデータを使用するため、デバッグログのみ
          logger.debug('[代表曲画面] representative_songsテーブルが存在しません。フォールバックデータを使用します。');
        } else if (result.error && !isTableNotFound) {
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
        // キャッシュに保存
        practiceDataCache.set(cacheKey, songsData);
        setSongs(songsData);
      } else {
        // データベースに代表曲がない場合は空配列
        logger.debug('[代表曲画面] 代表曲データなし');
        setSongs([]);
      }
      
      // お気に入り曲を読み込む（認証済みの場合）
      if (isAuthenticated && user) {
        await loadFavoriteSongs();
      }
    } catch (error) {
      logger.error('[代表曲画面] データ読み込みエラー:', error);
      // エラー時は空配列
      setSongs([]);
      // ユーザーに表示するエラーは重大なエラーのみ
      if (error instanceof Error && !error.message.includes('Could not find the table')) {
        Alert.alert('エラー', `データの読み込みに失敗しました: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteSongs = async () => {
    if (!isAuthenticated || !user || !instrumentId) {
      logger.debug('[代表曲画面] お気に入り曲読み込みスキップ（認証なしまたは楽器IDなし）');
      return;
    }

    try {
      logger.debug('[代表曲画面] お気に入り曲読み込み開始', { userId: user.id, instrumentId });
      
      const { data, error } = await supabase
        .from('user_favorite_songs')
        .select('*')
        .eq('user_id', user.id)
        .eq('instrument_id', instrumentId)
        .order('display_order', { ascending: true });

      if (error) {
        // テーブルが存在しない場合はエラーを無視
        const isTableNotFound = error.code === 'PGRST205' || 
                                error.code === 'PGRST116' || 
                                error.status === 404 ||
                                error.message?.includes('Could not find the table') ||
                                error.message?.includes('does not exist');
        
        if (!isTableNotFound) {
          logger.error('[代表曲画面] お気に入り曲取得エラー:', error);
          Alert.alert('エラー', `お気に入り曲の読み込みに失敗しました: ${error.message}`);
        } else {
          logger.debug('[代表曲画面] user_favorite_songsテーブルが存在しません（マイグレーション未適用の可能性）');
        }
        setFavoriteSongs([]);
        return;
      }

      logger.debug('[代表曲画面] お気に入り曲取得成功:', (data || []).length, '曲');

      const favoriteSongsWithFlag = (data || []).map(song => ({
        ...song,
        is_user_favorite: true,
      }));

      setFavoriteSongs(favoriteSongsWithFlag);
      
      // 代表曲とお気に入り曲を結合
      // まず、代表曲のみを取得（お気に入り曲を除外）
      setSongs(prevSongs => {
        // 既存のsongsからお気に入り曲（is_user_favoriteがtrueのもの）を除外
        const representativeSongsOnly = prevSongs.filter(song => !('is_user_favorite' in song) || !song.is_user_favorite);
        // 代表曲と新しいお気に入り曲を結合
        const combinedSongs = [...representativeSongsOnly, ...favoriteSongsWithFlag];
        logger.debug('[代表曲画面] 代表曲とお気に入り曲を結合:', {
          representativeCount: representativeSongsOnly.length,
          favoriteCount: favoriteSongsWithFlag.length,
          totalCount: combinedSongs.length
        });
        return combinedSongs;
      });
    } catch (error) {
      logger.error('[代表曲画面] お気に入り曲読み込みエラー:', error);
      Alert.alert('エラー', `お気に入り曲の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      setFavoriteSongs([]);
    }
  };

  const handleAddFavoriteSong = async () => {
    if (!isAuthenticated || !user || !instrumentId) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    if (!newSong.title.trim()) {
      Alert.alert('エラー', '曲名を入力してください');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_favorite_songs')
        .insert({
          user_id: user.id,
          instrument_id: instrumentId,
          title: newSong.title.trim(),
          composer: newSong.composer.trim() || '',
          era: newSong.era.trim() || null,
          genre: newSong.genre.trim() || null,
          youtube_url: newSong.youtube_url.trim() || null,
          description_ja: newSong.description_ja.trim() || null,
          famous_performer: newSong.famous_performer.trim() || null,
          famous_note: newSong.famous_note.trim() || null,
          display_order: favoriteSongs.length,
        })
        .select()
        .single();

      if (error) {
        logger.error('[代表曲画面] お気に入り曲追加エラー:', error);
        
        // テーブルが存在しない場合のエラーメッセージを改善
        const isTableNotFound = error.code === 'PGRST205' || 
                                error.code === 'PGRST116' || 
                                error.status === 404 ||
                                error.message?.includes('Could not find the table') ||
                                error.message?.includes('does not exist');
        
        if (isTableNotFound) {
          Alert.alert(
            'エラー', 
            'お気に入り曲テーブルが存在しません。\n\nマイグレーションを適用してください:\n\n1. Supabaseダッシュボードにアクセス\n2. SQL Editorを開く\n3. supabase/migrations/20250110000000_create_user_favorite_songs.sql を実行'
          );
        } else {
          Alert.alert('エラー', `お気に入り曲の追加に失敗しました: ${error.message}`);
        }
        return;
      }

      logger.debug('[代表曲画面] お気に入り曲追加成功:', data);

      const newFavoriteSong: UserFavoriteSong = {
        ...data,
        is_user_favorite: true,
      };

      // 状態を更新（お気に入り曲リストと全体の曲リストの両方）
      setFavoriteSongs(prev => [...prev, newFavoriteSong]);
      setSongs(prev => [...prev, newFavoriteSong]);
      
      logger.debug('[代表曲画面] 状態更新完了:', {
        favoriteSongsCount: favoriteSongs.length + 1,
        totalSongsCount: songs.length + 1
      });
      
      // フォームをリセット
      setNewSong({
        title: '',
        composer: '',
        era: '',
        genre: '',
        youtube_url: '',
        description_ja: '',
        famous_performer: '',
        famous_note: '',
      });
      setShowAddModal(false);
      Alert.alert('成功', 'お気に入り曲を追加しました');
    } catch (error) {
      logger.error('[代表曲画面] お気に入り曲追加で予期しないエラー:', error);
      Alert.alert('エラー', 'お気に入り曲の追加に失敗しました');
    }
  };

  const handleDeleteFavoriteSong = async (songId: string) => {
    if (!isAuthenticated || !user) {
      return;
    }

    Alert.alert(
      '削除確認',
      'このお気に入り曲を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_favorite_songs')
                .delete()
                .eq('id', songId)
                .eq('user_id', user.id);

              if (error) {
                logger.error('[代表曲画面] お気に入り曲削除エラー:', error);
                Alert.alert('エラー', `お気に入り曲の削除に失敗しました: ${error.message}`);
                return;
              }

              setFavoriteSongs(favoriteSongs.filter(song => song.id !== songId));
              setSongs(songs.filter(song => song.id !== songId));
              Alert.alert('成功', 'お気に入り曲を削除しました');
            } catch (error) {
              logger.error('[代表曲画面] お気に入り曲削除で予期しないエラー:', error);
              Alert.alert('エラー', 'お気に入り曲の削除に失敗しました');
            }
          },
        },
      ]
    );
  };


  const handleSongPress = (song: RepresentativeSong | UserFavoriteSong) => {
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
          <TouchableOpacity onPress={() => safeGoBack(router, '/(tabs)/index', false)} style={styles.backButton}>
            <ArrowLeft size={24} color={currentTheme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>楽器が登場する曲一覧</Text>
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
        <TouchableOpacity onPress={() => safeGoBack(router, '/(tabs)/index', false)} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

        {/* お気に入り曲追加ボタン（ログイン済みの場合） */}
        {isAuthenticated && user && (
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>お気に入り曲を追加</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 楽器が登場する曲・お気に入り曲一覧 */}
        <View style={styles.content}>
          {songs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                楽器が登場する曲が登録されていません
              </Text>
            </View>
          ) : (
            songs.map((song) => {
              const isFavorite = 'is_user_favorite' in song && song.is_user_favorite;
              return (
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
                        {isFavorite && (
                          <Text style={[styles.favoriteLabel, { color: currentTheme.primary }]}>
                            {' '}★
                          </Text>
                        )}
                      </Text>
                    </View>
                    {isFavorite && isAuthenticated && user && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteFavoriteSong(song.id);
                        }}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color={currentTheme.error || '#F44336'} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <Text style={[styles.composer, { color: currentTheme.textSecondary }]}>
                    作曲者: {song.composer}{song.era ? ` | 時代: ${song.era}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })
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
            
            {/* YouTubeボタン（youtube_urlがある場合） */}
            {selectedSong?.youtube_url && (
              <View style={styles.modalFooter}>
                <Text style={[styles.youtubeLinkText, { color: currentTheme.textSecondary }]}>
                  ここにYOUTUBEリンクへ飛びますか？
                </Text>
                <TouchableOpacity
                  style={[styles.youtubeButton, { backgroundColor: '#FF0000' }]}
                  onPress={handleOpenYouTube}
                  activeOpacity={0.8}
                >
                  <Youtube size={20} color="#FFFFFF" />
                  <Text style={styles.youtubeButtonText}>YouTubeで見る</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* お気に入り曲追加モーダル */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowAddModal(false);
          setNewSong({
            title: '',
            composer: '',
            era: '',
            genre: '',
            youtube_url: '',
            description_ja: '',
            famous_performer: '',
            famous_note: '',
          });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                お気に入り曲を追加
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setNewSong({
                    title: '',
                    composer: '',
                    era: '',
                    genre: '',
                    youtube_url: '',
                    description_ja: '',
                    famous_performer: '',
                    famous_note: '',
                  });
                }}
                style={styles.modalCloseButton}
              >
                <Text style={[styles.modalCloseText, { color: currentTheme.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>曲名 *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.secondary, color: currentTheme.text, borderColor: currentTheme.primary }]}
                  value={newSong.title}
                  onChangeText={(text) => setNewSong({ ...newSong, title: text })}
                  placeholder="曲名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>作曲者</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.secondary, color: currentTheme.text, borderColor: currentTheme.primary }]}
                  value={newSong.composer}
                  onChangeText={(text) => setNewSong({ ...newSong, composer: text })}
                  placeholder="作曲者名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>時代</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.secondary, color: currentTheme.text, borderColor: currentTheme.primary }]}
                  value={newSong.era}
                  onChangeText={(text) => setNewSong({ ...newSong, era: text })}
                  placeholder="例: バロック、古典、ロマン派など"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>ジャンル</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.secondary, color: currentTheme.text, borderColor: currentTheme.primary }]}
                  value={newSong.genre}
                  onChangeText={(text) => setNewSong({ ...newSong, genre: text })}
                  placeholder="ジャンルを入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>YouTube URL</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.secondary, color: currentTheme.text, borderColor: currentTheme.primary }]}
                  value={newSong.youtube_url}
                  onChangeText={(text) => setNewSong({ ...newSong, youtube_url: text })}
                  placeholder="https://youtube.com/..."
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>著名な演奏者</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.secondary, color: currentTheme.text, borderColor: currentTheme.primary }]}
                  value={newSong.famous_performer}
                  onChangeText={(text) => setNewSong({ ...newSong, famous_performer: text })}
                  placeholder="演奏者名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>備考</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.secondary, color: currentTheme.text, borderColor: currentTheme.primary }]}
                  value={newSong.famous_note}
                  onChangeText={(text) => setNewSong({ ...newSong, famous_note: text })}
                  placeholder="備考を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>説明</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { backgroundColor: currentTheme.secondary, color: currentTheme.text, borderColor: currentTheme.primary }]}
                  value={newSong.description_ja}
                  onChangeText={(text) => setNewSong({ ...newSong, description_ja: text })}
                  placeholder="曲の説明を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: currentTheme.primary }]}
                onPress={handleAddFavoriteSong}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>追加</Text>
              </TouchableOpacity>
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
  youtubeLinkText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  youtubeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  favoriteLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
