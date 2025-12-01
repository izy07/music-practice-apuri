import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { CheckCircle, ArrowLeft } from 'lucide-react-native';
import { ErrorHandler } from '@/lib/errorHandler';
import { SuccessMessages } from '@/lib/errorMessages';
import logger from '@/lib/logger';
import { createShadowStyle } from '@/lib/shadowStyles';
import { storageManager, emitStorageEvent } from '@/lib/storageManager';
import { withUser, STORAGE_KEYS } from '@/lib/storageKeys';

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
    { id: '550e8400-e29b-41d4-a716-446655440006', name: '打楽器', nameEn: 'Drums', emoji: '🥁' },
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

  // 現在の楽器を取得
  useEffect(() => {
    if (selectedInstrument && selectedInstrument !== '') {
      setCurrentInstrumentId(selectedInstrument);
      // 楽器変更の場合、現在の楽器を選択状態にする
      setSelectedInstrumentId(selectedInstrument);
      // その他楽器の場合は楽器名も取得
      if (selectedInstrument === '550e8400-e29b-41d4-a716-446655440016') {
        fetchCustomInstrumentName();
      }
    } else {
      // 新規ユーザーの場合、楽器IDをクリア
      setCurrentInstrumentId('');
      setSelectedInstrumentId('');
    }
  }, [selectedInstrument]);

  const fetchCustomInstrumentName = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('custom_instrument_name')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        return;
      }
      
      if (data?.custom_instrument_name) {
        setCustomInstrumentName(data.custom_instrument_name);
      }
    } catch (error) {
      // カスタム楽器名取得エラーは無視
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
      ErrorHandler.handle(new Error('楽器が選択されていません'), 'instrument_selection');
      return;
    }

    if (!user?.id) {
      ErrorHandler.handle(new Error('ユーザー情報が取得できません'), 'instrument_selection');
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
        ErrorHandler.handle(fetchError, 'profile_fetch');
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
          // custom_instrument_nameカラムはマイグレーション（20250123000001_add_custom_instrument_name.sql）で追加される必要があります
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

          // 400エラーの詳細をログに出力
          if (error && error.status === 400) {
            logger.error('user_profiles更新エラー（400）:', {
              error,
              updateData,
              userId: user.id,
              errorMessage: error.message,
              errorCode: error.code,
            });
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
              .select('id, user_id, display_name, selected_instrument_id, practice_level, total_practice_minutes, created_at, updated_at');
            
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
                // 楽器リストから楽器情報を取得
                const instrument = instruments.find(inst => inst.id === selectedInstrumentId);
                if (instrument) {
                  // 楽器をデータベースに作成（すべての楽器の色情報を含む）
                  const defaultColors: Record<string, { primary: string; secondary: string; accent: string }> = {
                    '550e8400-e29b-41d4-a716-446655440001': { primary: '#1A1A1A', secondary: '#FFFFFF', accent: '#D4AF37' }, // ピアノ
                    '550e8400-e29b-41d4-a716-446655440002': { primary: '#654321', secondary: '#DEB887', accent: '#8B4513' }, // ギター
                    '550e8400-e29b-41d4-a716-446655440003': { primary: '#A0522D', secondary: '#CD853F', accent: '#8B4513' }, // バイオリン
                    '550e8400-e29b-41d4-a716-446655440004': { primary: '#C0C0C0', secondary: '#E6E6FA', accent: '#A9A9A9' }, // フルート
                    '550e8400-e29b-41d4-a716-446655440005': { primary: '#B8860B', secondary: '#DAA520', accent: '#8B4513' }, // トランペット
                    '550e8400-e29b-41d4-a716-446655440006': { primary: '#000000', secondary: '#696969', accent: '#000000' }, // 打楽器
                    '550e8400-e29b-41d4-a716-446655440007': { primary: '#4B0082', secondary: '#9370DB', accent: '#2E0854' }, // サックス
                    '550e8400-e29b-41d4-a716-446655440008': { primary: '#8B4513', secondary: '#F4A460', accent: '#654321' }, // ホルン
                    '550e8400-e29b-41d4-a716-446655440009': { primary: '#000000', secondary: '#2F2F2F', accent: '#1A1A1A' }, // クラリネット
                    '550e8400-e29b-41d4-a716-446655440010': { primary: '#C0C0C0', secondary: '#E6E6FA', accent: '#A9A9A9' }, // トロンボーン
                    '550e8400-e29b-41d4-a716-446655440011': { primary: '#DC143C', secondary: '#FF69B4', accent: '#8B0000' }, // チェロ
                    '550e8400-e29b-41d4-a716-446655440012': { primary: '#A0522D', secondary: '#DEB887', accent: '#8B4513' }, // ファゴット
                    '550e8400-e29b-41d4-a716-446655440013': { primary: '#DAA520', secondary: '#F0E68C', accent: '#B8860B' }, // オーボエ
                    '550e8400-e29b-41d4-a716-446655440015': { primary: '#2F4F4F', secondary: '#708090', accent: '#000000' }, // コントラバス
                    '550e8400-e29b-41d4-a716-446655440018': { primary: '#7A3D1F', secondary: '#A0522D', accent: '#5C2E12' }, // ヴィオラ
                  };
                  
                  const colors = defaultColors[instrument.id] || { primary: '#A0522D', secondary: '#CD853F', accent: '#8B4513' };
                  
                  const { error: createError } = await supabase
                    .from('instruments')
                    .upsert({
                      id: instrument.id,
                      name: instrument.name,
                      name_en: instrument.nameEn,
                      color_primary: colors.primary,
                      color_secondary: colors.secondary,
                      color_accent: colors.accent,
                    }, {
                      onConflict: 'id'
                    });
                  
                  if (createError) {
                    logger.warn('楽器の作成に失敗しましたが、続行します。', { createError });
                  } else {
                    logger.debug('楽器を作成しました。再試行します。', { selectedInstrumentId });
                  }
                }
              } catch (createErr) {
                logger.warn('楽器作成中にエラーが発生しましたが、続行します。', { createErr });
              }
            }
            
            // リトライ（楽器作成後に再試行）
            retryCount++;
            if (retryCount < maxRetries) {
              // 少し待ってから再試行（楽器作成の反映を待つ）
              await new Promise<void>((resolve) => setTimeout(resolve, 500));
              // 最新のプロフィールを再取得
              const { data: refreshedProfile } = await supabase
                .from('user_profiles')
                .select('id, user_id, display_name, selected_instrument_id, practice_level, total_practice_minutes, created_at, updated_at')
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
                .select('id, user_id, display_name, selected_instrument_id, practice_level, total_practice_minutes, created_at, updated_at')
                .eq('user_id', user.id)
                .maybeSingle();
              currentProfile = refreshedProfile;
              continue;
            }
          }
          // その他のエラーまたはリトライ上限に達した場合
          ErrorHandler.handle(error, 'instrument_save');
          setLoading(false);
          return;
        } else {
          // 成功した場合はループを抜ける
          break;
        }
      }

      await setSelectedInstrument(selectedInstrumentId);
      
      // テーマ更新を確実にするため、少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await fetchUserProfile();

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
      // カラムが存在しない場合はエラーを無視
      try {
        const { error: updateTutorialError } = await supabase
          .from('user_profiles')
          .update({
            tutorial_completed: true,
            tutorial_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select('id, user_id, display_name, selected_instrument_id, practice_level, total_practice_minutes, created_at, updated_at');
        
        if (updateTutorialError) {
          // カラムが存在しない場合は無視
          if (updateTutorialError.code === '42703' || updateTutorialError.message?.includes('column') || updateTutorialError.message?.includes('does not exist')) {
            logger.debug('tutorial_completedカラムが存在しないため、スキップします。');
          } else {
            logger.warn('チュートリアル完了状態の更新に失敗しましたが、続行します。', { updateTutorialError });
          }
        } else {
          logger.debug('✅ チュートリアル完了状態を更新しました');
        }
      } catch (tutorialErr) {
        logger.warn('チュートリアル完了状態の更新中にエラーが発生しましたが、続行します。', { tutorialErr });
      }
      
      // 認証状態を強制的に更新（楽器選択状態を反映）
      // fetchUserProfileを呼び出して認証状態を更新
      await fetchUserProfile();
      
      // ストレージイベントを発火して、useAuthSimpleが楽器選択状態を検出できるようにする
      if (typeof window !== 'undefined') {
        try {
          const userKey = withUser(STORAGE_KEYS.selectedInstrument, user.id);
          await storageManager.set(userKey, selectedInstrumentId);
          emitStorageEvent(userKey, selectedInstrumentId);
          
          // グローバルキャッシュも更新
          (globalThis as any).__last_selected_instrument_id = selectedInstrumentId;
        } catch (storageError) {
          // storageManagerのエラーは無視（オフライン環境の可能性）
          logger.warn('storageManagerの更新に失敗しました（続行）:', storageError);
          // グローバルキャッシュのみ更新
          (globalThis as any).__last_selected_instrument_id = selectedInstrumentId;
        }
      }
      
      // 少し待ってから認証状態の更新を待つ
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 遷移直前にloadingをfalseにする（メッセージ表示を防ぐため）
      setLoading(false);
      
      // Webプラットフォームではアラートが不安定なため、直接遷移
      router.replace('/(tabs)/' as any);

    } catch (error) {
      ErrorHandler.handle(error, 'instrument_save');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} edges={[]}>
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
