import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { CheckCircle, ArrowLeft } from 'lucide-react-native';
import { getEffectiveInstrumentId } from '@/lib/instrumentUtils';
import logger from '@/lib/logger';
import { createShadowStyle } from '@/lib/shadowStyles';
import { useSubscription } from '@/hooks/useSubscription';
import { canSaveDataForInstrument, getActiveInstrumentIds } from '@/lib/subscriptionLimits';
import { safeGoBack, navigateToCalendarScreen } from '@/lib/navigationUtils';

interface Instrument {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
}

export default function InstrumentSelectionScreen() {
  const router = useRouter();
  const { setSelectedInstrument, currentTheme, selectedInstrument, syncStatus } = useInstrumentTheme();
  const { user, fetchUserProfile } = useAuthAdvanced();
  const { entitlement } = useSubscription();

  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [customInstrumentName, setCustomInstrumentName] = useState<string>('');
  const [activeInstrumentIds, setActiveInstrumentIds] = useState<string[]>([]);
  const [canSaveNewInstrument, setCanSaveNewInstrument] = useState<{ canSave: boolean; reason?: string } | null>(null);

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
    // TODO: 将来的に追加予定の楽器: ハープ、シンセサイザー、太鼓、琴
    { id: '550e8400-e29b-41d4-a716-446655440016', name: 'その他', nameEn: 'Other', emoji: '❓' },
  ];

  // 一時的に非表示にする楽器ID（編集追いつかないため）
  const hiddenInstrumentIds = [
    '550e8400-e29b-41d4-a716-446655440009', // クラリネット
    '550e8400-e29b-41d4-a716-446655440007', // サックス
    '550e8400-e29b-41d4-a716-446655440018', // ヴィオラ
    '550e8400-e29b-41d4-a716-446655440008', // ホルン
    '550e8400-e29b-41d4-a716-446655440013', // オーボエ
    '550e8400-e29b-41d4-a716-446655440010', // トロンボーン
    '550e8400-e29b-41d4-a716-446655440015', // コントラバス
    '550e8400-e29b-41d4-a716-446655440012', // ファゴット
  ];

  // 表示する楽器をフィルタリング
  const visibleInstruments = instruments.filter(instrument => !hiddenInstrumentIds.includes(instrument.id));

  // 現在の楽器IDを計算（useMemoで重複計算を防止）
  const currentInstrumentId = useMemo(() => {
    return getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id) || '';
  }, [selectedInstrument, user?.selected_instrument_id]);

  // 現在の楽器をContextから取得（単一のデータソース）
  useEffect(() => {
    setSelectedInstrumentId(currentInstrumentId);
  }, [currentInstrumentId]);

  // 使用中の楽器IDリストを取得
  useEffect(() => {
    const loadActiveInstruments = async () => {
      if (!user?.id) return;
      try {
        const activeIds = await getActiveInstrumentIds(user.id);
        setActiveInstrumentIds(activeIds);
      } catch (error) {
        logger.error('使用中楽器IDの取得に失敗しました:', error);
      }
    };
    loadActiveInstruments();
  }, [user?.id]);

  const handleInstrumentSelection = async (instrumentId: string) => {
    setSelectedInstrumentId(instrumentId);
    
    // その他以外の楽器を選択した場合はカスタム楽器名をクリア
    if (instrumentId !== '550e8400-e29b-41d4-a716-446655440016') {
      setCustomInstrumentName('');
    }

    // 新しい楽器を選択した場合、保存可能かチェック
    if (user && instrumentId !== currentInstrumentId) {
      const canSaveCheck = await canSaveDataForInstrument(user.id, instrumentId, entitlement);
      setCanSaveNewInstrument(canSaveCheck);
    } else {
      // 既存の楽器を選択した場合は制限なし
      setCanSaveNewInstrument({ canSave: true });
    }
  };

  const handleSaveInstrument = async () => {
    if (!selectedInstrumentId) {
      Alert.alert('エラー', '楽器が選択されていません');
      return;
    }

    // その他楽器選択時の楽器名検証
    if (selectedInstrumentId === '550e8400-e29b-41d4-a716-446655440016' && !customInstrumentName.trim()) {
      Alert.alert('エラー', '楽器名を入力してください');
      return;
    }

    // 現在の楽器と同じ場合は、カレンダー画面に遷移するだけ
    // ただし、新規登録ユーザー（楽器未選択）の場合はこのチェックをスキップ
    if (currentInstrumentId && currentInstrumentId !== '' && selectedInstrumentId === currentInstrumentId) {
      // 既に同じ楽器が選択されている場合は、カレンダー画面に遷移（一元化された関数を使用）
      navigateToCalendarScreen(router, '既に同じ楽器が選択されているため、カレンダー画面に遷移');
      return;
    }

    // フリープランの場合、新しい楽器を追加できるかチェック（楽器数制限）
    if (user && selectedInstrumentId !== currentInstrumentId) {
      const canSaveCheck = await canSaveDataForInstrument(user.id, selectedInstrumentId, entitlement);
      if (!canSaveCheck.canSave) {
        Alert.alert(
          'アップグレードが必要です',
          canSaveCheck.reason || 'Freeプランでは楽器を2個まで記録できます。3個目以降の楽器を追加するには、プレミアムへアップグレードしてください。',
          [
            { text: '了解', style: 'cancel' }
          ]
        );
        return;
      }
    }

    try {
      // ContextのsetSelectedInstrumentを使用（唯一のエントリーポイント）
      await setSelectedInstrument(selectedInstrumentId);
      
      // 楽器の更新が完了するまで少し待つ（Contextの更新を待つ）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 認証状態を更新（user.selected_instrument_idを最新の状態に更新）
      // これにより、_layout.tsxのhasInstrumentSelected()が正しく動作する
      try {
        await fetchUserProfile();
        logger.debug('認証状態を更新しました（楽器選択後）');
      } catch (profileError) {
        logger.warn('認証状態の更新に失敗しましたが、続行します:', profileError);
        // エラーが発生しても続行（楽器は既に保存されている）
      }
      
      // 成功メッセージを表示せず、直接カレンダー画面に遷移
      const instrumentName = instruments.find(i => i.id === selectedInstrumentId)?.name || '楽器';
      logger.debug('楽器変更完了:', { instrumentName, selectedInstrumentId });
      
      // カレンダー画面に遷移（一元化された関数を使用）
      navigateToCalendarScreen(router, `楽器「${instrumentName}」を選択してカレンダー画面に遷移`);
    } catch (error) {
      logger.error('楽器保存エラー:', error);
      Alert.alert('エラー', '楽器の保存に失敗しました');
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => safeGoBack(router, '/(tabs)/settings', true)}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {getEffectiveInstrumentId(selectedInstrument, user?.selected_instrument_id) ? '楽器変更' : '楽器選択'}
        </Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* フリープラン用の楽器数制限メッセージ（既存の楽器がある場合のみ表示） */}
        {!entitlement.isEntitled && user && currentInstrumentId && currentInstrumentId !== '' && activeInstrumentIds.length > 0 && (
          <View style={[styles.freePlanInfoBanner, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}>
            <View style={styles.freePlanInfoContent}>
              <Text style={[styles.freePlanInfoTitle, { color: currentTheme.text }]}>
                ⚠️ Freeプラン：楽器2個まで。
              </Text>
              <Text style={[styles.freePlanInfoSubtitle, { color: currentTheme.textSecondary }]}>
                3個目以降はプレミアムへアップグレード
              </Text>
              {/* 現在使用中の楽器を表示 */}
              {activeInstrumentIds.length > 0 && (
                <View style={[styles.activeInstrumentsContainer, { borderTopColor: currentTheme.secondary + '40' }]}>
                  <Text style={[styles.activeInstrumentsLabel, { color: currentTheme.textSecondary }]}>
                    現在使用中の楽器:
                  </Text>
                  <View style={styles.activeInstrumentsList}>
                    {activeInstrumentIds.map((instrumentId) => {
                      const instrument = instruments.find(i => i.id === instrumentId);
                      if (!instrument) return null;
                      return (
                        <TouchableOpacity
                          key={instrumentId}
                          style={[styles.activeInstrumentItem, { backgroundColor: currentTheme.secondary + '20' }]}
                          onPress={async () => {
                            try {
                              // 楽器を選択してカレンダー画面に遷移
                              await setSelectedInstrument(instrumentId);
                              
                              // 楽器の更新が完了するまで少し待つ
                              await new Promise(resolve => setTimeout(resolve, 100));
                              
                              // 認証状態を更新
                              try {
                                await fetchUserProfile();
                                logger.debug('認証状態を更新しました（使用中楽器選択後）');
                              } catch (profileError) {
                                logger.warn('認証状態の更新に失敗しましたが、続行します:', profileError);
                              }
                              
                              // カレンダー画面に遷移（一元化された関数を使用）
                              navigateToCalendarScreen(router, `使用中楽器「${instrument.name}」を選択してカレンダー画面に遷移`);
                            } catch (error) {
                              logger.error('使用中楽器選択エラー:', error);
                              Alert.alert('エラー', '楽器の選択に失敗しました');
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.activeInstrumentEmoji}>{instrument.emoji}</Text>
                          <Text style={[styles.activeInstrumentName, { color: currentTheme.text }]}>
                            {instrument.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.instrumentGrid}>
          {visibleInstruments.map((instrument) => (
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
            {(() => {
              const isSameInstrument = currentInstrumentId && currentInstrumentId !== '' && selectedInstrumentId === currentInstrumentId;
              const isLoading = syncStatus === 'syncing';
              const isNewInstrument = selectedInstrumentId !== currentInstrumentId;
              const isDisabled = isLoading || (isNewInstrument && canSaveNewInstrument !== null && !canSaveNewInstrument.canSave);

              return (
                <>
                  {/* 制限情報の表示（新しい楽器を選択した場合のみ） */}
                  {!entitlement.isEntitled && isNewInstrument && canSaveNewInstrument && !canSaveNewInstrument.canSave && (
                    <View style={[styles.limitInfoContainer, { backgroundColor: currentTheme.surface, borderColor: '#FF4444', marginBottom: 12 }]}>
                      <Text style={[styles.limitInfoText, { color: currentTheme.text }]}>
                        上限に達しています
                      </Text>
                      <Text style={[styles.limitInfoSubText, { color: currentTheme.textSecondary }]}>
                        {canSaveNewInstrument.reason || 'Freeプランでは楽器を2個まで使用できます。プレミアムで無制限に使用できます。'}
                      </Text>
                    </View>
                  )}

              <TouchableOpacity
                    style={[
                      styles.completionButton, 
                      { 
                        backgroundColor: isDisabled ? currentTheme.textSecondary : currentTheme.primary,
                        opacity: isDisabled ? 0.6 : 1
                      }
                    ]}
                onPress={handleSaveInstrument}
                    disabled={isDisabled}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.completionButtonText, { marginLeft: 8 }]}>保存中...</Text>
                  </View>
                ) : (
                  <Text style={styles.completionButtonText}>
                    {isSameInstrument ? 'カレンダー画面に戻る' : (currentInstrumentId && currentInstrumentId !== '' ? '楽器を変更' : '楽器選択を保存')}
                  </Text>
                )}
              </TouchableOpacity>
                </>
              );
            })()}
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
  freePlanInfoBanner: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }),
    elevation: 3,
  },
  freePlanInfoContent: {
    width: '100%',
  },
  freePlanInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  freePlanInfoSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  activeInstrumentsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  activeInstrumentsLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  activeInstrumentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeInstrumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  activeInstrumentEmoji: {
    fontSize: 16,
  },
  activeInstrumentName: {
    fontSize: 12,
    fontWeight: '500',
  },
  freePlanInfoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  freePlanInfoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  freePlanInfoText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
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
  limitInfoContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
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
