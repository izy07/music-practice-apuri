/**
 * プライバシー設定画面
 * - 個人情報保護法に基づく設定項目
 * - 個人情報保護管理者の連絡先
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Shield, FileText, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import InstrumentHeader from '@/components/InstrumentHeader';
import { safeGoBack } from '@/lib/navigationUtils';
import { createShadowStyle } from '@/lib/shadowStyles';
import { supabase } from '@/lib/supabase';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import logger from '@/lib/logger';
import { getActiveInstrumentIds } from '@/lib/subscriptionLimits';
import { instrumentService } from '@/services/instrumentService';
import { useScrollToTopOnFocus } from '@/hooks/useScrollToTopOnFocus';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const { signOut, user } = useAuthAdvanced();
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeInstrumentIds, setActiveInstrumentIds] = useState<string[]>([]);
  const [isDeletingInstrument, setIsDeletingInstrument] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnFocus(scrollRef);

  const goBack = () => {
    safeGoBack(router, '/(tabs)/settings', true); // 確実にsettings画面に戻る
  };

  const handlePrivacyPolicy = () => {
    // タブ内のプライバシーポリシー画面に遷移（戻るボタンで確実に戻れるように）
    router.push('/(tabs)/privacy-policy');
  };

  const handleTermsOfService = () => {
    router.push('/(tabs)/terms-of-service');
  };

  // 使用中の楽器IDリストを取得
  React.useEffect(() => {
    const loadActiveInstruments = async () => {
      if (!user?.id) {
        console.log('[PrivacySettings] User ID not available');
        return;
      }
      try {
        console.log('[PrivacySettings] Loading active instruments for user:', user.id);
        const activeIds = await getActiveInstrumentIds(user.id);
        console.log('[PrivacySettings] Active instrument IDs loaded:', activeIds);
        setActiveInstrumentIds(activeIds);
      } catch (error) {
        console.error('[PrivacySettings] Failed to load active instruments:', error);
        logger.error('使用中楽器IDの取得に失敗しました:', error);
      }
    };
    loadActiveInstruments();
  }, [user?.id]);

  const handleDeleteInstrumentData = useCallback((instrumentId: string) => {
    console.log('[PrivacySettings] handleDeleteInstrumentData called:', instrumentId, user?.id);
    logger.info('[PrivacySettings] 楽器データ削除ボタンが押されました:', { instrumentId, userId: user?.id });
    
    if (!user?.id) {
      Alert.alert('エラー', 'ユーザー情報が取得できませんでした。');
      return;
    }
    
    // 楽器名を取得（デフォルト楽器リストから）
    const defaultInstruments = instrumentService.getDefaultInstruments();
    const instrument = defaultInstruments.find(i => i.id === instrumentId);
    const instrumentName = instrument?.name || '楽器';
    
    console.log('[PrivacySettings] Instrument name:', instrumentName);

    // Web環境ではconfirmを使用
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      const message = `「${instrumentName}」のすべてのデータを削除しますか？\n\nこの操作は取り消すことができません。\n\n削除されるデータ:\n• 録音データ\n• 練習記録\n• 目標\n• マイライブラリ\n• イベント`;
      const confirmed = window.confirm(message);
      if (confirmed) {
        console.log('[PrivacySettings] User confirmed deletion');
        logger.info('[PrivacySettings] 楽器データ削除の確認が完了しました。削除処理を開始します:', { instrumentId });
        performInstrumentDataDeletion(instrumentId);
      } else {
        console.log('[PrivacySettings] User cancelled deletion');
        logger.info('[PrivacySettings] 楽器データ削除がキャンセルされました:', { instrumentId });
      }
      return;
    }

    // ネイティブ環境ではAlertを使用
    Alert.alert(
      '楽器データの削除',
      `「${instrumentName}」のすべてのデータを削除しますか？\n\nこの操作は取り消すことができません。\n\n削除されるデータ:\n• 録音データ\n• 練習記録\n• 目標\n• マイライブラリ\n• イベント`,
      [
        { 
          text: 'キャンセル', 
          style: 'cancel',
          onPress: () => {
            logger.info('[PrivacySettings] 楽器データ削除がキャンセルされました:', { instrumentId });
          }
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            logger.info('[PrivacySettings] 楽器データ削除の確認が完了しました。削除処理を開始します:', { instrumentId });
            performInstrumentDataDeletion(instrumentId);
          }
        }
      ]
    );
  }, [user?.id]);

  const performInstrumentDataDeletion = async (instrumentId: string) => {
    if (!user?.id) {
      logger.warn('[PrivacySettings] ユーザーIDが存在しません');
      Alert.alert('エラー', 'ユーザー情報が取得できませんでした。');
      return;
    }
    if (isDeletingInstrument === instrumentId) {
      logger.debug('[PrivacySettings] 既に削除処理が実行中です');
      return;
    }

    setIsDeletingInstrument(instrumentId);

    try {
      logger.info('[PrivacySettings] 楽器データ削除処理を開始:', { instrumentId, userId: user.id });

      /**
       * 重要（根本対応）:
       * - 個別削除では instrument_id = 対象楽器 のみ削除する
       * - instrument_id が null の「レガシー/未紐付け」データは、複数楽器があると他楽器分まで消える危険があるため削除しない
       *   ただし、使用中楽器が1つしかない場合は、その1つに紐付く可能性が高いため null も削除対象に含める
       */
      const shouldIncludeLegacyNull = activeInstrumentIds.length === 1 && activeInstrumentIds[0] === instrumentId;

      const tableNames = ['recordings', 'goals', 'my_songs', 'practice_sessions', 'events'] as const;
      const results: Array<{ table: typeof tableNames[number]; error: any | null }> = [];

      const isIgnorableDeleteError = (error: any): boolean => {
        const code = error?.code;
        const message = error?.message || '';
        // テーブル未作成/存在しない、または行が見つからない系はスキップして続行
        if (code === 'PGRST205' || code === 'PGRST116') return true;
        // カラム未作成（環境差分）もスキップして続行
        if (typeof message === 'string' && message.toLowerCase().includes('column') && message.toLowerCase().includes('does not exist')) return true;
        return false;
      };

      const deleteByTable = async (table: typeof tableNames[number]) => {
        try {
          logger.debug(`[PrivacySettings] ${table}の削除処理を開始:`, {
            table,
            instrumentId,
            userId: user.id,
            shouldIncludeLegacyNull
          });

          // 削除前にカウントを取得
          let beforeCount = 0;
          try {
            const { count: instrumentCount } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('instrument_id', instrumentId);
            
            beforeCount = instrumentCount || 0;
            logger.debug(`[PrivacySettings] ${table}の削除前カウント（instrument_id指定）:`, beforeCount);

            if (shouldIncludeLegacyNull) {
              const { count: nullCount } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .is('instrument_id', null);
              const nullCountValue = nullCount || 0;
              beforeCount += nullCountValue;
              logger.debug(`[PrivacySettings] ${table}の削除前カウント（null）:`, nullCountValue);
            }
          } catch (countError) {
            logger.warn(`[PrivacySettings] ${table}の削除前カウント取得エラー（無視）:`, countError);
          }

          // 1. 指定楽器IDのデータを削除（削除された行を取得して確認）
          const { data: deletedData1, error: deleteError1 } = await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id)
            .eq('instrument_id', instrumentId)
            .select();
          
          if (deleteError1 && !isIgnorableDeleteError(deleteError1)) {
            logger.error(`[PrivacySettings] ${table}の削除エラー（instrument_id指定）:`, {
              error: deleteError1,
              table,
              instrumentId,
              userId: user.id,
              errorCode: deleteError1.code,
              errorMessage: deleteError1.message
            });
            results.push({ table, error: deleteError1 });
            return;
          }

          const deletedCount1 = deletedData1?.length || 0;
          logger.debug(`[PrivacySettings] ${table}の削除（instrument_id指定）完了:`, {
            deletedCount: deletedCount1,
            table,
            instrumentId
          });

          // 2. レガシーデータ（null）も削除する場合
          let deletedCount2 = 0;
          if (shouldIncludeLegacyNull) {
            const { data: deletedData2, error: deleteError2 } = await supabase
              .from(table)
              .delete()
              .eq('user_id', user.id)
              .is('instrument_id', null)
              .select();
            
            if (deleteError2 && !isIgnorableDeleteError(deleteError2)) {
              logger.error(`[PrivacySettings] ${table}の削除エラー（null指定）:`, {
                error: deleteError2,
                table,
                instrumentId,
                userId: user.id,
                errorCode: deleteError2.code,
                errorMessage: deleteError2.message
              });
              results.push({ table, error: deleteError2 });
              return;
            }

            deletedCount2 = deletedData2?.length || 0;
            logger.debug(`[PrivacySettings] ${table}の削除（null指定）完了:`, {
              deletedCount: deletedCount2,
              table,
              instrumentId
            });
          }

          // 削除後にカウントを再取得して確認
          let afterCount = 0;
          try {
            const { count: instrumentCount } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('instrument_id', instrumentId);
            
            afterCount = instrumentCount || 0;

            if (shouldIncludeLegacyNull) {
              const { count: nullCount } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .is('instrument_id', null);
              afterCount += (nullCount || 0);
            }
          } catch (countError) {
            logger.warn(`[PrivacySettings] ${table}の削除後カウント取得エラー（無視）:`, countError);
          }

          const totalDeleted = deletedCount1 + deletedCount2;
          const verifiedDeleted = beforeCount - afterCount;

          // 削除結果をログ出力
          logger.info(`[PrivacySettings] ${table}の削除成功:`, {
            table,
            deletedCount: totalDeleted,
            verifiedDeleted,
            beforeCount,
            afterCount,
            instrumentId,
            shouldIncludeLegacyNull,
            deletedByInstrumentId: deletedCount1,
            deletedByNull: deletedCount2
          });

          // 削除が実行されなかった場合の警告
          if (beforeCount > 0 && totalDeleted === 0) {
            const errorMsg = `${table}テーブルに${beforeCount}件のデータが存在しますが、削除が実行されませんでした。RLSポリシーまたはデータベースの設定を確認してください。`;
            logger.error(`[PrivacySettings] ${table}の削除が実行されませんでした:`, {
              table,
              beforeCount,
              instrumentId,
              userId: user.id,
              deletedCount1,
              deletedCount2,
              afterCount,
              verifiedDeleted
            });
            results.push({ 
              table, 
              error: { 
                code: 'DELETE_FAILED', 
                message: errorMsg 
              } 
            });
            return;
          }

          // 削除が部分的にしか実行されなかった場合の警告
          if (beforeCount > 0 && verifiedDeleted < beforeCount) {
            logger.warn(`[PrivacySettings] ${table}の削除が部分的にしか実行されませんでした:`, {
              table,
              beforeCount,
              afterCount,
              verifiedDeleted,
              totalDeleted,
              instrumentId,
              userId: user.id
            });
          }

          results.push({ table, error: null });
        } catch (err) {
          logger.error(`[PrivacySettings] ${table}の削除例外:`, {
            error: err,
            table,
            instrumentId,
            userId: user.id,
            errorMessage: err instanceof Error ? err.message : String(err),
            errorStack: err instanceof Error ? err.stack : undefined
          });
          results.push({ 
            table, 
            error: err instanceof Error 
              ? { code: 'UNKNOWN_ERROR', message: err.message } 
              : { code: 'UNKNOWN_ERROR', message: '不明なエラー' }
          });
        }
      };

      // 直列で削除（問題が起きたテーブルをログで特定しやすくする）
      logger.info('[PrivacySettings] 楽器データ削除処理を開始（テーブル単位）:', {
        tableCount: tableNames.length,
        tables: tableNames,
        instrumentId,
        userId: user.id
      });
      
      for (const table of tableNames) {
        logger.debug(`[PrivacySettings] ${table}の削除処理を開始します`);
        // eslint-disable-next-line no-await-in-loop
        await deleteByTable(table);
        logger.debug(`[PrivacySettings] ${table}の削除処理が完了しました`);
      }
      
      logger.info('[PrivacySettings] すべてのテーブルの削除処理が完了しました');

      const hardErrors = results.filter((r) => r.error);
      if (hardErrors.length > 0) {
        const errorMessages = hardErrors
          .map((r) => `${r.table}: ${r.error?.message || '不明なエラー'}`)
          .join('\n');
        logger.error('[PrivacySettings] 楽器データ削除エラー:', {
          errors: hardErrors,
          instrumentId,
          userId: user.id
        });
        Alert.alert(
          'エラー',
          `楽器データの削除中にエラーが発生しました。\n\n${errorMessages}\n\nお問い合わせ先までご連絡ください。`,
          [{ text: 'OK' }]
        );
        setIsDeletingInstrument(null);
        return;
      }

      // 削除結果のサマリーをログ出力
      const successCount = results.filter(r => !r.error).length;
      logger.info('[PrivacySettings] 楽器データの削除が完了:', { 
        instrumentId,
        shouldIncludeLegacyNull,
        successTables: successCount,
        totalTables: tableNames.length,
        results: results.map(r => ({ table: r.table, success: !r.error }))
      });

      // 削除された楽器IDをリストから即座に除外（UI更新を早める）
      setActiveInstrumentIds(prevIds => prevIds.filter(id => id !== instrumentId));

      // データベースの変更が完全に反映されるまで少し待ってから、使用中楽器リストを再取得
      await new Promise(resolve => setTimeout(resolve, 500));
      const activeIds = await getActiveInstrumentIds(user.id);
      setActiveInstrumentIds(activeIds);

      // 楽器名を取得（デフォルト楽器リストから）
      const defaultInstruments = instrumentService.getDefaultInstruments();
      const instrument = defaultInstruments.find(i => i.id === instrumentId);
      const instrumentName = instrument?.name || '楽器';

      Alert.alert(
        '削除完了',
        `「${instrumentName}」のデータを削除しました。`,
        [{ text: 'OK' }]
      );
    } catch (error: unknown) {
      logger.error('[PrivacySettings] 楽器データ削除例外:', {
        error,
        instrumentId,
        userId: user.id,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      Alert.alert(
        'エラー',
        `楽器データの削除中にエラーが発生しました。\n\n${error instanceof Error ? error.message : '不明なエラー'}\n\nお問い合わせ先までご連絡ください。`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeletingInstrument(null);
    }
  };

  const handleContactPrivacyManager = () => {
    const email = 'app.gakki@gmail.com';
    const subject = '個人情報に関するお問い合わせ';
    const body = '個人情報に関するお問い合わせ内容をこちらにご記入ください。';
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('エラー', 'メールアプリが利用できません');
      }
    });
  };


  const handleDeleteAccount = () => {
    logger.info('[PrivacySettings] アカウント削除ボタンが押されました');
    
    // Web環境ではconfirmを使用
    if (typeof window !== 'undefined' && window.confirm) {
      const firstConfirm = window.confirm(
        'アカウントを削除すると、すべてのデータが永久に削除されます。\n\nこの操作は取り消せません。本当に削除しますか？'
      );
      
      if (!firstConfirm) {
        logger.info('[PrivacySettings] 1回目の確認でキャンセルされました');
        return;
      }
      
      const secondConfirm = window.confirm(
        '最終確認\n\nアカウントを削除すると、以下のデータがすべて永久に削除されます：\n\n• プロフィール情報\n• 練習記録\n• 目標設定\n• 録音データ\n• その他すべてのデータ\n\nこの操作は取り消せません。本当に削除しますか？'
      );
      
      if (!secondConfirm) {
        logger.info('[PrivacySettings] 2回目の確認でキャンセルされました');
        return;
      }
      
      logger.info('[PrivacySettings] 2回の確認が完了、削除処理を開始');
      performAccountDeletion();
      return;
    }
    
    // ネイティブ環境ではAlertを使用
    // 1回目の確認
    Alert.alert(
      'アカウント削除の確認',
      'アカウントを削除すると、すべてのデータが永久に削除されます。\n\nこの操作は取り消せません。本当に削除しますか？',
      [
        { 
          text: 'キャンセル', 
          style: 'cancel',
          onPress: () => {
            logger.info('[PrivacySettings] 1回目の確認でキャンセルされました');
          }
        },
        { 
          text: '削除する', 
          style: 'destructive',
          onPress: () => {
            logger.info('[PrivacySettings] 1回目の確認で削除が選択されました');
            // 2回目の確認
            Alert.alert(
              '最終確認',
              'アカウントを削除すると、以下のデータがすべて永久に削除されます：\n\n• プロフィール情報\n• 練習記録\n• 目標設定\n• 録音データ\n• その他すべてのデータ\n\nこの操作は取り消せません。本当に削除しますか？',
              [
                { 
                  text: 'キャンセル', 
                  style: 'cancel',
                  onPress: () => {
                    logger.info('[PrivacySettings] 2回目の確認でキャンセルされました');
                  }
                },
                { 
                  text: 'はい、削除します', 
                  style: 'destructive',
                  onPress: () => {
                    logger.info('[PrivacySettings] 2回目の確認で削除が選択されました、削除処理を開始');
                    performAccountDeletion();
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      logger.info('[PrivacySettings] アカウント削除処理を開始');
      
      // データベース関数を呼び出してユーザーデータを削除
      const { error: deleteError } = await supabase.rpc('delete_user_account');
      
      if (deleteError) {
        logger.error('[PrivacySettings] アカウント削除エラー:', deleteError);
        Alert.alert(
          'エラー',
          'アカウント削除中にエラーが発生しました。\n\nお問い合わせ先までご連絡ください。',
          [
            { text: 'OK', onPress: () => handleContactPrivacyManager() }
          ]
        );
        setIsDeleting(false);
        return;
      }
      
      logger.info('[PrivacySettings] ユーザーデータの削除が完了');
      
      // ログアウト処理
      await signOut();
      
      // 成功メッセージを表示（ログアウト後は表示されない可能性があるため、先に表示）
      Alert.alert(
        'アカウント削除完了',
        'アカウントとすべてのデータが削除されました。\n\nご利用ありがとうございました。',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // ログアウト後は自動的に認証画面に遷移する
            }
          }
        ]
      );
      
    } catch (error: unknown) {
      logger.error('[PrivacySettings] アカウント削除例外:', error);
      Alert.alert(
        'エラー',
        'アカウント削除中にエラーが発生しました。\n\nお問い合わせ先までご連絡ください。',
        [
          { text: 'OK', onPress: () => handleContactPrivacyManager() }
        ]
      );
      setIsDeleting(false);
    }
  };

  if (!currentTheme) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} >
        <Text>テーマの読み込み中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.6}
        >
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>プライバシー設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 法的情報 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>法的情報</Text>
          
          <TouchableOpacity
            style={[styles.linkButton, { borderColor: currentTheme.secondary }]}
            onPress={handleTermsOfService}
          >
            <FileText size={20} color={currentTheme.primary} />
            <View style={styles.linkButtonContent}>
              <Text style={[styles.linkButtonTitle, { color: currentTheme.text }]}>利用規約</Text>
              <Text style={[styles.linkButtonDescription, { color: currentTheme.textSecondary }]}>
                サービス利用に関する規約
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkButton, { borderColor: currentTheme.secondary }]}
            onPress={handlePrivacyPolicy}
          >
            <Shield size={20} color={currentTheme.primary} />
            <View style={styles.linkButtonContent}>
              <Text style={[styles.linkButtonTitle, { color: currentTheme.text }]}>プライバシーポリシー</Text>
              <Text style={[styles.linkButtonDescription, { color: currentTheme.textSecondary }]}>
                個人情報の取り扱いについて
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* お問い合わせ */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>お問い合わせ</Text>
          <Text style={[styles.sectionDescription, { color: currentTheme.textSecondary }]}>
            プライバシーや個人情報に関するご質問・ご要望は、こちらからお問い合わせください。
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentTheme.primary }]}
            onPress={handleContactPrivacyManager}
          >
            <Mail size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>お問い合わせ</Text>
          </TouchableOpacity>
        </View>

        {/* データの管理 */}
        <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>データの管理</Text>
          
          {/* 楽器データの削除 */}
          {activeInstrumentIds.length > 0 ? (
            <View style={styles.instrumentDataSection}>
              <Text style={[styles.instrumentDataTitle, { color: currentTheme.text }]}>
                楽器データの削除
              </Text>
              <Text style={[styles.sectionDescription, { color: currentTheme.textSecondary, marginBottom: 12 }]}>
                使用中の楽器のデータを個別に削除できます。
              </Text>
              {activeInstrumentIds.map((instrumentId) => {
                const defaultInstruments = instrumentService.getDefaultInstruments();
                const instrument = defaultInstruments.find(i => i.id === instrumentId);
                const instrumentName = instrument?.name || `楽器 (${instrumentId.slice(0, 8)}...)`;
                const instrumentEmoji = instrument?.emoji || '🎵';
                const isDeletingThis = isDeletingInstrument === instrumentId;
                const isDisabled = isDeletingThis || isDeleting;

                return (
                  <TouchableOpacity
                    key={instrumentId}
                    style={[
                      styles.instrumentDeleteButton,
                      {
                        backgroundColor: isDeletingThis ? '#999999' : '#FF9800',
                        opacity: isDisabled ? 0.6 : 1,
                        borderColor: currentTheme.secondary,
                      }
                    ]}
                    onPress={() => {
                      handleDeleteInstrumentData(instrumentId);
                    }}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isDeletingThis ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.instrumentDeleteButtonText}>削除中...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.instrumentDeleteEmoji}>{instrumentEmoji}</Text>
                        <Text style={styles.instrumentDeleteButtonText}>
                          {instrumentName}のデータを削除
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <View style={styles.accountDeleteSection}>
            <TouchableOpacity
              style={[
                styles.actionButton, 
                { 
                  backgroundColor: isDeleting ? '#999999' : '#F44336',
                  opacity: isDeleting ? 0.6 : 1
                }
              ]}
              onPress={() => {
                logger.info('[PrivacySettings] アカウント削除ボタンがタップされました');
                handleDeleteAccount();
              }}
              disabled={isDeleting}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isDeleting ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>削除中...</Text>
                </>
              ) : (
                <>
                  <Trash2 size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>アカウントを削除</Text>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={[styles.sectionDescription, { color: currentTheme.textSecondary, marginTop: 12 }]}>
              アカウントを削除すると、すべてのデータが永久に削除されます。個人情報の開示・訂正・削除に関するご要望は、お問い合わせ先までご連絡ください。
            </Text>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minHeight: 44, // タッチしやすい最小サイズ
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  linkButtonContent: {
    marginLeft: 12,
    flex: 1,
  },
  linkButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  linkButtonDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  instrumentDataSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
    zIndex: 1,
  },
  instrumentDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instrumentDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 44,
  },
  instrumentDeleteEmoji: {
    fontSize: 18,
  },
  instrumentDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  accountDeleteSection: {
    marginTop: 0,
  },
});
