import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Dimensions, Linking, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink, Youtube, Plus, Trash2, Edit2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { supabase } from '@/lib/supabase';
import { createShadowStyle } from '@/lib/shadowStyles';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { safeGoBack } from '@/lib/navigationUtils';
import { getRepresentativeSongsByInstrumentId, StaticRepresentativeSong } from '@/data/staticRepresentativeSongs';

const { width } = Dimensions.get('window');

interface RepresentativeSong {
  id: string;
  instrument_id: string;
  title: string;
  composer: string;
  era?: string | null;
  genre?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  description_ja?: string | null;
  description_en?: string | null;
  is_popular: boolean;
  display_order: number;
  famous_performer?: string | null;
  famous_video_url?: string | null;
  famous_note?: string | null;
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
  
  const [songs, setSongs] = useState<(RepresentativeSong | UserFavoriteSong | StaticRepresentativeSong)[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<UserFavoriteSong[]>([]);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<RepresentativeSong | UserFavoriteSong | StaticRepresentativeSong | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSong, setEditingSong] = useState<UserFavoriteSong | null>(null);
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
      if (instrumentId && !showModal) {
        // モーダルが開いている時は再読み込みしない（不要な再読み込みを防ぐ）
        // お気に入り曲を再読み込み（代表曲は静的データのため、お気に入り曲のみ再読み込み）
        if (isAuthenticated && user) {
          logger.debug('[代表曲画面] 画面フォーカス - お気に入り曲を再読み込み');
          loadFavoriteSongs();
        }
      }
    }, [instrumentId, isAuthenticated, user, showModal])
  );

  const loadSongs = async () => {
    try {
      setLoading(true);
      
      logger.debug('[代表曲画面] 楽器ID:', instrumentId);
      logger.debug('[代表曲画面] instrumentIdの型:', typeof instrumentId);
      logger.debug('[代表曲画面] instrumentIdの値:', JSON.stringify(instrumentId));
      
      if (!instrumentId) {
        logger.error('[代表曲画面] 楽器IDが未設定です');
        Alert.alert('エラー', '楽器IDが指定されていません');
        setLoading(false);
        return;
      }
      
      // 楽器情報を取得
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('*')
        .eq('id', instrumentId)
        .single();
      
      if (instrumentError) {
        logger.error('[代表曲画面] 楽器情報取得エラー:', instrumentError);
        logger.error('[代表曲画面] エラー詳細:', {
          code: instrumentError.code,
          message: instrumentError.message,
          details: instrumentError.details,
          hint: instrumentError.hint
        });
        ErrorHandler.handle(instrumentError, '楽器情報取得', true);
        setLoading(false);
        return;
      }
      
      if (!instrumentData) {
        logger.error('[代表曲画面] 楽器データが見つかりません');
        ErrorHandler.handle(new Error('楽器データが見つかりません'), '楽器情報取得', true);
        setLoading(false);
        return;
      }
      
      logger.debug('[代表曲画面] 楽器情報取得成功:', instrumentData.name);
      logger.debug('[代表曲画面] 楽器ID（確認）:', instrumentData.id);
      setInstrument(instrumentData);
      
      // 静的データから代表曲を取得（データベースリクエスト不要）
      const songsData = getRepresentativeSongsByInstrumentId(instrumentId);
      logger.debug('[代表曲画面] 静的データ取得結果:', {
        instrumentId,
        songsCount: songsData?.length || 0,
        hasData: !!songsData && songsData.length > 0
      });
      
      if (songsData && songsData.length > 0) {
        logger.debug('[代表曲画面] 静的データから代表曲を取得:', songsData.length, '曲');
        logger.debug('[代表曲画面] 静的データの最初の曲:', songsData[0]?.title);
        setSongs(songsData);
      } else {
        // 静的データが空の場合は、データベースから直接取得（フォールバック）
        logger.debug('[代表曲画面] 静的データが空のため、データベースから代表曲を取得します');
        logger.debug('[代表曲画面] データベースクエリ実行:', {
          table: 'representative_songs',
          instrument_id: instrumentId
        });
        
        const { data: dbSongsData, error: dbSongsError } = await supabase
          .from('representative_songs')
          .select('*')
          .eq('instrument_id', instrumentId)
          .order('display_order', { ascending: true });
        
        logger.debug('[代表曲画面] データベースクエリ結果:', {
          hasError: !!dbSongsError,
          errorCode: dbSongsError?.code,
          errorMessage: dbSongsError?.message,
          dataCount: dbSongsData?.length || 0,
          data: dbSongsData ? dbSongsData.map((s: any) => ({ id: s.id, title: s.title, instrument_id: s.instrument_id })) : null
        });
        
        if (dbSongsError) {
          // テーブルが存在しない場合はエラーを無視
          const isTableNotFound = dbSongsError.code === 'PGRST205' || 
                                  dbSongsError.code === 'PGRST116' || 
                                  dbSongsError.status === 404 ||
                                  dbSongsError.message?.includes('Could not find the table') ||
                                  dbSongsError.message?.includes('does not exist');
          
          if (!isTableNotFound) {
            logger.error('[代表曲画面] データベースから代表曲取得エラー:', dbSongsError);
            logger.error('[代表曲画面] エラー詳細:', {
              code: dbSongsError.code,
              message: dbSongsError.message,
              details: dbSongsError.details,
              hint: dbSongsError.hint
            });
          } else {
            logger.debug('[代表曲画面] representative_songsテーブルが存在しません');
          }
          setSongs([]);
        } else if (dbSongsData && dbSongsData.length > 0) {
          logger.debug('[代表曲画面] データベースから代表曲を取得:', dbSongsData.length, '曲');
          logger.debug('[代表曲画面] 取得した曲のタイトル:', dbSongsData.map((s: any) => s.title));
          // データベースから取得したデータをStaticRepresentativeSong形式に変換
          const convertedSongs: StaticRepresentativeSong[] = dbSongsData.map((song: any) => ({
            id: song.id,
            instrument_id: song.instrument_id,
            title: song.title,
            composer: song.composer,
            era: song.era,
            genre: song.genre,
            difficulty_level: song.difficulty_level,
            youtube_url: song.youtube_url,
            spotify_url: song.spotify_url,
            description_ja: song.description_ja,
            description_en: song.description_en,
            is_popular: song.is_popular,
            display_order: song.display_order,
            famous_performer: song.famous_performer,
            famous_video_url: song.famous_video_url,
            famous_note: song.famous_note,
          }));
          logger.debug('[代表曲画面] 変換後の曲数:', convertedSongs.length);
          setSongs(convertedSongs);
        } else {
          logger.debug('[代表曲画面] 代表曲データなし（データベースにもデータがありません）');
          logger.debug('[代表曲画面] デバッグ情報:', {
            instrumentId,
            queryResult: dbSongsData,
            queryResultLength: dbSongsData?.length || 0
          });
          setSongs([]);
        }
      }
      
      // お気に入り曲を読み込む（認証済みの場合）
      if (isAuthenticated && user) {
        await loadFavoriteSongs();
      }
    } catch (error) {
      logger.error('[代表曲画面] データ読み込みエラー:', error);
      // エラー時は空配列
      setSongs([]);
      if (error instanceof Error) {
        ErrorHandler.handle(error, '代表曲データ読み込み', true);
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
          ErrorHandler.handle(error, 'お気に入り曲読み込み', true);
        } else {
          logger.debug('[代表曲画面] user_favorite_songsテーブルが存在しません（マイグレーション未適用の可能性）');
        }
        setFavoriteSongs([]);
        return;
      }

      logger.debug('[代表曲画面] お気に入り曲取得成功:', (data || []).length, '曲');

      const favoriteSongsWithFlag = (data || []).map((song: UserFavoriteSong) => ({
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
      ErrorHandler.handle(error, 'お気に入り曲読み込み', true);
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
          ErrorHandler.handle(error, 'お気に入り曲追加', true);
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
    } catch (error) {
      logger.error('[代表曲画面] お気に入り曲追加で予期しないエラー:', error);
      ErrorHandler.handle(error, 'お気に入り曲追加', true);
    }
  };

  const handleEditFavoriteSong = (song: UserFavoriteSong) => {
    setEditingSong(song);
    setNewSong({
      title: song.title || '',
      composer: song.composer || '',
      era: song.era || '',
      genre: song.genre || '',
      youtube_url: song.youtube_url || '',
      description_ja: song.description_ja || '',
      famous_performer: song.famous_performer || '',
      famous_note: song.famous_note || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateFavoriteSong = async () => {
    if (!isAuthenticated || !user || !instrumentId || !editingSong) {
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
        .update({
          title: newSong.title.trim(),
          composer: newSong.composer.trim() || '',
          era: newSong.era.trim() || null,
          genre: newSong.genre.trim() || null,
          youtube_url: newSong.youtube_url.trim() || null,
          description_ja: newSong.description_ja.trim() || null,
          famous_performer: newSong.famous_performer.trim() || null,
          famous_note: newSong.famous_note.trim() || null,
        })
        .eq('id', editingSong.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('[代表曲画面] お気に入り曲更新エラー:', error);
        ErrorHandler.handle(error, 'お気に入り曲更新', true);
        return;
      }

      logger.debug('[代表曲画面] お気に入り曲更新成功:', data);

      const updatedFavoriteSong: UserFavoriteSong = {
        ...data,
        is_user_favorite: true,
      };

      // 状態を更新
      setFavoriteSongs(prev => prev.map(song => 
        song.id === editingSong.id ? updatedFavoriteSong : song
      ));
      setSongs(prev => prev.map(song => 
        song.id === editingSong.id ? updatedFavoriteSong : song
      ));
      
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
      setEditingSong(null);
      setShowEditModal(false);
    } catch (error) {
      logger.error('[代表曲画面] お気に入り曲更新で予期しないエラー:', error);
      ErrorHandler.handle(error, 'お気に入り曲更新', true);
    }
  };

    const handleDeleteFavoriteSong = async (songId: string) => {
    logger.debug('[代表曲画面] handleDeleteFavoriteSong関数が呼ばれました:', { songId, isAuthenticated, hasUser: !!user });
    
    if (!isAuthenticated || !user) {
      logger.warn('[代表曲画面] 認証されていません');
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    // Web環境ではwindow.confirmを使用（Alert.alertが正しく動作しない場合があるため）
    if (Platform.OS === 'web') {
      const confirmed = (window as any).confirm('このお気に入り曲を削除しますか？');
      if (!confirmed) {
        logger.debug('[代表曲画面] 削除がキャンセルされました');
        return;
      }
      
      try {
        logger.debug('[代表曲画面] お気に入り曲削除開始:', { songId, userId: user.id });
        
        const { error, data } = await supabase
          .from('user_favorite_songs')
          .delete()
          .eq('id', songId)
          .eq('user_id', user.id)
          .select();

        if (error) {
          logger.error('[代表曲画面] お気に入り曲削除エラー:', error);
          logger.error('[代表曲画面] エラー詳細:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          (window as any).alert(`お気に入り曲の削除に失敗しました: ${error.message}`);
          return;
        }

        logger.debug('[代表曲画面] お気に入り曲削除成功:', { songId, deletedData: data });

        // 即座に状態を更新（UIの応答性を向上）
        setSongs(prevSongs => prevSongs.filter(song => song.id !== songId));
        setFavoriteSongs(prevFavorites => prevFavorites.filter(song => song.id !== songId));
        
        logger.debug('[代表曲画面] 状態を即座に更新しました');

        // データベースの反映を待ってから再読み込み（確実に反映させるため）
        setTimeout(async () => {
          try {
            await loadFavoriteSongs();
            logger.debug('[代表曲画面] お気に入り曲を再読み込みしました');
          } catch (reloadError) {
            logger.error('[代表曲画面] お気に入り曲再読み込みエラー:', reloadError);
            // 再読み込みエラーは無視（既に状態は更新済み）
          }
        }, 300);
      } catch (error) {
        logger.error('[代表曲画面] お気に入り曲削除で予期しないエラー:', error);
        (window as any).alert('お気に入り曲の削除に失敗しました');
      }
      return;
    }

    // モバイル環境ではAlert.alertを使用
    Alert.alert(
      '削除確認',
      'このお気に入り曲を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel', onPress: () => logger.debug('[代表曲画面] 削除がキャンセルされました') },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              logger.debug('[代表曲画面] お気に入り曲削除開始:', { songId, userId: user.id });
              
              const { error, data } = await supabase
                .from('user_favorite_songs')
                .delete()
                .eq('id', songId)
                .eq('user_id', user.id)
                .select();

              if (error) {
                logger.error('[代表曲画面] お気に入り曲削除エラー:', error);
                logger.error('[代表曲画面] エラー詳細:', {
                  code: error.code,
                  message: error.message,
                  details: error.details,
                  hint: error.hint
                });
                ErrorHandler.handle(error, 'お気に入り曲削除', true);
                return;
              }

              logger.debug('[代表曲画面] お気に入り曲削除成功:', { songId, deletedData: data });

              // 即座に状態を更新（UIの応答性を向上）
              setSongs(prevSongs => prevSongs.filter(song => song.id !== songId));
              setFavoriteSongs(prevFavorites => prevFavorites.filter(song => song.id !== songId));
              
              logger.debug('[代表曲画面] 状態を即座に更新しました');

              // データベースの反映を待ってから再読み込み（確実に反映させるため）
              setTimeout(async () => {
                try {
                  await loadFavoriteSongs();
                  logger.debug('[代表曲画面] お気に入り曲を再読み込みしました');
                } catch (reloadError) {
                  logger.error('[代表曲画面] お気に入り曲再読み込みエラー:', reloadError);
                  // 再読み込みエラーは無視（既に状態は更新済み）
                }
              }, 300);
            } catch (error) {
              logger.error('[代表曲画面] お気に入り曲削除で予期しないエラー:', error);
              ErrorHandler.handle(error, 'お気に入り曲削除', true);
            }
          },
        },
      ]
    );
  };


  const handleSongPress = (song: RepresentativeSong | UserFavoriteSong | StaticRepresentativeSong) => {
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
        // モーダルを閉じる際は、selectedSongをnullにする前にモーダルを閉じる
        setShowModal(false);
        // モーダルのアニメーションが完了してからselectedSongをクリア（不要な再レンダリングを防ぐ）
        setTimeout(() => {
          setSelectedSong(null);
        }, 300);
      } else {
        Alert.alert('エラー', 'このURLを開くことができません');
      }
    } catch (error) {
      console.error('URLを開く際にエラーが発生しました:', error);
      ErrorHandler.handle(error, 'URLを開く', true);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeGoBack(router, '/(tabs)/index', false)} style={styles.backButton}>
            <ArrowLeft size={24} color={currentTheme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
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
          {instrument?.name}による演奏
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
              <Plus size={24} color="#FFFFFF" />
              <Text style={styles.addButtonText}>お気に入り曲を追加</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 楽器による名演奏・お気に入り曲一覧 */}
        <View style={styles.content}>
          {songs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>
                名演奏が登録されていません
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
                  delayPressIn={0}
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
                      <View style={styles.actionButtonsContainer} pointerEvents="box-none">
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            logger.debug('[代表曲画面] 編集ボタンが押されました:', { songId: song.id, songTitle: song.title });
                            handleEditFavoriteSong(song as UserFavoriteSong);
                          }}
                          style={styles.editButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.7}
                        >
                          <Edit2 size={18} color={currentTheme.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={async (e) => {
                            try {
                              e.stopPropagation();
                              e.preventDefault();
                              logger.debug('[代表曲画面] 削除ボタンが押されました:', { songId: song.id, songTitle: song.title });
                              if (song.id) {
                                logger.debug('[代表曲画面] handleDeleteFavoriteSongを呼び出します:', song.id);
                                await handleDeleteFavoriteSong(song.id);
                                logger.debug('[代表曲画面] handleDeleteFavoriteSongの呼び出しが完了しました');
                              } else {
                                logger.error('[代表曲画面] 削除ボタン: song.idが存在しません', song);
                                Alert.alert('エラー', '曲IDが見つかりません');
                              }
                            } catch (error) {
                              logger.error('[代表曲画面] 削除ボタンのonPressでエラーが発生しました:', error);
                                ErrorHandler.handle(error, 'お気に入り曲削除', true);
                            }
                          }}
                          style={styles.deleteButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={18} color='#F44336' />
                        </TouchableOpacity>
                      </View>
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
          // モーダルを閉じる際は、selectedSongをnullにする前にモーダルを閉じる
          setShowModal(false);
          // モーダルのアニメーションが完了してからselectedSongをクリア（不要な再レンダリングを防ぐ）
          setTimeout(() => {
            setSelectedSong(null);
          }, 300);
        }}
      >
        {selectedSong && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                  {selectedSong.title}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    // モーダルを閉じる際は、selectedSongをnullにする前にモーダルを閉じる
                    setShowModal(false);
                    // モーダルのアニメーションが完了してからselectedSongをクリア（不要な再レンダリングを防ぐ）
                    setTimeout(() => {
                      setSelectedSong(null);
                    }, 300);
                  }}
                  style={styles.modalCloseButton}
                >
                  <Text style={[styles.modalCloseText, { color: currentTheme.textSecondary }]}>×</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                {selectedSong.description_ja ? (
                  <Text style={[styles.modalDescription, { color: currentTheme.text }]}>
                    {selectedSong.description_ja}
                  </Text>
                ) : (
                  <Text style={[styles.modalDescription, { color: currentTheme.textSecondary }]}>
                    説明が登録されていません
                  </Text>
                )}
                
                {selectedSong.composer && (
                  <Text style={[styles.modalComposer, { color: currentTheme.textSecondary }]}>
                    作曲者: {selectedSong.composer}
                    {selectedSong.era && ` | 時代: ${selectedSong.era}`}
                  </Text>
                )}
              </ScrollView>
              
              {/* YouTubeボタン（youtube_urlがある場合） */}
              {selectedSong.youtube_url && (
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
        )}
      </Modal>

      {/* お気に入り曲編集モーダル */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingSong(null);
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
                お気に入り曲を編集
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setEditingSong(null);
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
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.title}
                  onChangeText={(text) => setNewSong({ ...newSong, title: text })}
                  placeholder="曲名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>作曲者</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.composer}
                  onChangeText={(text) => setNewSong({ ...newSong, composer: text })}
                  placeholder="作曲者名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>時代</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.era}
                  onChangeText={(text) => setNewSong({ ...newSong, era: text })}
                  placeholder="例: バロック、古典、ロマン派など"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>ジャンル</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.genre}
                  onChangeText={(text) => setNewSong({ ...newSong, genre: text })}
                  placeholder="ジャンルを入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>YouTube URL</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
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
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.famous_performer}
                  onChangeText={(text) => setNewSong({ ...newSong, famous_performer: text })}
                  placeholder="演奏者名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>備考</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.famous_note}
                  onChangeText={(text) => setNewSong({ ...newSong, famous_note: text })}
                  placeholder="備考を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>説明</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
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
                onPress={handleUpdateFavoriteSong}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>更新</Text>
              </TouchableOpacity>
            </View>
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
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.title}
                  onChangeText={(text) => setNewSong({ ...newSong, title: text })}
                  placeholder="曲名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>作曲者</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.composer}
                  onChangeText={(text) => setNewSong({ ...newSong, composer: text })}
                  placeholder="作曲者名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>時代</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.era}
                  onChangeText={(text) => setNewSong({ ...newSong, era: text })}
                  placeholder="例: バロック、古典、ロマン派など"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>ジャンル</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.genre}
                  onChangeText={(text) => setNewSong({ ...newSong, genre: text })}
                  placeholder="ジャンルを入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>YouTube URL</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
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
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.famous_performer}
                  onChangeText={(text) => setNewSong({ ...newSong, famous_performer: text })}
                  placeholder="演奏者名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>備考</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
                  value={newSong.famous_note}
                  onChangeText={(text) => setNewSong({ ...newSong, famous_note: text })}
                  placeholder="備考を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>説明</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.secondary }]}
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
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  instrumentName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  instrumentNameEn: {
    fontSize: 14,
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
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
    fontSize: 18,
    fontWeight: '600',
  },
  favoriteLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
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
