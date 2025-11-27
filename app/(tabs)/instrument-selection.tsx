import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { CheckCircle, ArrowLeft } from 'lucide-react-native';
import { ErrorHandler } from '@/lib/errorHandler';
import { SuccessMessages } from '@/lib/errorMessages';
import logger from '@/lib/logger';

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

      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
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
          
          // その他楽器の場合は楽器名も保存
          if (selectedInstrumentId === '550e8400-e29b-41d4-a716-446655440016') {
            updateData.custom_instrument_name = customInstrumentName.trim();
          }
          
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', user.id);
          error = updateError;
        } else {
          const upsertData: any = {
            user_id: user.id,
            selected_instrument_id: selectedInstrumentId || null,
            updated_at: new Date().toISOString()
          };
          
          // その他楽器の場合は楽器名も保存
          if (selectedInstrumentId === '550e8400-e29b-41d4-a716-446655440016') {
            upsertData.custom_instrument_name = customInstrumentName.trim();
          }
          
          const { error: upsertError } = await supabase
            .from('user_profiles')
            .upsert(upsertData, {
              onConflict: 'user_id'
            });
          error = upsertError;
        }

        // 409エラーの場合はリトライ、それ以外のエラーは即座に処理
        if (error) {
          if (error.code === '23505' || error.code === 'PGRST116' || (error as any).status === 409) {
            // 競合エラーの場合、少し待ってからリトライ
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise<void>((resolve) => setTimeout(resolve, 500 * retryCount));
              // 最新のプロフィールを再取得
              const { data: refreshedProfile } = await supabase
                .from('user_profiles')
                .select('*')
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

      setLoading(false);

      // 成功メッセージを表示してから遷移
      const instrumentName = instruments.find(i => i.id === selectedInstrumentId)?.name || '楽器';
      const isInstrumentChange = currentInstrumentId && currentInstrumentId !== '' && currentInstrumentId !== selectedInstrumentId;
      
      // 楽器変更か楽器選択かを判定してメッセージを変更
      const alertTitle = isInstrumentChange ? '楽器変更完了' : '楽器選択完了';
      const alertMessage = isInstrumentChange 
        ? `楽器を${instrumentName}に変更しました！` 
        : `${instrumentName}が選択されました！`;
      
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
          {instruments.map((instrument) => 
            React.createElement(TouchableOpacity, {
              key: instrument.id,
              style: [
                  styles.instrumentItem,
                  {
                    backgroundColor: selectedInstrumentId === instrument.id ? currentTheme.primary : currentTheme.surface,
                    borderColor: selectedInstrumentId === instrument.id ? currentTheme.primary : currentTheme.secondary,
                    borderWidth: selectedInstrumentId === instrument.id ? 3 : 2,
                  }
                ],
              onPress: () => handleInstrumentSelection(instrument.id),
              activeOpacity: 0.7
            },
              React.createElement(Text, {
                style: [styles.instrumentEmoji, { color: selectedInstrumentId === instrument.id ? '#FFFFFF' : currentTheme.text }]
              }, instrument.emoji),
              React.createElement(Text, {
                style: [styles.instrumentName, { color: selectedInstrumentId === instrument.id ? '#FFFFFF' : currentTheme.text }]
              }, instrument.name),
              React.createElement(Text, {
                style: [styles.instrumentNameEn, { color: selectedInstrumentId === instrument.id ? '#FFFFFF' : currentTheme.textSecondary }]
              }, instrument.nameEn),
              selectedInstrumentId === instrument.id ? 
                React.createElement(View, { style: styles.checkmarkContainer },
                  React.createElement(CheckCircle, { size: 24, color: "#FFFFFF" })
                ) : null
            )
          )}
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
            {currentInstrumentId && currentInstrumentId !== '' && selectedInstrumentId === currentInstrumentId ? (
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
