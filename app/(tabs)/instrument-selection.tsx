import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { CheckCircle, ArrowLeft } from 'lucide-react-native';
import { SuccessMessages } from '@/lib/errorMessages';
import logger from '@/lib/logger';
import { createShadowStyle } from '@/lib/shadowStyles';
import { storageManager, emitStorageEvent } from '@/lib/storageManager';
import { withUser, STORAGE_KEYS } from '@/lib/storageKeys';
import { instrumentService } from '@/services';

interface Instrument {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
}

interface UserProfile {
  selected_instrument_id?: string;
  custom_instrument_name?: string;
}

export default function InstrumentSelectionScreen() {
  const router = useRouter();
  const { setSelectedInstrument, currentTheme, selectedInstrument } = useInstrumentTheme();
  const { user, fetchUserProfile } = useAuthAdvanced();

  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentInstrumentId, setCurrentInstrumentId] = useState<string>('');
  const [customInstrumentName, setCustomInstrumentName] = useState<string>('');

  const instruments: Instrument[] = [
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'ピアノ', nameEn: 'Piano', emoji: '🎹' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'ギター', nameEn: 'Guitar', emoji: '🎸' },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'バイオリン', nameEn: 'Violin', emoji: '🎻' },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'フルート', nameEn: 'Flute', emoji: '🪈' },
    { id: '550e8400-e29b-41d4-a716-446655440005', name: 'トランペット', nameEn: 'Trumpet', emoji: '🎺' },
    { id: '550e8400-e29b-41d4-a716-446655440009', name: 'クラリネット', nameEn: 'Clarinet', emoji: '🎵' },
    { id: '550e8400-e29b-41d4-a716-446655440011', name: 'チェロ', nameEn: 'Cello', emoji: '🎻' },
    { id: '550e8400-e29b-41d4-a716-446655440007', name: 'サックス', nameEn: 'Saxophone', emoji: '🎷' },
    { id: '550e8400-e29b-41d4-a716-446655440018', name: 'ヴィオラ', nameEn: 'Viola', emoji: '🎻' },
    { id: '550e8400-e29b-41d4-a716-446655440008', name: 'ホルン', nameEn: 'Horn', emoji: '📯' },
    { id: '550e8400-e29b-41d4-a716-446655440006', name: 'ドラム', nameEn: 'Drums', emoji: '🥁' },
    { id: '550e8400-e29b-41d4-a716-446655440013', name: 'オーボエ', nameEn: 'Oboe', emoji: '🎵' },
    { id: '550e8400-e29b-41d4-a716-446655440010', name: 'トロンボーン', nameEn: 'Trombone', emoji: '🎺' },
    { id: '550e8400-e29b-41d4-a716-446655440015', name: 'コントラバス', nameEn: 'Contrabass', emoji: '🎻' },
    { id: '550e8400-e29b-41d4-a716-446655440012', name: 'ファゴット', nameEn: 'Bassoon', emoji: '🎵' },
    // TODO: 実装完了後にコメントアウトを解除
    // { id: '550e8400-e29b-41d4-a716-446655440014', name: 'ハープ', nameEn: 'Harp', emoji: '🎶' },
    // { id: '550e8400-e29b-41d4-a716-446655440020', name: 'シンセサイザー', nameEn: 'Synthesizer', emoji: '🎹' },
    // { id: '550e8400-e29b-41d4-a716-446655440021', name: '太鼓', nameEn: 'Taiko', emoji: '🥁' },
    // { id: '550e8400-e29b-41d4-a716-446655440019', name: '琴', nameEn: 'Koto', emoji: '🎵' },
    { id: '550e8400-e29b-41d4-a716-446655440016', name: 'その他', nameEn: 'Other', emoji: '❓' },
  ];

  // 現在の楽器を取得（データベースから取得した値を優先）
  useEffect(() => {
    const fetchCurrentInstrument = async () => {
      if (!user?.id) {
        // ユーザーが認証されていない場合はクリア
        setCurrentInstrumentId('');
        setSelectedInstrumentId('');
        return;
      }

      try {
        // データベースからselected_instrument_idを取得（キャッシュではなく実際のDB値を確認）
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('selected_instrument_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          logger.error('プロフィール取得エラー:', error);
          // エラー時はキャッシュを使用
          if (selectedInstrument && selectedInstrument !== '') {
            setCurrentInstrumentId(selectedInstrument);
            setSelectedInstrumentId(selectedInstrument);
          } else {
            setCurrentInstrumentId('');
            setSelectedInstrumentId('');
          }
          return;
        }

        // データベースのselected_instrument_idを優先（新規登録時はnull）
        const dbInstrumentId = profile?.selected_instrument_id || null;
        
        if (dbInstrumentId && dbInstrumentId !== '') {
          // データベースに楽器IDが保存されている場合
          setCurrentInstrumentId(dbInstrumentId);
          setSelectedInstrumentId(dbInstrumentId);
          // その他楽器の場合は楽器名も取得
          if (dbInstrumentId === '550e8400-e29b-41d4-a716-446655440016') {
            fetchCustomInstrumentName();
          }
        } else {
          // 新規登録時（データベースにselected_instrument_idがnullまたは存在しない）
          // キャッシュを無視してクリア
          setCurrentInstrumentId('');
          setSelectedInstrumentId('');
          // キャッシュに残っている楽器IDもクリア
          if (selectedInstrument && selectedInstrument !== '') {
            // キャッシュをクリア（オプション：必要に応じて実装）
            logger.debug('新規登録ユーザー: キャッシュされた楽器IDを無視', { cachedInstrumentId: selectedInstrument });
          }
        }
      } catch (error) {
        logger.error('楽器ID取得エラー:', error);
        // エラー時はキャッシュを使用
        if (selectedInstrument && selectedInstrument !== '') {
          setCurrentInstrumentId(selectedInstrument);
          setSelectedInstrumentId(selectedInstrument);
        } else {
          setCurrentInstrumentId('');
          setSelectedInstrumentId('');
        }
      }
    };

    fetchCurrentInstrument();
  }, [user?.id, selectedInstrument]);

  const fetchCustomInstrumentName = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('custom_instrument_name')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        // エラーは無視（カスタム楽器名の取得失敗は致命的ではない）
        return;
      }
      
      if (data?.custom_instrument_name) {
        setCustomInstrumentName(data.custom_instrument_name);
      }
    } catch (error) {
      // エラーは無視（カスタム楽器名の取得失敗は致命的ではない）
    }
  };

  const handleInstrumentSelection = (instrumentId: string) => {
    setSelectedInstrumentId(instrumentId);
    
    // その他以外の楽器を選択した場合はカスタム楽器名をクリア
    if (instrumentId !== '550e8400-e29b-41d4-a716-446655440016') {
      setCustomInstrumentName('');
    }
  };

  const handleSaveInstrument = async () => {
    if (!selectedInstrumentId) {
      Alert.alert('エラー', '楽器が選択されていません');
      return;
    }

    if (!user?.id) {
      Alert.alert('エラー', 'ユーザー情報が取得できません');
      return;
    }

    if (loading) return;

    // その他楽器選択時の楽器名検証
    if (selectedInstrumentId === '550e8400-e29b-41d4-a716-446655440016' && !customInstrumentName.trim()) {
      Alert.alert('エラー', '楽器名を入力してください');
      return;
    }

    try {
      setLoading(true);

      // 最小限のカラムのみを選択（存在が確実なカラムのみ）
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, user_id, selected_instrument_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        Alert.alert('エラー', 'プロフィールの取得に失敗しました');
        setLoading(false);
        return;
      }

      // instrument_idが存在するか確認（その他楽器の場合はスキップ）
      if (selectedInstrumentId && selectedInstrumentId !== '550e8400-e29b-41d4-a716-446655440016') {
        const { data: instrumentExists, error: checkError } = await supabase
          .from('instruments')
          .select('id')
          .eq('id', selectedInstrumentId)
          .maybeSingle();
        
        // エラーが発生した場合や楽器が存在しない場合は、警告を出して続行
        if (checkError || !instrumentExists) {
          logger.warn(`楽器ID ${selectedInstrumentId} がデータベースに存在しません。楽器リストに含まれているため、保存を続行します。`, {
            instrumentId: selectedInstrumentId,
            error: checkError
          });
          // エラーを出さずに続行（楽器リストに含まれているため）
        }
      }

      // リトライロジック付きで保存を実行
      let error;
      let retryCount = 0;
      const maxRetries = 3;
      let currentProfile = existingProfile;
      
      while (retryCount < maxRetries) {
        if (currentProfile) {
          const updateData: any = {
            selected_instrument_id: selectedInstrumentId || null,
            updated_at: new Date().toISOString()
          };
          
          // その他楽器の場合は楽器名も保存（カラムが存在する場合のみ）
          // 注意: custom_instrument_nameカラムは現在のスキーマに含まれていません
          // カラムが存在しない場合のエラーを避けるため、一旦コメントアウト
          // if (selectedInstrumentId === '550e8400-e29b-41d4-a716-446655440016') {
          //   updateData.custom_instrument_name = customInstrumentName.trim();
          // }
          
          // 最小限のカラムのみを選択（存在が確実なカラムのみ）
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', user.id)
            .select('id, user_id, selected_instrument_id');
          error = updateError;

          // 400エラーの詳細をログに出力（エラーハンドリングを改善）
          if (error) {
            // エラーの詳細情報を取得
            const errorDetails = {
              status: error.status || error.code,
              message: error.message,
              code: error.code,
              details: (error as any).details,
              hint: (error as any).hint,
              updateData,
              userId: user.id,
            };
            
            // 400エラーの場合は詳細ログを出力
            if (error.status === 400 || error.code === 'PGRST116' || error.code === 'PGRST205') {
              logger.warn('user_profiles更新エラー（400）:', errorDetails);
            } else {
              logger.error('user_profiles更新エラー:', errorDetails);
            }
          }

          // 400エラー（レコードが存在しない、またはカラムが存在しない）の場合にupsertにフォールバック
          if (error && (error.code === 'PGRST116' || error.code === 'PGRST205' || 
              (error.status === 400 && (error.message?.includes('No rows found') || 
                                        error.message?.includes('column') || 
                                        error.message?.includes('does not exist'))))) {
            logger.warn('user_profilesレコードが存在しないためupsertを試みます', { error, selectedInstrumentId });
            
            const upsertData: any = {
              user_id: user.id,
              selected_instrument_id: selectedInstrumentId || null,
              updated_at: new Date().toISOString()
            };
            
            // 最小限のカラムのみを選択（存在が確実なカラムのみ）
            const { data: upsertDataResult, error: upsertError } = await supabase
              .from('user_profiles')
              .upsert(upsertData, {
                onConflict: 'user_id'
              })
              .select('id, user_id, selected_instrument_id')
              .single();
            error = upsertError;
            
            // 400エラーの詳細をログに出力
            if (error && error.status === 400) {
              logger.error('user_profiles upsertエラー（400）:', {
                error,
                upsertData,
                userId: user.id,
                errorMessage: error.message,
                errorCode: error.code,
              });
            }
            
            // upsert成功した場合はcurrentProfileを更新
            if (!error && upsertDataResult) {
              currentProfile = upsertDataResult;
            }
          }
        } else {
          const upsertData: any = {
            user_id: user.id,
            selected_instrument_id: selectedInstrumentId || null,
            updated_at: new Date().toISOString()
          };
          
          // その他楽器の場合は楽器名も保存（カラムが存在する場合のみ）
          // custom_instrument_nameカラムはマイグレーション（20250123000001_add_custom_instrument_name.sql）で追加される必要があります
          // カラムが存在しない場合のエラーを避けるため、一旦コメントアウト
          // if (selectedInstrumentId === '550e8400-e29b-41d4-a716-446655440016') {
          //   upsertData.custom_instrument_name = customInstrumentName.trim();
          // }
          
          // 最小限のカラムのみを選択（存在が確実なカラムのみ）
          const { error: upsertError } = await supabase
            .from('user_profiles')
            .upsert(upsertData, {
              onConflict: 'user_id'
            })
            .select('id, user_id, selected_instrument_id');
          error = upsertError;
          
          // 400エラーの詳細をログに出力
          if (error && error.status === 400) {
            logger.error('user_profiles upsertエラー（400）:', {
              error,
              upsertData,
              userId: user.id,
              errorMessage: error.message,
              errorCode: error.code,
            });
          }
        }

        // エラー処理：409エラー、外部キー制約違反、その他のエラーを区別して処理
        if (error) {
          // 409エラー（Conflict）の場合：既にレコードが存在する可能性があるため、updateにフォールバック
          if (error.code === '23505' || error.status === 409 || (error.message?.includes('duplicate key') || error.message?.includes('already exists'))) {
            logger.warn('user_profilesレコードが既に存在します。updateにフォールバックします。', { error, selectedInstrumentId });
            
            // updateにフォールバック
            const updateData: any = {
              selected_instrument_id: selectedInstrumentId || null,
              updated_at: new Date().toISOString()
            };
            
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update(updateData)
              .eq('user_id', user.id)
              .select('id, user_id, selected_instrument_id');
            
            if (updateError) {
              // updateも失敗した場合は、外部キー制約違反の可能性がある
              if (updateError.code === '23503' || (updateError.message?.includes('violates foreign key constraint') && updateError.message?.includes('instruments'))) {
                error = updateError; // 外部キー制約違反として処理を続行
              } else {
                error = updateError;
                retryCount++;
                continue; // リトライ
              }
            } else {
              // update成功
              error = null;
              break;
            }
          }
          
          // 外部キー制約違反（楽器が存在しない）の場合
          if (error.code === '23503' || (error.message?.includes('violates foreign key constraint') && error.message?.includes('instruments'))) {
            logger.warn('楽器がデータベースに存在しません。楽器を作成してから再試行します。', { error, selectedInstrumentId });
            
            // 楽器を先に作成
            if (selectedInstrumentId && selectedInstrumentId !== '550e8400-e29b-41d4-a716-446655440016') {
              try {
                // instrumentServiceからデフォルト楽器データを取得
                const defaultInstruments = instrumentService.getDefaultInstruments();
                const defaultInstrument = defaultInstruments.find(inst => inst.id === selectedInstrumentId);
                
                if (defaultInstrument) {
                  // 楽器をデータベースに作成
                  const { error: createError } = await supabase
                    .from('instruments')
                    .upsert({
                      id: defaultInstrument.id,
                      name: defaultInstrument.name,
                      name_en: defaultInstrument.nameEn,
                      color_primary: defaultInstrument.primary,
                      color_secondary: defaultInstrument.secondary,
                      color_accent: defaultInstrument.accent,
                    }, {
                      onConflict: 'id'
                    });
                  
                  if (createError) {
                    // 楽器作成に失敗した場合はエラーを投げる（外部キー制約違反を防ぐため）
                    throw createError;
                  }
                } else {
                  // デフォルト楽器データにも存在しない場合はエラー
                  throw new Error(`楽器ID ${selectedInstrumentId} がデフォルト楽器データに存在しません`);
                }
              } catch (createErr) {
                throw createErr;
              }
            }
            
            // リトライ（楽器作成後に再試行）
            retryCount++;
            if (retryCount < maxRetries) {
              // 指数バックオフで待機（楽器作成の反映を待つ）
              // 200ms, 400ms, 800ms, 1600ms
              const baseDelay = 200;
              const delay = baseDelay * Math.pow(2, retryCount - 1);
              await new Promise<void>((resolve) => setTimeout(resolve, delay));
              // 最新のプロフィールを再取得
              const { data: refreshedProfile } = await supabase
                .from('user_profiles')
                .select('id, user_id, selected_instrument_id')
                .eq('user_id', user.id)
                .maybeSingle();
              currentProfile = refreshedProfile;
              continue; // ループを続行して再試行
            }
          } else if (error.code === '23505' || error.code === 'PGRST116' || (error as any).status === 409) {
            // 競合エラーの場合、少し待ってからリトライ
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise<void>((resolve) => setTimeout(resolve, 500 * retryCount));
              // 最新のプロフィールを再取得
              const { data: refreshedProfile } = await supabase
                .from('user_profiles')
                .select('id, user_id, selected_instrument_id')
                .eq('user_id', user.id)
                .maybeSingle();
              currentProfile = refreshedProfile;
              continue;
            }
          }
          // その他のエラーまたはリトライ上限に達した場合
          Alert.alert('エラー', '楽器の保存に失敗しました');
          setLoading(false);
          return;
        } else {
          // 成功した場合はループを抜ける
          break;
        }
      }

      await setSelectedInstrument(selectedInstrumentId);
      
      // 楽器変更イベントを発火（データ再取得のため）
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('instrumentChanged', {
          detail: {
            instrumentId: selectedInstrumentId,
            previousInstrumentId: currentInstrumentId
          }
        }));
      }

      // 成功メッセージを表示してから遷移
      const instrumentName = instruments.find(i => i.id === selectedInstrumentId)?.name || '楽器';
      const isInstrumentChange = currentInstrumentId && currentInstrumentId !== '' && currentInstrumentId !== selectedInstrumentId;
      
      // 楽器変更か楽器選択かを判定してメッセージを変更
      const alertTitle = isInstrumentChange ? '楽器変更完了' : '楽器選択完了';
      const alertMessage = isInstrumentChange 
        ? `楽器を${instrumentName}に変更しました！` 
        : `${instrumentName}が選択されました！`;
      
      // 楽器選択後、チュートリアル完了状態を更新（チュートリアル画面に戻らないようにする）
      // upsertを使用して確実に更新（レコードが存在しない場合でも作成される）
      try {
        // まずupdateを試みる
        const { error: updateTutorialError } = await supabase
          .from('user_profiles')
          .update({
            tutorial_completed: true,
            tutorial_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select('id, user_id, selected_instrument_id');
        
        if (updateTutorialError) {
          // カラムが存在しない場合は無視
          if (updateTutorialError.code === '42703' || updateTutorialError.message?.includes('column') || updateTutorialError.message?.includes('does not exist')) {
            logger.debug('tutorial_completedカラムが存在しないため、スキップします。');
          } else if (updateTutorialError.code === 'PGRST116' || updateTutorialError.code === 'PGRST205') {
            // レコードが存在しない場合はupsertを試みる
            logger.debug('レコードが存在しないため、upsertを試みます。');
            const { error: upsertError } = await supabase
              .from('user_profiles')
              .upsert({
                user_id: user.id,
                selected_instrument_id: selectedInstrumentId,
                tutorial_completed: true,
                tutorial_completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' })
              .select('id, user_id, selected_instrument_id');
            
            if (upsertError) {
              // カラムが存在しない場合は警告を出してスキップ（エラーではない）
              if (upsertError.code === '42703' || upsertError.message?.includes('column') || upsertError.message?.includes('does not exist')) {
                logger.debug('tutorial_completedカラムが存在しないため、スキップします。');
              } else {
                // その他のエラーは適切に処理する
                logger.error('チュートリアル完了状態のupsertに失敗しました。', { upsertError });
                // エラーは無視（チュートリアル完了状態の更新失敗は致命的ではない）
              }
            } else {
              logger.debug('✅ チュートリアル完了状態をupsertで更新しました');
            }
          } else {
            // その他のエラーは適切に処理する
            logger.error('チュートリアル完了状態の更新に失敗しました。', { updateTutorialError });
            // エラーは無視（チュートリアル完了状態の更新失敗は致命的ではない）
          }
        } else {
          logger.debug('✅ チュートリアル完了状態を更新しました');
        }
      } catch (tutorialErr) {
        // エラーを適切に処理する
        logger.error('チュートリアル完了状態の更新中にエラーが発生しました。', { tutorialErr });
        // エラーは無視（チュートリアル完了状態の更新失敗は致命的ではない）
      }
      
      // ストレージイベントを発火して、useAuthAdvancedが楽器選択状態を検出できるようにする
      if (typeof window !== 'undefined') {
        try {
          const userKey = withUser(STORAGE_KEYS.selectedInstrument, user.id);
          await storageManager.set(userKey, selectedInstrumentId);
          emitStorageEvent(userKey, selectedInstrumentId);
          
          // グローバルキャッシュも更新
          (globalThis as any).__last_selected_instrument_id = selectedInstrumentId;
        } catch (storageError) {
          // グローバルキャッシュのみ更新（フォールバック）
          (globalThis as any).__last_selected_instrument_id = selectedInstrumentId;
        }
      }
      
      // 認証状態を強制的に更新（楽器選択状態を反映）
      // fetchUserProfileを呼び出して認証状態を更新
      logger.debug('認証状態を更新中...');
      const updatedUser = await fetchUserProfile();
      logger.debug('認証状態更新完了:', { 
        hasInstrument: !!updatedUser?.selected_instrument_id,
        tutorialCompleted: updatedUser?.tutorial_completed 
      });
      
      // 遷移直前にloadingをfalseにする（メッセージ表示を防ぐため）
      setLoading(false);
      
      // カレンダー画面に遷移
      router.replace('/(tabs)/index');

    } catch (error) {
      Alert.alert('エラー', '楽器の保存に失敗しました');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {currentInstrumentId && currentInstrumentId !== '' ? '楽器変更' : '楽器選択'}
        </Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.instrumentGrid}>
          {instruments.map((instrument) => (
            <TouchableOpacity
              key={instrument.id}
              style={[
                styles.instrumentItem,
                {
                  backgroundColor: selectedInstrumentId === instrument.id ? currentTheme.primary : currentTheme.surface,
                  borderColor: selectedInstrumentId === instrument.id ? currentTheme.primary : currentTheme.secondary,
                  borderWidth: selectedInstrumentId === instrument.id ? 3 : 2,
                }
              ]}
              onPress={() => handleInstrumentSelection(instrument.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.instrumentEmoji, { color: selectedInstrumentId === instrument.id ? '#FFFFFF' : currentTheme.text }]}
              >
                {instrument.emoji}
              </Text>
              <Text
                style={[styles.instrumentName, { color: selectedInstrumentId === instrument.id ? '#FFFFFF' : currentTheme.text }]}
              >
                {instrument.name}
              </Text>
              <Text
                style={[styles.instrumentNameEn, { color: selectedInstrumentId === instrument.id ? '#FFFFFF' : currentTheme.textSecondary }]}
              >
                {instrument.nameEn}
              </Text>
              {selectedInstrumentId === instrument.id && (
                <View style={styles.checkmarkContainer}>
                  <CheckCircle size={24} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        {/* その他楽器選択時の楽器名入力欄 */}
        {selectedInstrumentId === '550e8400-e29b-41d4-a716-446655440016' && (
          <View style={styles.customInstrumentSection}>
            <Text style={[styles.customInstrumentLabel, { color: currentTheme.text }]}>
              楽器名を入力してください
            </Text>
            <TextInput
              style={[
                styles.customInstrumentInput,
                {
                  backgroundColor: currentTheme.surface,
                  borderColor: currentTheme.secondary,
                  color: currentTheme.text,
                }
              ]}
              value={customInstrumentName}
              onChangeText={setCustomInstrumentName}
              placeholder="例: ウクレレ、マンドリン、etc..."
              placeholderTextColor={currentTheme.textSecondary}
              maxLength={50}
              nativeID="custom-instrument-name-input"
              accessibilityLabel="楽器名"
            />
          </View>
        )}
        {selectedInstrumentId ? (
          <View style={styles.completionSection}>
            {/* 初回選択時は常にボタンを表示、楽器変更時は異なる楽器の場合のみ表示 */}
            {(!currentInstrumentId || currentInstrumentId === '' || selectedInstrumentId !== currentInstrumentId) ? (
              <TouchableOpacity
                style={[styles.completionButton, { backgroundColor: currentTheme.primary }]}
                onPress={handleSaveInstrument}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.completionButtonText, { marginLeft: 8 }]}>保存中...</Text>
                  </View>
                ) : (
                  <Text style={styles.completionButtonText}>
                    {currentInstrumentId && currentInstrumentId !== '' ? '楽器を変更' : '楽器選択を保存'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
            {/* 楽器変更時に同じ楽器が選択されている場合のメッセージ */}
            {/* 保存処理中は表示しない（loading中は表示しない） */}
            {!loading && currentInstrumentId && currentInstrumentId !== '' && selectedInstrumentId === currentInstrumentId ? (
              <View style={styles.sameInstrumentMessage}>
                <Text style={[styles.sameInstrumentText, { color: currentTheme.textSecondary }]}>
                  現在選択されている楽器と同じです
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  instrumentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: -5,
  },
  instrumentItem: {
    width: '23%',
    minHeight: 100,
    borderRadius: 16,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
    elevation: 3,
  },
  instrumentEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  instrumentName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 17,
  },
  instrumentNameEn: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 12,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 2,
  },
  customInstrumentSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  customInstrumentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  customInstrumentInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  completionSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  completionButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    minWidth: 200,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
    elevation: 8,
  },
  completionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sameInstrumentMessage: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginTop: 12,
  },
  sameInstrumentText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
