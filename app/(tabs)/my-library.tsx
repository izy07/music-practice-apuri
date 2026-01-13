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
import { checkMyLibraryLimit, canSaveDataForInstrument } from '@/lib/subscriptionLimits';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { safeGoBack } from '@/lib/navigationUtils';
import { showFeatureLimitAlert, normalizeLimitResult, getDefaultAlertConfig } from '@/lib/featureAccessHelpers';
import { isColumnNotFoundError, handleColumnError } from '@/lib/columnErrorHandler';
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
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { t } = useLanguage();
  
  // サブスクリプション状態を取得
  const { entitlement, loading: entitlementLoading, error: subscriptionError, errorMessage: subscriptionErrorMessage, refresh: refreshSubscription } = useSubscription();
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [filterStatus, setFilterStatus] = useState<'want_to_play' | 'learning' | 'played' | 'mastered'>('want_to_play');
  const [isSaving, setIsSaving] = useState(false); // 保存中の二重クリック防止
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalSong, setStatusModalSong] = useState<Song | null>(null);
  const [libraryLimitStatus, setLibraryLimitStatus] = useState<{ canAdd: boolean; currentCount: number; limit: number } | null>(null);
  
  // 新規追加・編集用の状態
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    genre: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    status: 'want_to_play' as 'want_to_play' | 'learning' | 'played' | 'mastered',
    notes: ''
  });

  // 初期ロード + 権限変化時・楽器変更時に再評価
  useEffect(() => {
    loadSongs();
  }, [entitlement.isEntitled, selectedInstrument]);

  // 画面表示時に楽曲数の制限を事前チェック
  useEffect(() => {
    const checkLimitOnMount = async () => {
      if (!entitlement || entitlement.isEntitled) {
        setLibraryLimitStatus(null); // プレミアムユーザーはチェック不要
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        const { getInstrumentId } = await import('@/lib/instrumentUtils');
        const instrumentId = getInstrumentId(selectedInstrument);
        
        const limitCheck = await checkMyLibraryLimit(user.id, entitlement, instrumentId);
        setLibraryLimitStatus(limitCheck);
      } catch (error) {
        logger.error('楽曲制限チェックエラー:', error);
      }
    };

    checkLimitOnMount();
  }, [entitlement, selectedInstrument]);

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
      // 機能アクセスチェック（フリープランでも制限内で使用可能）
      if (!canAccessFeature('my-library', entitlement)) {
        logger.debug('楽曲読み込み: 機能アクセス不可');
        setSongs([]);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        logger.debug('楽曲読み込み開始:', { userId: user.id, filterStatus, selectedInstrument });
        let query = supabase
          .from('my_songs')
          .select('*')
          .eq('user_id', user.id);
        
        // 楽器ごとにフィルタリング（TypeScript側で実行）
        // applyInstrumentFilterは常に元のクエリを返すため、TypeScript側でフィルタリングを実行
        const { applyInstrumentFilter, filterByInstrumentIdInMemory } = await import('@/repositories/common/instrumentFilter');
        
        // クエリを実行（instrument_idカラムの有無に関わらず実行）
        const { data: rawData, error } = await query.order('created_at', { ascending: false });

        if (error) {
          logger.error('楽曲読み込みエラー:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // 400エラーでinstrument_idカラムが原因の場合は、エラーを表示してマイグレーションを促す
          if (error.code === '42703' || error.message?.includes('instrument_id') || error.message?.includes('column') && error.message?.includes('does not exist')) {
            const errorMessage = 'my_songsテーブルにinstrument_idカラムが存在しません。データベースのマイグレーションを実行してください。';
            logger.error('[my-library] データベーススキーマエラー:', errorMessage);
            ErrorHandler.handle(new Error(errorMessage), '楽曲読み込み（スキーマエラー）', true);
            Alert.alert(
              'データベースエラー',
              'my_songsテーブルにinstrument_idカラムが存在しません。\n\nデータベースのマイグレーションを実行してください。\n\nマイグレーションファイル: supabase/migrations/20251226000000_add_instrument_id_to_my_songs.sql'
            );
            setSongs([]);
            return;
          }
          
          throw error;
        }
        
        // TypeScript側で楽器フィルタリングを実行
        let currentInstrumentId: string | null = null;
        if (selectedInstrument) {
          try {
            const { getInstrumentId } = await import('@/lib/instrumentUtils');
            currentInstrumentId = getInstrumentId(selectedInstrument);
          } catch (e) {
            logger.error('[my-library] 楽器ID取得エラー:', e);
            // エラーが発生した場合は、フィルタリングなしで続行（すべての楽曲を表示）
            currentInstrumentId = null;
          }
        }
        
        // 型安全性のため明示的に型を指定（any型を回避）
        interface SongFromDB extends Song {
          instrument_id?: string | null;
        }
        const filteredData = filterByInstrumentIdInMemory(
          (rawData || []) as SongFromDB[],
          currentInstrumentId,
          true // 既存のnullデータも含める
        );
        
        logger.debug('楽曲読み込み成功:', { 
          rawCount: rawData?.length || 0,
          filteredCount: filteredData.length,
          filteredByStatus: filterStatus,
          instrumentId: currentInstrumentId,
          songs: filteredData.map((s: SongFromDB) => ({ id: s.id, title: s.title, status: s.status }))
        });
        
        // データを設定
        const loadedSongs = filteredData as Song[];
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
      
      // formData.statusを文字列として正規化（配列やnull/undefinedの場合に対処）
      // ステータス値の型安全性を確保（any型を回避）
      type SongStatus = 'want_to_play' | 'learning' | 'played' | 'mastered';
      const validStatuses: SongStatus[] = ['want_to_play', 'learning', 'played', 'mastered'];
      
      const normalizedStatus: string = typeof formData.status === 'string' 
        ? formData.status.trim() 
        : (Array.isArray(formData.status) ? formData.status[0] : 'want_to_play');
      
      // 型ガード: 有効なステータス値かどうかを確認
      const statusValue: SongStatus = (normalizedStatus && validStatuses.includes(normalizedStatus as SongStatus))
        ? (normalizedStatus as SongStatus)
        : 'want_to_play'; // 無効な値の場合はデフォルト値を使用
      
      logger.debug('ステータス検証:', {
        originalStatus: formData.status,
        normalizedStatus: normalizedStatus,
        statusValue: statusValue,
        isValid: validStatuses.includes(statusValue)
      });
      
      if (!validStatuses.includes(statusValue)) {
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
        // 型安全性のため明示的に型を指定（any型を回避）
        type SongDifficulty = 'beginner' | 'intermediate' | 'advanced';
        const genreValue = formData.genre && formData.genre.trim() ? formData.genre.trim() : null;
        interface UpdateSongData {
          title: string;
          artist: string;
          genre: string | null;
          difficulty: SongDifficulty;
          status: SongStatus;
          notes: string | null;
          instrument_id?: string;
        }
        const updateData: UpdateSongData = {
          title: formData.title.trim(),
          artist: formData.artist.trim() || '', // NOT NULL制約のため空文字列をデフォルトに
          genre: genreValue,
          difficulty: formData.difficulty,
          status: statusValue,
          notes: formData.notes || null
        };
        
        // 楽器IDを更新（楽器が選択されている場合）
        if (selectedInstrument) {
          updateData.instrument_id = selectedInstrument;
        }
        logger.debug('曲を更新:', editingSong.id, updateData);
        
        let updateError = null;
        let updateResult = null;
        
        // まずinstrument_idを含めて試行
        updateResult = await supabase
          .from('my_songs')
          .update(updateData)
          .eq('id', editingSong.id);
        
        updateError = updateResult.error;

        // instrument_idカラムが存在しないエラーの場合、instrument_idを除外して再試行
        if (updateError && (updateError.code === 'PGRST204' || updateError.code === '42703' || 
            (updateError.message?.includes('instrument_id') && updateError.message?.includes('schema cache')))) {
          logger.warn('[my-library] instrument_idカラムが存在しないため、instrument_idを除外して再試行します');
          const { instrument_id, ...updateDataWithoutInstrumentId } = updateData;
          const retryResult = await supabase
            .from('my_songs')
            .update(updateDataWithoutInstrumentId)
            .eq('id', editingSong.id);
          
          if (retryResult.error) {
            logger.error('曲更新エラー詳細（再試行後）:', {
              error: retryResult.error,
              errorCode: retryResult.error.code,
              errorMessage: retryResult.error.message,
              errorDetails: retryResult.error.details,
              errorHint: retryResult.error.hint,
              updateData: updateDataWithoutInstrumentId
            });
            ErrorHandler.handle(retryResult.error, '曲更新', true);
            throw retryResult.error;
          }
          
          // 再試行が成功した場合は続行
          logger.info('[my-library] instrument_idを除外して曲の更新に成功しました');
        } else if (updateError) {
          logger.error('曲更新エラー詳細:', {
            error: updateError,
            errorCode: updateError.code,
            errorMessage: updateError.message,
            errorDetails: updateError.details,
            errorHint: updateError.hint,
            updateData
          });
          ErrorHandler.handle(updateError, '曲更新', true);
          throw updateError;
        }
        
        logger.debug('更新成功');
        
        // ローカル状態を更新（再取得を避ける）
        setSongs(prevSongs => 
          prevSongs.map(s => s.id === editingSong.id ? {
            ...s,
            title: formData.title.trim(),
            artist: formData.artist.trim() || '',
            genre: genreValue || '',
            difficulty: formData.difficulty,
            status: statusValue,
            notes: formData.notes || ''
          } : s)
        );
        
        // 更新されたステータスに合わせてフィルターを自動調整
        setFilterStatus(statusValue as 'want_to_play' | 'learning' | 'played' | 'mastered');
        
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
        // 新規追加の場合、Freeプランで新しい楽器にデータを保存できるかチェック
        const canSaveCheck = await canSaveDataForInstrument(user.id, selectedInstrument, entitlement);
        if (!canSaveCheck.canSave) {
          const normalizedResult = normalizeLimitResult(canSaveCheck, 'instrument_new');
          const alertConfig = getDefaultAlertConfig('instrument_new');
          
          showFeatureLimitAlert({
            result: {
              ...normalizedResult,
              title: alertConfig.defaultTitle,
            },
            defaultTitle: alertConfig.defaultTitle,
            defaultMessage: normalizedResult.reason || '新しい楽器で楽曲を追加するには、プレミアムへアップグレードしてください。',
            upgradeButtonText: alertConfig.upgradeButtonText,
            router,
            onCancel: () => {
                setIsSaving(false);
            },
          });
          return;
        }
        
        // 新規追加の場合、Freeプランの制限をチェック（楽器ごとに10個まで）
        // 現在選択されている楽器IDを取得
        let currentInstrumentId: string | null = null;
        if (selectedInstrument) {
          try {
            const { getInstrumentId } = await import('@/lib/instrumentUtils');
            currentInstrumentId = getInstrumentId(selectedInstrument);
          } catch (e) {
            logger.error('[my-library] 楽器ID取得エラー:', e);
            currentInstrumentId = null;
          }
        }
        
        const limitCheck = await checkMyLibraryLimit(user.id, entitlement, currentInstrumentId);
        // 制限状態を更新
        setLibraryLimitStatus(limitCheck);
        
        if (!limitCheck.canAdd) {
          const normalizedResult = normalizeLimitResult(limitCheck, 'library_add');
          const alertConfig = getDefaultAlertConfig('library_add');
          
          showFeatureLimitAlert({
            result: {
              ...normalizedResult,
              title: '制限に達しました',
              reason: `Freeプランでは各楽器ごとに楽曲を${limitCheck.limit}曲まで追加できます。\n現在の曲数: ${limitCheck.currentCount}/${limitCheck.limit}\n\nこれ以上追加するには、プレミアムへアップグレードしてください。`,
            },
            defaultTitle: '制限に達しました',
            defaultMessage: `Freeプランでは各楽器ごとに楽曲を${limitCheck.limit}曲まで追加できます。\n現在の曲数: ${limitCheck.currentCount}/${limitCheck.limit}\n\nこれ以上追加するには、プレミアムへアップグレードしてください。`,
            upgradeButtonText: 'アップグレード',
            router,
            onCancel: () => {
                setIsSaving(false);
            },
          });
          return;
        }
        
        // 新規追加
        // artistが空の場合は空文字列を設定（NOT NULL制約のため）
        // genreが空文字列の場合はnullに変換
        // 型安全性のため明示的に型を指定（any型を回避）
        type SongDifficulty = 'beginner' | 'intermediate' | 'advanced';
        type SongStatus = 'want_to_play' | 'learning' | 'played' | 'mastered';
        const genreValue = formData.genre && formData.genre.trim() ? formData.genre.trim() : null;
        interface CreateSongData {
          user_id: string;
          title: string;
          artist: string;
          genre: string | null;
          difficulty: SongDifficulty;
          status: SongStatus;
          notes: string | null;
          instrument_id?: string;
        }
        const songData: CreateSongData = {
          user_id: user.id,
          title: formData.title.trim(),
          artist: formData.artist.trim() || '', // NOT NULL制約のため空文字列をデフォルトに
          genre: genreValue,
          difficulty: formData.difficulty,
          status: statusValue,
          notes: formData.notes || null
        };
        
        // 楽器IDを設定（カラムが存在する場合のみ）
        // instrument_idカラムの存在を確認（エラーが発生した場合はinstrument_idを除外）
        if (selectedInstrument) {
          songData.instrument_id = selectedInstrument;
        }
        logger.debug('新規追加 - 送信データ:', {
          ...songData,
          statusValue: statusValue,
          statusType: typeof statusValue,
          statusValueLength: statusValue?.length,
          formDataStatus: formData.status,
          formDataStatusType: typeof formData.status,
          limitCheck
        });
        
        // まずinstrument_idを含めて試行
        let insertData: any[] | null = null;
        const { data: initialInsertData, error: insertError } = await supabase
          .from('my_songs')
          .insert(songData)
          .select();
        
        if (initialInsertData) {
          insertData = initialInsertData;
        }

        // カラムが存在しないエラーの場合、該当カラムを除外して再試行
        if (insertError) {
          logger.debug('[my-library] エラーを検出:', {
            errorCode: insertError.code,
            errorMessage: insertError.message,
            isColumnError: isColumnNotFoundError(insertError)
          });
          
          if (isColumnNotFoundError(insertError)) {
            const optionalColumns = ['instrument_id'];
            const handled = handleColumnError(insertError, songData, optionalColumns);
            
            if (handled) {
              logger.warn('[my-library] カラムが存在しないため、除外して再試行します', {
                errorCode: insertError.code,
                errorMessage: insertError.message,
                excludedColumns: handled.excludedColumns,
                payload: handled.payload
              });
              
              const retryResult = await supabase
                .from('my_songs')
                .insert(handled.payload)
                .select();
              
              if (retryResult.error) {
                logger.error('[my-library] 曲追加エラー詳細（再試行後）:', {
                  error: retryResult.error,
                  errorCode: retryResult.error.code,
                  errorMessage: retryResult.error.message,
                  errorDetails: retryResult.error.details,
                  errorHint: retryResult.error.hint,
                  songData: handled.payload
                });
                ErrorHandler.handle(retryResult.error, '曲追加', true);
                throw retryResult.error;
              }
              
              // 再試行が成功した場合は続行
              logger.info('[my-library] カラムを除外して曲の追加に成功しました', {
                excludedColumns: handled.excludedColumns
              });
              
              // 再試行時のレスポンスデータを設定
              if (retryResult.data && retryResult.data.length > 0) {
                insertData = retryResult.data;
              }
            } else {
              logger.error('[my-library] handleColumnErrorがnullを返しました', {
                errorCode: insertError.code,
                errorMessage: insertError.message,
                optionalColumns
              });
              ErrorHandler.handle(insertError, '曲追加', true);
              throw insertError;
            }
          } else {
            logger.error('曲追加エラー詳細:', {
              error: insertError,
              errorCode: insertError.code,
              errorMessage: insertError.message,
              errorDetails: insertError.details,
              errorHint: insertError.hint,
              songData
            });
            ErrorHandler.handle(insertError, '曲追加', true);
            throw insertError;
          }
        }
        
        logger.debug('追加成功');
        
        // データベースからのレスポンスで新しい曲を取得
        const newSongData = insertData && insertData.length > 0 ? insertData[0] : null;
        
        // ローカル状態を更新（再取得を避ける）
        if (newSongData) {
          // 楽器フィルタリングを適用（現在の楽器と一致する場合のみ追加）
          const { filterByInstrumentIdInMemory } = await import('@/repositories/common/instrumentFilter');
          interface SongFromDB {
            id: string;
            title: string;
            artist: string;
            genre: string | null;
            difficulty: 'beginner' | 'intermediate' | 'advanced';
            status: 'want_to_play' | 'learning' | 'played' | 'mastered';
            notes: string | null;
            created_at: string;
            updated_at: string;
            instrument_id?: string | null;
          }
          const filteredNewSong = filterByInstrumentIdInMemory([newSongData as SongFromDB], currentInstrumentId, true);
          
          if (filteredNewSong.length > 0) {
            const newSong: Song = {
              id: newSongData.id,
              title: newSongData.title,
              artist: newSongData.artist || '',
              genre: newSongData.genre || '',
              difficulty: newSongData.difficulty,
              status: newSongData.status,
              notes: newSongData.notes || '',
              created_at: newSongData.created_at || new Date().toISOString(),
              updated_at: newSongData.updated_at || new Date().toISOString()
            };
            setSongs(prevSongs => [newSong, ...prevSongs]);
          }
        }
        
        // 保存されたステータスに合わせてフィルターを自動調整
        setFilterStatus(statusValue as 'want_to_play' | 'learning' | 'played' | 'mastered');
        
        // 制限状態を再チェック
        const updatedLimitCheck = await checkMyLibraryLimit(user.id, entitlement, currentInstrumentId);
        setLibraryLimitStatus(updatedLimitCheck);
        
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
      
      // ローカル状態を更新（再取得を避ける）
      setSongs(prevSongs => 
        prevSongs.map(s => s.id === song.id ? { ...s, status: newStatus } : s)
      );
      
      // 選択されたステータスのフィルターに自動切り替え
      setFilterStatus(newStatus);
      
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
              
              // 制限状態を再チェック（削除後に上限が解除される可能性があるため）
              try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
                const { getInstrumentId } = await import('@/lib/instrumentUtils');
                const instrumentId = getInstrumentId(selectedInstrument);
                const updatedLimitCheck = await checkMyLibraryLimit(user.id, entitlement, instrumentId);
                setLibraryLimitStatus(updatedLimitCheck);
          }
              } catch (error) {
                logger.error('制限チェック更新エラー:', error);
              }
        
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
              
              // 制限状態を再チェック（削除後に上限が解除される可能性があるため）
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                const { getInstrumentId } = await import('@/lib/instrumentUtils');
                const instrumentId = getInstrumentId(selectedInstrument);
                const updatedLimitCheck = await checkMyLibraryLimit(user.id, entitlement, instrumentId);
                setLibraryLimitStatus(updatedLimitCheck);
                }
              } catch (error) {
                logger.error('制限チェック更新エラー:', error);
              }
              
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
  const startAdding = async () => {
    // プレミアムユーザーは制限なし
    if (entitlement.isEntitled) {
    setEditingSong(null);
    setFormData({
      title: '',
      artist: '',
      genre: '',
      difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
        status: filterStatus,
      notes: ''
    });
    setShowAddModal(true);
      return;
    }

    // フリープランの場合、上限チェック
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('エラー', 'ログインしてください');
        return;
      }

      const { getInstrumentId } = await import('@/lib/instrumentUtils');
      const instrumentId = getInstrumentId(selectedInstrument);
      
      const limitCheck = await checkMyLibraryLimit(user.id, entitlement, instrumentId);
      setLibraryLimitStatus(limitCheck);
      
      if (!limitCheck.canAdd) {
        const normalizedResult = normalizeLimitResult(limitCheck, 'library_add');
        const alertConfig = getDefaultAlertConfig('library_add');
        
        showFeatureLimitAlert({
          result: {
            ...normalizedResult,
            title: '上限に達しました',
            reason: `Freeプランでは各楽器ごとに楽曲を${limitCheck.limit}曲まで追加できます。\n現在の曲数: ${limitCheck.currentCount}/${limitCheck.limit}\n\nこれ以上追加するには、プレミアムへアップグレードしてください。`,
          },
          defaultTitle: '上限に達しました',
          defaultMessage: `Freeプランでは各楽器ごとに楽曲を${limitCheck.limit}曲まで追加できます。\n現在の曲数: ${limitCheck.currentCount}/${limitCheck.limit}\n\nこれ以上追加するには、プレミアムへアップグレードしてください。`,
          upgradeButtonText: alertConfig.upgradeButtonText,
          router,
        });
        return;
      }

      // 上限に達していない場合はモーダルを開く
      setEditingSong(null);
      setFormData({
        title: '',
        artist: '',
        genre: '',
        difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
        status: filterStatus,
        notes: ''
      });
      setShowAddModal(true);
    } catch (error) {
      logger.error('追加開始時のエラー:', error);
      Alert.alert('エラー', '楽曲の追加を開始できませんでした');
    }
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
    safeGoBack(router, '/(tabs)/settings', true); // 確実にsettings画面に戻る
  };

  // サブスク状態読込中はローディング表示（誤ってプレミアム限定を出さない）
  if (entitlementLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <InstrumentHeader />
        <View style={[styles.emptyContainer, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
          <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary }]}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // サブスクリプションエラーが発生した場合はエラーを表示
  if (subscriptionError && subscriptionErrorMessage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <InstrumentHeader />
        <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}> 
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={styles.backButton}>
            <Text style={{ color: currentTheme.text }}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>マイライブラリ</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: '#DC2626' }]}>⚠️ エラーが発生しました</Text>
          <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary, marginTop: 8 }]}>
            {subscriptionErrorMessage}
          </Text>
          <Text style={[styles.emptySubtitle, { color: currentTheme.textSecondary, marginTop: 16, fontSize: 12 }]}>
            サブスクリプション情報の読み込みに失敗しました。もう一度お試しください。
          </Text>
          <TouchableOpacity 
            style={[styles.emptyAddButton, { backgroundColor: currentTheme.primary, marginTop: 24 }]}
            onPress={async () => {
              await refreshSubscription();
            }}
          >
            <Text style={styles.emptyAddButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 機能アクセス不可の場合のゲート表示（通常は表示されない、フリープランでも制限内で使用可能）
  // このチェックは、entitlementが取得できない場合などのエラー時のフォールバック
  if (!canAccessFeature('my-library', entitlement)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} > 
        <InstrumentHeader />
        <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}> 
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={styles.backButton}>
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
        <TouchableOpacity 
          onPress={startAdding} 
          style={styles.addButton}
          disabled={libraryLimitStatus !== null && !libraryLimitStatus.canAdd}
        >
          <Plus 
            size={36} 
            color={(libraryLimitStatus !== null && !libraryLimitStatus.canAdd) ? currentTheme.textSecondary : currentTheme.primary} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* フリープラン用アップグレードバナー */}
        {!entitlement.isEntitled && (
          <View style={[styles.upgradeBanner, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}>
            <Text style={[styles.upgradeBannerTitle, { color: currentTheme.text }]}>
              10曲まで追加可能
            </Text>
            <TouchableOpacity
              style={[styles.upgradeBannerButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => router.push('/(tabs)/pricing-plans')}
            >
              <Text style={styles.upgradeBannerButtonText}>プレミアムへ</Text>
            </TouchableOpacity>
          </View>
        )}

        
        {/* フィルター */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            {([
              { key: 'want_to_play' as const, label: '弾きたい' },
              { key: 'learning' as const, label: '練習中' },
              { key: 'played' as const, label: '演奏済み' },
              { key: 'mastered' as const, label: 'マスター' }
            ] as const).map((filter, index) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  filterStatus === filter.key && { backgroundColor: currentTheme.primary },
                  index === 0 && styles.firstFilterButton
                ]}
                onPress={() => {
                  type SongStatus = 'want_to_play' | 'learning' | 'played' | 'mastered';
                  setFilterStatus(filter.key as SongStatus);
                }}
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
                style={[
                  styles.emptyAddButton, 
                  { 
                    backgroundColor: (libraryLimitStatus !== null && !libraryLimitStatus.canAdd) ? currentTheme.textSecondary : currentTheme.primary,
                    opacity: (libraryLimitStatus !== null && !libraryLimitStatus.canAdd) ? 0.6 : 1
                  }
                ]}
                onPress={startAdding}
                disabled={libraryLimitStatus !== null && !libraryLimitStatus.canAdd}
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
                    {['クラシック', 'ポップス', 'ジャズ', 'アニソン/ボカロ', 'ロック', 'その他'].map(genre => (
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
                        onPress={() => {
                          type SongDifficulty = 'beginner' | 'intermediate' | 'advanced';
                          setFormData(prev => ({ ...prev, difficulty: difficulty as SongDifficulty }));
                        }}
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
                        onPress={() => {
                          type SongStatus = 'want_to_play' | 'learning' | 'played' | 'mastered';
                          setFormData(prev => ({ ...prev, status: status as SongStatus }));
                        }}
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
                  disabled={isSaving || (!editingSong && libraryLimitStatus !== null && !libraryLimitStatus.canAdd)}
                  style={[
                    styles.modalSaveButton, 
                    { 
                      backgroundColor: (isSaving || (!editingSong && libraryLimitStatus !== null && !libraryLimitStatus.canAdd)) ? currentTheme.textSecondary : currentTheme.primary,
                      opacity: (isSaving || (!editingSong && libraryLimitStatus !== null && !libraryLimitStatus.canAdd)) ? 0.6 : 1
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 4,
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
  upgradeBanner: {
    margin: 12,
    marginBottom: 8,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' 
      ? { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }
    ),
  },
  upgradeBannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  upgradeBannerButton: {
    minWidth: 120,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  upgradeBannerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  limitInfoContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  limitInfoText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  limitInfoSubText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
