import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Music, Edit3, Trash2, Star, Play, Clock, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { supabase } from '@/lib/supabase';
import { canAccessFeature } from '../../lib/subscriptionService';
import { useSubscription } from '@/hooks/useSubscription';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { safeGoBack } from '@/lib/navigationUtils';
import { disableBackgroundFocus, enableBackgroundFocus, blurActiveElement } from '@/lib/modalFocusManager';

interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'want_to_play' | 'learning' | 'played' | 'mastered';
  notes: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
}

export default function MyLibraryScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  
  // サブスクリプション状態を取得
  const { entitlement, loading: entitlementLoading } = useSubscription();
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [filterStatus, setFilterStatus] = useState<'want_to_play' | 'learning' | 'played' | 'mastered'>('want_to_play');
  const [isSaving, setIsSaving] = useState(false); // 保存中の二重クリック防止
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalSong, setStatusModalSong] = useState<Song | null>(null);
  
  // 新規追加・編集用の状態
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    genre: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    status: 'want_to_play' as 'want_to_play' | 'learning' | 'played' | 'mastered',
    notes: ''
  });

  // 初期ロード + 権限変化時に再評価
  useEffect(() => {
    loadSongs();
  }, [entitlement.isEntitled]);

  // モーダルの開閉に応じてフォーカス管理（aria-hidden警告を根本的に解決）
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const isModalOpen = showAddModal || showStatusModal;
    
    if (isModalOpen) {
      // モーダルが開いたとき：背景を非対話的にする
      disableBackgroundFocus();
    } else {
      // モーダルが閉じたとき：背景を再有効化し、フォーカスを外す
      enableBackgroundFocus();
      // 念のため、追加でフォーカスを外す
      setTimeout(() => {
        blurActiveElement();
      }, 0);
    }

    // クリーンアップ：コンポーネントがアンマウントされる際に確実にフォーカスを外す
    return () => {
      if (Platform.OS === 'web' && !showAddModal && !showStatusModal) {
        enableBackgroundFocus();
        blurActiveElement();
      }
    };
  }, [showAddModal, showStatusModal]);

  // 曲の読み込み
  const loadSongs = async () => {
    try {
      // ペイウォール: 未購読かつトライアル外はデータ非表示
      if (!canAccessFeature('my-library', entitlement)) {
        logger.debug('楽曲読み込み: 機能アクセス不可（ペイウォール）');
        setSongs([]);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        logger.debug('楽曲読み込み開始:', { userId: user.id, filterStatus });
        const { data, error } = await supabase
          .from('my_songs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          logger.error('楽曲読み込みエラー:', error);
          throw error;
        }
        
        logger.debug('楽曲読み込み成功:', { 
          totalCount: data?.length || 0, 
          filteredByStatus: filterStatus,
          songs: data?.map((s: any) => ({ id: s.id, title: s.title, status: s.status }))
        });
        
        // データを設定
        const loadedSongs = data || [];
        setSongs(loadedSongs);
        
        // フィルターされた結果もログに記録
        const filtered = loadedSongs.filter((song: Song) => song.status === filterStatus);
        logger.debug('フィルター後の楽曲数:', { 
          filterStatus, 
          count: filtered.length,
          allStatuses: loadedSongs.map((s: Song) => s.status)
        });
      } else {
        logger.debug('楽曲読み込み: ユーザー未認証');
        setSongs([]);
      }
    } catch (error) {
      // 曲の読み込みエラー
      ErrorHandler.handle(error, '楽曲読み込み', true);
      logger.error('楽曲読み込みエラー:', error);
      Alert.alert('エラー', '楽曲の読み込みに失敗しました。もう一度お試しください。');
      setSongs([]); // エラー時は空配列を設定
    }
  };

  // 曲の保存
  const saveSong = async () => {
    // 二重クリック防止
    if (isSaving) {
      logger.debug('保存処理中です。重複実行を防止します。');
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert('エラー', '曲名を入力してください');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        ErrorHandler.handle(authError, '認証', true);
        Alert.alert('エラー', 'ログインが必要です。再度ログインしてください。');
        return;
      }

      logger.debug('認証成功:', user.id);

      // statusの値を検証（許可されている値のみ）
      const validStatuses = ['want_to_play', 'learning', 'played', 'mastered'] as const;
      
      // formData.statusを文字列として正規化（配列やnull/undefinedの場合に対処）
      const normalizedStatus = typeof formData.status === 'string' 
        ? formData.status.trim() 
        : (Array.isArray(formData.status) ? formData.status[0] : 'want_to_play');
      
      const statusValue = normalizedStatus && validStatuses.includes(normalizedStatus as any) 
        ? normalizedStatus 
        : 'want_to_play'; // 無効な値の場合はデフォルト値を使用
      
      logger.debug('ステータス検証:', {
        originalStatus: formData.status,
        normalizedStatus: normalizedStatus,
        statusValue: statusValue,
        isValid: validStatuses.includes(statusValue as any)
      });
      
      if (!validStatuses.includes(statusValue as any)) {
        logger.error('無効なstatus値:', { 
          received: formData.status,
          normalized: normalizedStatus,
          usingDefault: statusValue 
        });
        Alert.alert('エラー', '無効なステータス値です。デフォルト値を使用します。');
      }

      if (editingSong) {
        // 編集
        // artistが空の場合は空文字列を設定（NOT NULL制約のため）
        // genreが空文字列の場合はnullに変換
        const genreValue = formData.genre && formData.genre.trim() ? formData.genre.trim() : null;
        const updateData = {
          title: formData.title.trim(),
          artist: formData.artist.trim() || '', // NOT NULL制約のため空文字列をデフォルトに
          genre: genreValue,
          difficulty: formData.difficulty,
          status: statusValue,
          notes: formData.notes || null
        };
        logger.debug('曲を更新:', editingSong.id, updateData);
        const { error } = await supabase
          .from('my_songs')
          .update(updateData)
          .eq('id', editingSong.id);

        if (error) {
          logger.error('曲更新エラー詳細:', {
            error,
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            updateData
          });
          ErrorHandler.handle(error, '曲更新', true);
          throw error;
        }
        
        logger.debug('更新成功');
        
        // 更新されたステータスに合わせてフィルターを自動調整
        setFilterStatus(statusValue as 'want_to_play' | 'learning' | 'played' | 'mastered');
        
        // リストを再読み込み（モーダルを閉じる前に実行してデータを確実に取得）
        await loadSongs();
        
        // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
        if (Platform.OS === 'web') {
          enableBackgroundFocus();
          blurActiveElement();
        }
        
        // モーダルを閉じてフォームをリセット
        setShowAddModal(false);
        setEditingSong(null);
        resetForm();
        
        Alert.alert('成功', '曲の情報を更新しました');
      } else {
        // 新規追加
        // artistが空の場合は空文字列を設定（NOT NULL制約のため）
        // genreが空文字列の場合はnullに変換
        const genreValue = formData.genre && formData.genre.trim() ? formData.genre.trim() : null;
        const songData = {
          user_id: user.id,
          title: formData.title.trim(),
          artist: formData.artist.trim() || '', // NOT NULL制約のため空文字列をデフォルトに
          genre: genreValue,
          difficulty: formData.difficulty,
          status: statusValue,
          notes: formData.notes || null
        };
        logger.debug('新規追加 - 送信データ:', {
          ...songData,
          statusValue: statusValue,
          statusType: typeof statusValue,
          statusValueLength: statusValue?.length,
          formDataStatus: formData.status,
          formDataStatusType: typeof formData.status
        });
        
        const { error } = await supabase
          .from('my_songs')
          .insert(songData);

        if (error) {
          logger.error('曲追加エラー詳細:', {
            error,
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            songData
          });
          ErrorHandler.handle(error, '曲追加', true);
          throw error;
        }
        
        logger.debug('追加成功');
        
        // 保存されたステータスに合わせてフィルターを自動調整
        setFilterStatus(statusValue as 'want_to_play' | 'learning' | 'played' | 'mastered');
        
        // リストを再読み込み（モーダルを閉じる前に実行してデータを確実に取得）
        await loadSongs();
        
        // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
        if (Platform.OS === 'web') {
          enableBackgroundFocus();
          blurActiveElement();
        }
        
        // モーダルを閉じてフォームをリセット
        setShowAddModal(false);
        setEditingSong(null);
        resetForm();
        
        // 保存成功のメッセージを表示
        const statusText = statusValue === 'learning' ? '練習中の曲' : 
                          statusValue === 'played' ? '演奏済みの曲' :
                          statusValue === 'mastered' ? 'マスター済みの曲' : 
                          '弾きたい曲';
        Alert.alert('保存完了！', `${statusText}を追加しました`);
      }
    } catch (error: unknown) {
      ErrorHandler.handle(error, '曲保存', true);
      const errorMessage = (error as { message?: string; error_description?: string })?.message || 
                          (error as { error_description?: string })?.error_description || 
                          '曲の保存に失敗しました';
      Alert.alert('エラー', `保存できませんでした\n\n詳細: ${errorMessage}`);
    } finally {
      setIsSaving(false); // 保存処理完了
    }
  };

  // ステータス変更
  const changeSongStatus = async (song: Song, newStatus: 'want_to_play' | 'learning' | 'played' | 'mastered') => {
    try {
      const { error } = await supabase
        .from('my_songs')
        .update({ status: newStatus })
        .eq('id', song.id);

      if (error) {
        ErrorHandler.handle(error, 'ステータス変更', true);
        throw error;
      }

      logger.debug('ステータス変更成功:', { songId: song.id, newStatus });
      
      // 選択されたステータスのフィルターに自動切り替え
      setFilterStatus(newStatus);
      
      // リストを再読み込み
      await loadSongs();
      
      Alert.alert('成功', `ステータスを「${getStatusText(newStatus)}」に変更しました`);
    } catch (error) {
      logger.error('ステータス変更エラー:', error);
      Alert.alert('エラー', 'ステータスの変更に失敗しました');
    }
  };

  // ステータス選択ダイアログを表示
  const showStatusSelection = (song: Song) => {
    logger.debug('ステータス選択ダイアログを表示:', { songId: song.id, currentStatus: song.status });
    setStatusModalSong(song);
    setShowStatusModal(true);
  };

  // ステータスを変更（モーダルから呼ばれる）
  const handleStatusChange = async (newStatus: 'want_to_play' | 'learning' | 'played' | 'mastered') => {
    if (!statusModalSong) return;
    
    if (statusModalSong.status === newStatus) {
      // 既に同じステータスの場合は何もしない
      // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
      if (Platform.OS === 'web') {
        const { blurActiveElement } = require('@/lib/modalFocusManager');
        blurActiveElement();
      }
      setShowStatusModal(false);
      setStatusModalSong(null);
      return;
    }
    
    // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
    if (Platform.OS === 'web') {
      const { blurActiveElement } = require('@/lib/modalFocusManager');
      blurActiveElement();
    }
    setShowStatusModal(false);
    setStatusModalSong(null);
    await changeSongStatus(statusModalSong, newStatus);
  };

  // 曲の削除
  const deleteSong = async (song: Song) => {
    logger.debug('deleteSong関数が呼び出されました:', { songId: song.id, title: song.title });
    
    // Web環境ではwindow.confirmを使用（Alert.alertが正しく動作しない場合があるため）
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`「${song.title}」を削除しますか？\n\nこの操作は元に戻せません。`);
      if (!confirmed) {
        logger.debug('削除がキャンセルされました');
        return;
      }
      
      try {
        logger.debug('曲を削除中:', { songId: song.id, title: song.title });
        const { error } = await supabase
          .from('my_songs')
          .delete()
          .eq('id', song.id);

        if (error) {
          ErrorHandler.handle(error, '曲削除', true);
          throw error;
        }

        logger.debug('曲削除成功:', { songId: song.id });
        
        // 削除後にリストを再読み込み
        await loadSongs();
        
        // Web環境では簡易的なアラートを表示
        window.alert('曲を削除しました');
      } catch (error) {
        logger.error('曲削除エラー:', error);
        window.alert('曲の削除に失敗しました。もう一度お試しください。');
      }
      return;
    }
    
    // モバイル環境ではAlert.alertを使用
    Alert.alert(
      '削除確認',
      `「${song.title}」を削除しますか？\nこの操作は元に戻せません。`,
      [
        { text: 'キャンセル', style: 'cancel', onPress: () => logger.debug('削除がキャンセルされました') },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              logger.debug('曲を削除中:', { songId: song.id, title: song.title });
              const { error } = await supabase
                .from('my_songs')
                .delete()
                .eq('id', song.id);

              if (error) {
                ErrorHandler.handle(error, '曲削除', true);
                throw error;
              }

              logger.debug('曲削除成功:', { songId: song.id });
              
              // 削除後にリストを再読み込み
              await loadSongs();
              
              Alert.alert('削除完了', '曲を削除しました');
            } catch (error) {
              logger.error('曲削除エラー:', error);
              Alert.alert('エラー', '曲の削除に失敗しました。もう一度お試しください。');
            }
          }
        }
      ]
    );
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      title: '',
      artist: '',
      genre: '',
      difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
      status: filterStatus, // 現在選択されているフィルターのステータスを使用
      notes: ''
    });
  };

  // 編集開始
  const startEditing = (song: Song) => {
    setEditingSong(song);
    setFormData({
      title: song.title,
      artist: song.artist,
      genre: song.genre,
      difficulty: song.difficulty as 'beginner' | 'intermediate' | 'advanced',
      status: song.status as 'want_to_play' | 'learning' | 'played' | 'mastered',
      notes: song.notes
    });
    setShowAddModal(true);
  };

  // 新規追加開始
  const startAdding = () => {
    setEditingSong(null);
    // 現在のフィルターステータスを初期値として設定
    setFormData({
      title: '',
      artist: '',
      genre: '',
      difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
      status: filterStatus, // 現在選択されているフィルターのステータスを使用
      notes: ''
    });
    setShowAddModal(true);
  };

  // フィルタリングされた曲リスト
  const filteredSongs = songs.filter(song => song.status === filterStatus);

  // 難易度の表示
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '初級';
      case 'intermediate': return '中級';
      case 'advanced': return '上級';
      default: return difficulty;
    }
  };

  // ステータスの表示
  const getStatusText = (status: string) => {
    switch (status) {
      case 'want_to_play': return '弾きたい';
      case 'learning': return '練習中';
      case 'played': return '演奏済み';
      case 'mastered': return 'マスター';
      default: return status;
    }
  };

  // ステータスの色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'want_to_play': return '#FF9800';
      case 'learning': return '#2196F3';
      case 'played': return '#9C27B0';
      case 'mastered': return '#4CAF50';
      default: return '#666666';
    }
  };

  const goBack = () => {
    safeGoBack('/(tabs)/settings', true); // 強制的にsettings画面に戻る
  };

  // サブスク状態読込中は何も表示しない（誤ってプレミアム限定を出さない）
  if (entitlementLoading) {
    return null;
  }

  // 非購読時のゲート表示
  if (!canAccessFeature('my-library', entitlement)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} > 
        <InstrumentHeader />
        <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}> 
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings' as any)} style={styles.backButton}>
            <Text style={{ color: currentTheme.text }}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>マイライブラリ</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.songsContainer}>
          <View style={styles.emptyContainer}>
            <Music size={64} color={currentTheme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>プレミアム限定</Text>
            <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary }]}>マイライブラリはプレミアムでご利用いただけます</Text>
            <TouchableOpacity 
              style={[styles.emptyAddButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => router.push('/(tabs)/pricing-plans')}
            >
              <Text style={styles.emptyAddButtonText}>料金プランを見る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          マイライブラリ
        </Text>
        <TouchableOpacity onPress={startAdding} style={styles.addButton}>
          <Plus size={24} color={currentTheme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* フィルター */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            {[
              { key: 'want_to_play', label: '弾きたい' },
              { key: 'learning', label: '練習中' },
              { key: 'played', label: '演奏済み' },
              { key: 'mastered', label: 'マスター' }
            ].map((filter, index) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  filterStatus === filter.key && { backgroundColor: currentTheme.primary },
                  index === 0 && styles.firstFilterButton
                ]}
                onPress={() => setFilterStatus(filter.key as any)}
              >
                <Text style={[
                  styles.filterButtonText,
                  { color: filterStatus === filter.key ? '#FFFFFF' : currentTheme.text }
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 曲リスト */}
        <View style={styles.songsContainer}>
          {filteredSongs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Music size={64} color={currentTheme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
                まだ曲がありません
              </Text>
              <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary }]}>
                弾きたい曲を追加してみましょう！
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddButton, { backgroundColor: currentTheme.primary }]}
                onPress={startAdding}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.emptyAddButtonText}>曲を追加</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredSongs}
              keyExtractor={(item) => item.id}
              renderItem={({ item: song }) => (
                <View style={[styles.songCard, { backgroundColor: currentTheme.surface }]}>
                  <View style={styles.songHeader}>
                    <View style={styles.songInfo}>
                      <Text style={[styles.songTitle, { color: currentTheme.text }]} numberOfLines={1}>
                        {song.title}
                      </Text>
                      {song.artist && song.artist.trim() ? (
                        <Text style={[styles.songComposer, { color: currentTheme.textSecondary }]} numberOfLines={1}>
                          {song.artist}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.songActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          logger.debug('編集ボタンが押されました:', song.id);
                          startEditing(song);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Edit3 size={18} color={currentTheme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={(e) => {
                          e.stopPropagation();
                          logger.debug('削除ボタンタッチイベント発生:', { songId: song.id, title: song.title });
                          deleteSong(song);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.songMetaRow}>
                    {song.genre && song.genre.trim() ? (
                      <View style={styles.metaChip}>
                        <Text style={[styles.metaChipText, { color: currentTheme.textSecondary }]}>
                          {song.genre}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.metaChip}>
                      <Text style={[styles.metaChipText, { color: currentTheme.textSecondary }]}>
                        {getDifficultyText(song.difficulty)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => showStatusSelection(song)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(song.status) }]}>
                        <Text style={styles.statusText}>
                          {getStatusText(song.status)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  
                  {song.notes && song.notes.trim() ? (
                    <Text style={[styles.notesText, { color: currentTheme.textSecondary }]} numberOfLines={2}>
                      {song.notes}
                    </Text>
                  ) : null}
                </View>
              )}
              scrollEnabled={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          )}
        </View>
      </ScrollView>

      {/* ステータス選択モーダル */}
      <Modal
        visible={showStatusModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
          if (Platform.OS === 'web') {
            enableBackgroundFocus();
            blurActiveElement();
          }
          setShowStatusModal(false);
          setStatusModalSong(null);
        }}
      >
        <View style={[styles.statusModalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.statusModalContent, { backgroundColor: currentTheme.background }]}>
            <Text style={[styles.statusModalTitle, { color: currentTheme.text }]}>
              ステータスを変更
            </Text>
            {statusModalSong && (
              <>
                <Text style={[styles.statusModalSubtitle, { color: currentTheme.textSecondary }]}>
                  {statusModalSong.title}
                </Text>
                <Text style={[styles.statusModalCurrentStatus, { color: currentTheme.textSecondary }]}>
                  現在: {getStatusText(statusModalSong.status)}
                </Text>
                <View style={styles.statusModalOptions}>
                  {[
                    { key: 'want_to_play' as const, label: '弾きたい' },
                    { key: 'learning' as const, label: '練習中' },
                    { key: 'played' as const, label: '演奏済み' },
                    { key: 'mastered' as const, label: 'マスター' },
                  ].map((status) => (
                    <TouchableOpacity
                      key={status.key}
                      style={[
                        styles.statusModalOption,
                        {
                          backgroundColor: statusModalSong.status === status.key
                            ? currentTheme.secondary
                            : currentTheme.surface,
                          borderColor: statusModalSong.status === status.key
                            ? currentTheme.primary
                            : currentTheme.secondary,
                          borderWidth: statusModalSong.status === status.key ? 2 : 1,
                        }
                      ]}
                      onPress={() => handleStatusChange(status.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.statusModalOptionText,
                          {
                            color: statusModalSong.status === status.key
                              ? currentTheme.primary
                              : currentTheme.text,
                            fontWeight: statusModalSong.status === status.key ? '700' : '500',
                          }
                        ]}
                      >
                        {status.label}
                        {statusModalSong.status === status.key && ' (現在)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.statusModalCancelButton, { backgroundColor: currentTheme.surface }]}
                  onPress={() => {
                    // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
                    if (Platform.OS === 'web') {
                      enableBackgroundFocus();
                      blurActiveElement();
                    }
                    setShowStatusModal(false);
                    setStatusModalSong(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusModalCancelText, { color: currentTheme.text }]}>
                    キャンセル
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 追加・編集モーダル */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
          if (Platform.OS === 'web') {
            enableBackgroundFocus();
            blurActiveElement();
          }
          setShowAddModal(false);
        }}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
          <View 
            role="dialog"
            aria-modal={true}
            aria-labelledby="my-library-modal-title"
            data-modal-content={true}
            style={{ flex: 1 }}
          >
            <View style={[styles.modalHeader, { borderBottomColor: currentTheme.secondary }]}>
              <TouchableOpacity
                onPress={() => {
                  // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
                  if (Platform.OS === 'web') {
                    enableBackgroundFocus();
                    blurActiveElement();
                  }
                  setShowAddModal(false);
                }}
                style={styles.modalCloseButton}
              >
                <Text style={[styles.modalCloseText, { color: currentTheme.textSecondary }]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {editingSong ? '曲を編集' : (
                  formData.status === 'learning' ? '練習中の曲を追加' : 
                  formData.status === 'played' ? '演奏済みの曲を追加' :
                  formData.status === 'mastered' ? 'マスター済みの曲を追加' : 
                  '弾きたい曲を追加'
                )}
              </Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: currentTheme.text }]}>曲名 *</Text>
                <TextInput
                  id="song-title-input"
                  style={[styles.formInput, { 
                    backgroundColor: currentTheme.surface,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={formData.title || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  placeholder="曲名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: currentTheme.text }]}>アーティスト</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: currentTheme.surface,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={formData.artist}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, artist: text }))}
                  placeholder="アーティスト名を入力（任意）"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: currentTheme.text }]}>ジャンル</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.genreContainer}>
                    {['クラシック', 'ポップス', 'ジャズ', 'ロック', 'アニメ', 'ゲーム', 'その他'].map(genre => (
                      <TouchableOpacity
                        key={genre}
                        style={[
                          styles.genreChip,
                          formData.genre === genre && { backgroundColor: currentTheme.primary }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, genre }))}
                      >
                        <Text
                          style={[
                            styles.genreChipText,
                            { color: formData.genre === genre ? '#FFFFFF' : currentTheme.text }
                          ]}
                        >
                          {genre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: currentTheme.text }]}>難易度</Text>
                  <View style={styles.pickerContainer}>
                    {['beginner', 'intermediate', 'advanced'].map(difficulty => (
                      <TouchableOpacity
                        key={difficulty}
                        style={[
                          styles.pickerOption,
                          formData.difficulty === difficulty && { backgroundColor: currentTheme.primary }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, difficulty: difficulty as any }))}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          { color: formData.difficulty === difficulty ? '#FFFFFF' : currentTheme.text }
                        ]}>
                          {getDifficultyText(difficulty)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.formLabel, { color: currentTheme.text }]}>ステータス</Text>
                  <View style={styles.pickerContainer}>
                    {['want_to_play', 'learning', 'played', 'mastered'].map(status => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.pickerOption,
                          formData.status === status && { backgroundColor: currentTheme.primary }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, status: status as any }))}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          { color: formData.status === status ? '#FFFFFF' : currentTheme.text }
                        ]}>
                          {getStatusText(status)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: currentTheme.text }]}>メモ</Text>
                <TextInput
                  style={[styles.formTextArea, { 
                    backgroundColor: currentTheme.surface,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={formData.notes || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="練習のポイントやメモを入力"
                  placeholderTextColor={currentTheme.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* 保存ボタン */}
              <View style={styles.saveButtonContainer}>
                <TouchableOpacity 
                  onPress={saveSong}
                  disabled={isSaving}
                  style={[
                    styles.modalSaveButton, 
                    { 
                      backgroundColor: currentTheme.primary,
                      opacity: isSaving ? 0.6 : 1
                    }
                  ]}
                >
                  <CheckCircle2 size={20} color="#FFFFFF" />
                  <Text style={styles.modalSaveText}>
                    {isSaving ? '保存中...' : '保存'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterContainer: {
    marginVertical: 20,
    marginLeft: -20,
    paddingLeft: 0,
    marginRight: -20,
  },
  filterScrollContent: {
    paddingLeft: 0,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  firstFilterButton: {
    marginLeft: 4,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  songsContainer: {
    gap: 8,
    paddingBottom: 20,
  },
  emptyContainer: {
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
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  songCard: {
    borderRadius: 12,
    padding: 8,
    marginBottom: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  songHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  songInfo: {
    flex: 1,
    marginRight: 16,
    paddingLeft: 8,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
  },
  songComposer: {
    fontSize: 14,
    fontWeight: '500',
  },
  songActions: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    zIndex: 10,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    zIndex: 11,
  },
  songMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notesText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  statusModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    ...(Platform.OS === 'web' 
      ? { boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 10,
        }
    ),
  },
  statusModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusModalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusModalCurrentStatus: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  statusModalOptions: {
    gap: 12,
    marginBottom: 16,
  },
  statusModalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusModalOptionText: {
    fontSize: 16,
  },
  statusModalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  statusModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
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
  modalHeaderSpacer: {
    width: 80, // 保存ボタンと同じ幅のスペーサー
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
    
    
    
    elevation: 4,
  },
  saveButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 12,
  },
  genreContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  genreChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
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
    minHeight: 100,
  },
  // 容量関連のスタイル
  capacityInfo: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    
    
    
    elevation: 3,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  capacityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  capacityExpiry: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  capacityBoostButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    
    
    
    elevation: 2,
  },
  capacityBoostText: {
    fontSize: 16,
    fontWeight: '600',
  },

  pickerContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
