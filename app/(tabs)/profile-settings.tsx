import React, { useState, useEffect, Fragment } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Music, Target, Plus, Minus, Edit, Trash2, Award, Users, Clock, MapPin, Camera, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { safeGoBack } from '@/lib/navigationUtils';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import SafeView from '@/components/SafeView';
import * as ImagePicker from 'expo-image-picker';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { getUserProfile, upsertUserProfile, updateAvatarUrl, getCurrentUser, deleteBreakPeriod, deletePastOrganization, deleteAward, deletePerformance } from '@/repositories/userRepository';
import type { UserProfile } from '@/types/models';
import { supabase } from '@/lib/supabase';
import PastOrgEditorModal from '@/components/profile-settings/PastOrgEditorModal';
import AwardEditorModal from '@/components/profile-settings/AwardEditorModal';
import PerformanceEditorModal from '@/components/profile-settings/PerformanceEditorModal';
import AgeSelectorModal from '@/components/profile-settings/AgeSelectorModal';
import { styles } from '@/lib/tabs/profile-settings/styles';
// DateTimePickerは環境によって未導入の場合があるため動的ロード
let DateTimePicker: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUserProfile } = useAuthAdvanced();
  const { currentTheme } = useInstrumentTheme();
  
  // 全てのuseStateフックを最初に呼び出す
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('ユーザー');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [currentOrganizations, setCurrentOrganizations] = useState<Array<{id: string, name: string}>>([
    { id: '1', name: '' },
  ]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [musicStartAge, setMusicStartAge] = useState('');
  const [musicExperienceYears, setMusicExperienceYears] = useState(0);
  const [currentAge, setCurrentAge] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthDay, setBirthDay] = useState<string>('');
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [birthdayError, setBirthdayError] = useState<string>('');
  const [breakPeriods, setBreakPeriods] = useState<Array<{id: string, startDate: string, endDate: string, reason: string}>>([]);
  const [pastOrganizations, setPastOrganizations] = useState<Array<{id: string, name: string, role: string, startDate: string, endDate: string}>>([]);
  const [awards, setAwards] = useState<Array<{id: string, title: string, organization: string, date: string, description: string}>>([]);
  const [performances, setPerformances] = useState<Array<{id: string, title: string, venue: string, date: string, role: string, description: string}>>([]);
  const [showBreakPeriodModal, setShowBreakPeriodModal] = useState(false);
  const [showPastOrganizationModal, setShowPastOrganizationModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showAgeSelectorModal, setShowAgeSelectorModal] = useState(false);
  const [editingBreakPeriod, setEditingBreakPeriod] = useState<any>(null);
  const [editingPastOrganization, setEditingPastOrganization] = useState<any>(null);
  const [editingAward, setEditingAward] = useState<any>(null);
  const [editingPerformance, setEditingPerformance] = useState<any>(null);

  // 経歴・実績 追加入力フォーム
  const [pastOrgs, setPastOrgs] = useState<Array<{ id?: string; name: string; startYm: string; endYm: string }>>([
    { id: undefined, name: '', startYm: '', endYm: '' },
  ]);
  const [awardsEdit, setAwardsEdit] = useState<Array<{ id?: string; title: string; dateYm: string; result: string }>>([
    { id: undefined, title: '', dateYm: '', result: '' },
  ]);
  const [performancesEdit, setPerformancesEdit] = useState<Array<{ id?: string; title: string }>>([
    { id: undefined, title: '' },
  ]);
  const [pastOrgForm, setPastOrgForm] = useState({ name: '', role: '' }); // 旧フォーム互換（既存保存のため残置）
  const [awardForm, setAwardForm] = useState({ title: '', organization: '', date: '', description: '' });

  // 過去の所属団体 追加用フルスクリーンモーダル
  const [showPastOrgEditor, setShowPastOrgEditor] = useState(false);
  const [perfForm, setPerfForm] = useState({ title: '', venue: '', date: '', role: '', description: '' });

  // 受賞追加用モーダル
  const [showAwardEditor, setShowAwardEditor] = useState(false);
  const [draftAward, setDraftAward] = useState('');
  // 演奏経験追加用モーダル
  const [showPerformanceEditor, setShowPerformanceEditor] = useState(false);
  const [draftPerformance, setDraftPerformance] = useState('');

  // getCurrentUser関数を先に定義
  const loadCurrentUser = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        
        // ユーザープロフィールを取得
        const profileResult = await getUserProfile(user.id);
        
        // 新規登録時のニックネームを取得（プロフィール > user_metadata > メールアドレスの順）
        // プロフィール取得エラー時でも、user_metadataから取得できるようにする
        const profile = profileResult.data;
        const resolvedNickname = profile?.display_name?.trim() || 
                                  user.user_metadata?.display_name?.trim() || 
                                  user.user_metadata?.name?.trim() || 
                                  user.email?.split('@')[0] || 
                                  'ユーザー';
        
        if (profileResult.error) {
          logger.error('プロフィール取得エラー:', profileResult.error);
          // エラー時でも、新規登録時のニックネームを表示
          setDisplayName(resolvedNickname);
          setNickname(resolvedNickname);
          return;
        }
        if (profile) {
          setDisplayName(resolvedNickname);
          setNickname(resolvedNickname); // 新規登録時のニックネームを表示
          setAvatarUrl(profile.avatar_url || null);
          setCurrentAge(profile.current_age ? profile.current_age.toString() : '');
          setMusicStartAge(profile.music_start_age ? profile.music_start_age.toString() : '');
          setMusicExperienceYears(profile.music_experience_years || 0);
          const bday = profile.birthday ? new Date(profile.birthday) : null;
          setBirthday(bday);
          if (bday) {
            setBirthYear(String(bday.getFullYear()));
            setBirthMonth(String(bday.getMonth() + 1).padStart(2, '0'));
            setBirthDay(String(bday.getDate()).padStart(2, '0'));
          }
          
          // 所属団体を読み込み（カンマ区切りから配列に変換）
          if (profile.current_organization) {
            const orgs = profile.current_organization.split(',').filter((name: string) => name.trim() !== '');
            setCurrentOrganizations(
              orgs.length > 0 
                ? orgs.map((name: string, index: number) => ({ id: (index + 1).toString(), name: name.trim() }))
                : [
                    { id: '1', name: '' },
                  ]
            );
          }
        } else {
          // プロフィールが存在しない場合でも、新規登録時のニックネームを表示
          setDisplayName(resolvedNickname);
          setNickname(resolvedNickname);
        }
      }
    } catch (error) {
      // Error getting current user
    } finally {
      setLoading(false);
    }
  };

  // 認証チェック（副作用の無限ループ防止のため依存から isAuthenticated を外す）
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
  }, [isLoading]);

  // 現在のユーザー情報を取得（依存から isAuthenticated を外す）
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return; // 認証されていない場合は早期リターン
    loadCurrentUser();
  }, [isLoading]);

  // 誕生日または音楽開始年齢が変更された時の処理
  useEffect(() => {
    if (birthday) {
      const age = calculateAgeFromBirthday(birthday);
      setCurrentAge(age.toString());
    }
  }, [birthday]);

  useEffect(() => {
    if (musicStartAge && currentAge) {
      const years = calculateMusicExperienceYears(musicStartAge, currentAge);
      setMusicExperienceYears(years);
    }
  }, [musicStartAge, currentAge]);

  // 認証中または認証されていない場合は何も表示しない
  if (isLoading || !isAuthenticated) {
    return null;
  }

  // 楽器・練習レベル設定はこの画面では扱わない（主要機能で管理）

  // 演奏歴年数を自動計算
  const calculateMusicExperienceYears = (startAge: string, currentAge: string) => {
    if (!startAge || !currentAge) return 0;
    const startAgeNum = parseInt(startAge);
    const currentAgeNum = parseInt(currentAge);
    return Math.max(0, currentAgeNum - startAgeNum);
  };

  // 誕生日から年齢を計算
  const calculateAgeFromBirthday = (birthdayInput: Date | string | null) => {
    if (!birthdayInput) return 0;
    const birthday = birthdayInput instanceof Date ? birthdayInput : new Date(birthdayInput);
    const today = new Date();
    
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    
    return Math.max(0, age);
  };

  // 誕生日入力の妥当性チェック
  const validateBirthdayFields = (yStr: string, mStr: string, dStr: string) => {
    if (!yStr && !mStr && !dStr) {
      setBirthdayError('');
      return false;
    }
    const y = parseInt(yStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    const d = parseInt(dStr || '0', 10);
    if (!yStr || yStr.length !== 4) { setBirthdayError('年は4桁で入力してください'); return false; }
    if (m < 1 || m > 12) { setBirthdayError('月は1〜12で入力してください'); return false; }
    const maxDay = new Date(y, m, 0).getDate();
    if (d < 1 || d > maxDay) { setBirthdayError(`日付は1〜${maxDay}で入力してください`); return false; }
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) { setBirthdayError('存在しない日付です'); return false; }
    setBirthdayError('');
    setBirthday(dt);
    return true;
  };

  // 経歴データ読み込み
  const loadCareerData = async () => {
    if (!currentUser) return;
    
    try {
      // ブランク期間
      const { data: breakData } = await supabase
        .from('user_break_periods')
        .select('*')
        .eq('user_id', currentUser.id);
      if (breakData) setBreakPeriods(breakData);

      // 過去の所属団体
      const { data: orgData } = await supabase
        .from('user_past_organizations')
        .select('*')
        .eq('user_id', currentUser.id);
      if (orgData) setPastOrganizations(orgData);

      // 受賞履歴
      const { data: awardData } = await supabase
        .from('user_awards')
        .select('*')
        .eq('user_id', currentUser.id);
      if (awardData) setAwards(awardData);

      // 演奏経験
      const { data: performanceData } = await supabase
        .from('user_performances')
        .select('*')
        .eq('user_id', currentUser.id);
      if (performanceData) setPerformances(performanceData);
            } catch (error) {
          // Career data load error
        }
  };

  // 画像アップロード機能
  const pickImage = async () => {
    try {
      logger.debug('pickImage関数が開始されました');

      // カメラとギャラリーの権限をリクエスト
      logger.debug('メディアライブラリの権限をリクエスト中...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      logger.debug('メディアライブラリの権限ステータス:', status);
      if (status !== 'granted') {
        logger.debug('メディアライブラリの権限が拒否されました');
        Alert.alert('権限が必要です', '画像を選択するためにライブラリアクセス権限が必要です');
        return;
      }

      logger.debug('画像ライブラリを起動中...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      logger.debug('画像ライブラリの結果:', result);
      
      if (!result.canceled && result.assets[0]) {
        logger.debug('画像が選択されました:', result.assets[0].uri);
        await uploadImage(result.assets[0].uri);
      } else {
        logger.debug('画像選択がキャンセルされました');
      }
    } catch (error) {
      ErrorHandler.handle(error, '画像選択', true);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  const takePhoto = async () => {
    try {
      logger.debug('takePhoto関数が開始されました');

      logger.debug('カメラの権限をリクエスト中...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      logger.debug('カメラの権限ステータス:', status);
      if (status !== 'granted') {
        logger.debug('カメラの権限が拒否されました');
        Alert.alert('権限が必要です', '写真を撮影するためにカメラ権限が必要です');
        return;
      }

      logger.debug('カメラを起動中...');
      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      // Webやデバイス未対応などでカメラが使えない場合はギャラリーにフォールバック
      if ((result as { type?: string; canceled?: boolean })?.type === 'cancel' || (result as { canceled?: boolean })?.canceled) {
        logger.debug('カメラが利用できないかキャンセル。ギャラリーにフォールバック');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      logger.debug('カメラの結果:', result);
      
      if (!result.canceled && result.assets[0]) {
        logger.debug('写真が撮影されました:', result.assets[0].uri);
        await uploadImage(result.assets[0].uri);
      } else {
        logger.debug('写真撮影がキャンセルされました');
      }
    } catch (error) {
      ErrorHandler.handle(error, '写真撮影', true);
      Alert.alert('エラー', '写真の撮影に失敗しました');
    }
  };

  const uploadImage = async (imageUri: string) => {
    if (!currentUser) {
      logger.warn('uploadImage: ユーザーが認証されていません');
      return;
    }

    try {
      logger.debug('uploadImage開始:', imageUri);
      setLoading(true);

      // 画像をBase64に変換
      logger.debug('画像をBase64に変換中...');
      const response = await fetch(imageUri);
      const blob = await response.blob();
      logger.debug('画像のblobサイズ:', blob.size);

      // MIME/サイズ検証
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      const ext = (imageUri.split('.').pop() || '').toLowerCase();
      const extAllowed = ['jpg', 'jpeg', 'png', 'webp'];
      const mimeOk = blob.type ? allowed.includes(blob.type) : extAllowed.includes(ext);
      const sizeOk = blob.size <= 5 * 1024 * 1024; // 5MB
      if (!mimeOk || !sizeOk) {
        const reason = !mimeOk ? '対応形式は JPG/PNG/WEBP のみです' : '5MB 以下の画像をご使用ください';
        Alert.alert('画像をアップロードできません', reason);
        setLoading(false);
        return;
      }
      
      // Supabase Storageにアップロード
      const fileExt = ext || 'jpg';
      const fileName = `${currentUser.id}/avatar.${fileExt}`;
      logger.debug('アップロードファイル名:', fileName);
      
      logger.debug('Supabase Storageにアップロード中...');
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        logger.error('アップロードエラー:', error);
        throw error;
      }
      logger.info('アップロード成功:', data);

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      logger.debug('公開URL:', publicUrl);

      // プロフィールにアバターURLを保存
      logger.debug('プロフィールにアバターURLを保存中...');
      const result = await updateAvatarUrl(currentUser.id, publicUrl);

      if (result.error) {
        logger.error('プロフィール更新エラー:', result.error);
        throw result.error;
      }
      logger.info('プロフィール更新成功');

      setAvatarUrl(publicUrl);
      Alert.alert('成功', 'プロフィール画像を更新しました');
    } catch (error) {
      logger.error('画像アップロードエラー:', error);
      Alert.alert('エラー', '画像のアップロードに失敗しました');
    } finally {
      setLoading(false);
      logger.debug('uploadImage完了');
    }
  };

  const showImagePicker = () => {
    logger.debug('showImagePicker関数が呼び出されました');
    logger.debug('ユーザー認証状態:', !!currentUser);
    logger.debug('現在のアバターURL:', avatarUrl);
    
    Alert.alert(
      'プロフィール画像を選択',
      '画像の選択方法を選んでください',
      [
        { 
          text: 'キャンセル', 
          style: 'cancel',
          onPress: () => logger.debug('画像選択がキャンセルされました')
        },
        { 
          text: 'カメラで撮影', 
          onPress: () => {
            logger.debug('カメラ撮影が選択されました');
            takePhoto();
          }
        },
        { 
          text: 'ギャラリーから選択', 
          onPress: () => {
            logger.debug('ギャラリー選択が選択されました');
            pickImage();
          }
        },
      ]
    );
  };

  // 削除関数
  const handleDeleteBreakPeriod = async (id: string) => {
    try {
      const result = await deleteBreakPeriod(id);
      if (result.error) {
        ErrorHandler.handle(result.error, '休止期間の削除', false);
        return;
      }
      setBreakPeriods(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      ErrorHandler.handle(error, '休止期間の削除', false);
    }
  };

  const handleDeletePastOrganization = async (id: string) => {
    try {
      const result = await deletePastOrganization(id);
      if (result.error) {
        ErrorHandler.handle(result.error, '過去の所属団体の削除', false);
        return;
      }
      setPastOrganizations(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      ErrorHandler.handle(error, '過去の所属団体の削除', false);
    }
  };

  const handleDeleteAward = async (id: string) => {
    try {
      const result = await deleteAward(id);
      if (result.error) {
        ErrorHandler.handle(result.error, '受賞の削除', false);
        return;
      }
      setAwards(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      ErrorHandler.handle(error, '受賞の削除', false);
    }
  };

  // 追加保存関数（経歴・実績）
  const addPastOrganization = async () => {
    if (!currentUser) return;
    if (!pastOrgForm.name.trim() || !pastOrgForm.role.trim()) {
      Alert.alert('エラー', '所属名と役割を入力してください');
      return;
    }
    try {
      await supabase
        .from('user_past_organizations')
        .insert({
          user_id: currentUser.id,
          name: pastOrgForm.name.trim(),
          role: pastOrgForm.role.trim(),
          startDate: null,
          endDate: null,
        });
      setPastOrgForm({ name: '', role: '' });
      await loadCareerData();
    } catch (e) {
      Alert.alert('エラー', '過去の所属団体の保存に失敗しました');
    }
  };
  // 可変行の追加/削除
  const addPastOrgRow = () => setPastOrgs((rows) => [...rows, { name: '', startYm: '', endYm: '' }]);
  const removePastOrgRow = (index: number) => setPastOrgs((rows) => rows.filter((_, i) => i !== index));
  const updatePastOrgRow = (index: number, key: 'name' | 'startYm' | 'endYm', value: string) => {
    setPastOrgs((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  };

  const addAwardRow = () => {
    setDraftAward('');
    setShowAwardEditor(true);
  };
  const removeAwardRow = (index: number) => setAwardsEdit((rows) => rows.filter((_, i) => i !== index));
  const updateAwardRow = (index: number, key: 'title' | 'dateYm' | 'result', value: string) => {
    setAwardsEdit((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  };

  const addPerformanceRow = () => {
    setDraftPerformance('');
    setShowPerformanceEditor(true);
  };
  const removePerformanceRow = (index: number) => setPerformancesEdit((rows) => rows.filter((_, i) => i !== index));
  const updatePerformanceRow = (index: number, value: string) => {
    setPerformancesEdit((rows) => rows.map((r, i) => (i === index ? { title: value } : r)));
  };


  const addAward = async () => {
    if (!currentUser) return;
    if (!awardForm.title.trim()) {
      Alert.alert('エラー', '受賞タイトルを入力してください');
      return;
    }
    try {
      await supabase
        .from('user_awards')
        .insert({
          user_id: currentUser.id,
          title: awardForm.title.trim(),
          organization: awardForm.organization.trim() || null,
          date: awardForm.date || null,
          description: awardForm.description.trim() || null,
        });
      setAwardForm({ title: '', organization: '', date: '', description: '' });
      await loadCareerData();
    } catch (e) {
      Alert.alert('エラー', '受賞履歴の保存に失敗しました');
    }
  };

  const addPerformance = async () => {
    if (!currentUser) return;
    if (!perfForm.title.trim()) {
      Alert.alert('エラー', '演奏のタイトルを入力してください');
      return;
    }
    try {
      await supabase
        .from('user_performances')
        .insert({
          user_id: currentUser.id,
          title: perfForm.title.trim(),
          venue: perfForm.venue.trim() || null,
          date: perfForm.date || null,
          role: perfForm.role.trim() || null,
          description: perfForm.description.trim() || null,
        });
      setPerfForm({ title: '', venue: '', date: '', role: '', description: '' });
      await loadCareerData();
    } catch (e) {
      Alert.alert('エラー', '演奏経験の保存に失敗しました');
    }
  };

  const handleDeletePerformance = async (id: string) => {
    try {
      const result = await deletePerformance(id);
      if (result.error) {
        ErrorHandler.handle(result.error, '演奏経験の削除', false);
        return;
      }
      setPerformances(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      ErrorHandler.handle(error, '演奏経験の削除', false);
    }
  };

  const saveProfile = async () => {
    if (!currentUser) {
      Alert.alert('エラー', 'ユーザー情報がありません');
      return;
    }

    // バリデーション（ニックネーム）
    if (!nickname.trim()) {
      Alert.alert('エラー', 'ニックネームを入力してください');
      return;
    }

    try {
      setLoading(true);
      logger.debug('プロフィール保存開始:', { userId: currentUser.id, nickname: nickname.trim() });
      
      // 所属団体をカンマ区切りの文字列として保存
      const organizationsString = currentOrganizations
        .filter(org => org.name.trim() !== '')
        .map(org => org.name.trim())
        .join(',');

      // 基本カラムのみを含める（存在しないカラムを除外）
      const upsertRow: Partial<UserProfile> = {
        user_id: currentUser.id,
        display_name: nickname.trim(),
        updated_at: new Date().toISOString(),
      };
      
      // オプショナルカラム（存在する場合のみ追加）
      // これらのカラムはマイグレーション（20250120000003_add_age_fields.sql）で追加される必要があります
      // カラムが存在しない場合のエラーを避けるため、一旦コメントアウト
      // マイグレーションを実行した後、以下のコメントを解除してください
      // if (currentAge) upsertRow.current_age = parseInt(currentAge);
      // if (musicStartAge) upsertRow.music_start_age = parseInt(musicStartAge);
      // if (musicExperienceYears) upsertRow.music_experience_years = musicExperienceYears;
      // if (birthday) upsertRow.birthday = birthday.toISOString().split('T')[0];
      // if (organizationsString) upsertRow.organization = organizationsString;

      logger.debug('保存データ:', upsertRow);

      // user_id一意制約を使ってUPSERT
      const result = await upsertUserProfile(upsertRow);

      if (result.error) {
        logger.error('Supabase upsert エラー:', result.error);
        throw result.error;
      }

      logger.info('保存成功:', result.data);

      // 認証プロフィール更新（他画面の表示名を即時反映）
      await fetchUserProfile();
      Alert.alert('保存されました', '基本情報を保存しました');
    } catch (error) {
      logger.error('プロフィール保存エラー:', error);
      Alert.alert('エラー', `プロフィールの保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    safeGoBack('/(tabs)/settings', true); // 強制的にsettings画面に戻る
  };

  // 現在の年齢を計算する関数（削除）
  // const calculateCurrentAge = (startAge: string, experienceYears: number) => {
  //   if (!startAge || experienceYears === 0) return 0;
  //   const startAgeNum = parseInt(startAge);
  //   return startAgeNum + experienceYears;
  // };

  // 誕生日選択のハンドラー
  const handleBirthdayChange = (event: any, selectedDate?: Date) => {
    setShowBirthdayPicker(false);
    if (selectedDate) {
      setBirthday(selectedDate);
      setBirthYear(String(selectedDate.getFullYear()));
      setBirthMonth(String(selectedDate.getMonth() + 1).padStart(2, '0'));
      setBirthDay(String(selectedDate.getDate()).padStart(2, '0'));
    }
  };

  // 誕生日を文字列として表示する関数
  const formatBirthday = (date: Date | null) => {
    if (!date) return '誕生日を選択';
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleAgeSelection = (age: number) => {
    setMusicStartAge(age.toString());
    setShowAgeSelectorModal(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.surface }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: currentTheme.background }]}
          onPress={goBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={currentTheme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>プロフィール設定</Text>
          <Text style={[styles.headerSubtitle, { color: currentTheme.textSecondary }]}>あなたの音楽プロフィール</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* プロフィール概要カード */}
        <View style={[styles.profileOverviewCard, { backgroundColor: currentTheme.surface }]}>
          <TouchableOpacity 
            style={[styles.avatarContainer, { backgroundColor: `${currentTheme.primary}20` }]}
            onPress={() => {
              logger.debug('🖼️ アバター画像がタップされました');
              showImagePicker();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="プロフィール画像を変更"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <User size={32} color={currentTheme.primary} />
            )}
            <View style={[styles.cameraIcon, { backgroundColor: currentTheme.primary }]}>
              <Camera size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: currentTheme.text }]}>
              {nickname || 'ユーザー'}
            </Text>
            <Text style={[styles.profileEmail, { color: currentTheme.textSecondary }]}>
              {currentUser?.email || 'email@example.com'}
            </Text>
            <Text style={[styles.profileOrganization, { color: currentTheme.primary }]}>
              {currentOrganizations.filter(org => org.name.trim()).map(org => org.name).join(', ') || '所属団体未設定'}
            </Text>
          </View>
        </View>

        {/* 基本情報セクション */}
        <View style={[styles.infoSection, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionTitleContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: currentTheme.primary }]}>
              <User size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>基本情報</Text>
          </View>
          
          <View style={styles.formGroup}>
            <View style={styles.formRow}>
              <View style={styles.formItem}>
                <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>ニックネーム</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: currentTheme.background,
                    borderColor: currentTheme.secondary,
                    color: currentTheme.text
                  }]}
                  placeholder="ニックネームを入力"
                  placeholderTextColor={currentTheme.textSecondary}
                  value={nickname}
                  onChangeText={setNickname}
                  maxLength={20}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formItem}>
                <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>現在の所属団体</Text>
                {currentOrganizations.map((org, index) => (
                  <View key={org.id} style={{ marginBottom: index < currentOrganizations.length - 1 ? 12 : 0 }}>
                    <TextInput
                      style={[styles.formInput, { 
                        backgroundColor: currentTheme.background,
                        borderColor: currentTheme.secondary,
                        color: currentTheme.text
                      }]}
                      placeholder={`所属団体 ${index + 1}（部活名、楽団名等）`}
                      placeholderTextColor={currentTheme.textSecondary}
                      value={org.name}
                      onChangeText={(text) => {
                        const updated = [...currentOrganizations];
                        updated[index].name = text;
                        setCurrentOrganizations(updated);
                      }}
                      maxLength={50}
                    />
                  </View>
                ))}
                {currentOrganizations.length < 2 && (
                  <TouchableOpacity
                    style={[styles.addButton, { 
                      backgroundColor: currentTheme.primary,
                      marginTop: 8 
                    }]}
                    onPress={() => {
                      setCurrentOrganizations([
                        ...currentOrganizations,
                        { id: Date.now().toString(), name: '' }
                      ]);
                    }}
                  >
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>追加</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formItem}>
                <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>誕生日</Text>
          <View style={styles.birthdayRow}>
            <TextInput
              style={[styles.dateInputSmall, { 
                backgroundColor: currentTheme.background,
                borderColor: currentTheme.secondary,
                color: currentTheme.text
              }]}
              placeholder="YYYY"
              placeholderTextColor={currentTheme.textSecondary}
              value={birthYear}
              onChangeText={(v) => {
                const nv = v.replace(/[^0-9]/g, '').slice(0, 4);
                setBirthYear(nv);
                if (nv.length === 4 && birthMonth && birthDay) {
                  validateBirthdayFields(nv, birthMonth, birthDay);
                } else {
                  setBirthdayError('');
                }
              }}
              keyboardType="number-pad"
              accessibilityLabel="誕生日 年"
            />
            <Text style={[styles.dateSep, { color: currentTheme.textSecondary }]}>-</Text>
            <TextInput
              style={[styles.dateInputXs, { 
                backgroundColor: currentTheme.background,
                borderColor: currentTheme.secondary,
                color: currentTheme.text
              }]}
              placeholder="MM"
              placeholderTextColor={currentTheme.textSecondary}
              value={birthMonth}
              onChangeText={(v) => {
                let nv = v.replace(/[^0-9]/g, '').slice(0, 2);
                if (nv.length === 2) {
                  const n = Math.min(12, Math.max(1, parseInt(nv, 10)));
                  nv = String(n).padStart(2, '0');
                }
                setBirthMonth(nv);
                if (birthYear && nv && birthDay) {
                  validateBirthdayFields(birthYear, nv, birthDay);
                } else {
                  setBirthdayError('');
                }
              }}
              keyboardType="number-pad"
              accessibilityLabel="誕生日 月"
            />
            <Text style={[styles.dateSep, { color: currentTheme.textSecondary }]}>-</Text>
            <TextInput
              style={[styles.dateInputXs, { 
                backgroundColor: currentTheme.background,
                borderColor: currentTheme.secondary,
                color: currentTheme.text
              }]}
              placeholder="DD"
              placeholderTextColor={currentTheme.textSecondary}
              value={birthDay}
              onChangeText={(v) => {
                let nv = v.replace(/[^0-9]/g, '').slice(0, 2);
                if (nv.length === 2) {
                  const y = parseInt(birthYear || '0', 10);
                  const m = parseInt(birthMonth || '0', 10);
                  const maxDay = y && m ? new Date(y, m, 0).getDate() : 31;
                  const n = Math.min(maxDay, Math.max(1, parseInt(nv, 10)));
                  nv = String(n).padStart(2, '0');
                }
                setBirthDay(nv);
                if (birthYear && birthMonth && nv) {
                  validateBirthdayFields(birthYear, birthMonth, nv);
                } else {
                  setBirthdayError('');
                }
              }}
              keyboardType="number-pad"
              accessibilityLabel="誕生日 日"
            />
          </View>
          {birthdayError ? (
            <Text style={[styles.birthdayErrorText, { color: '#D32F2F' }]}>{birthdayError}</Text>
          ) : (
            <Text style={[styles.helpText, { color: currentTheme.textSecondary }]}> 
              例: 1990-05-15
            </Text>
          )}

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.datePickerButton, { backgroundColor: currentTheme.background, borderColor: currentTheme.secondary }]}
              onPress={() => setShowBirthdayPicker(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="誕生日をカレンダーから選ぶ"
            >
              <Text style={[styles.datePickerButtonText, { color: currentTheme.text }]}>カレンダーから選ぶ</Text>
            </TouchableOpacity>
          )}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formItem}>
                <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>現在の年齢</Text>
                <View style={[styles.experienceDisplayNew, { 
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.secondary
                }]}>
                  <Text style={[styles.experienceTextNew, { color: currentTheme.text }]}>
                    {currentAge ? `${currentAge}歳` : '未設定'}
                  </Text>
                  <Text style={[styles.experienceSubtext, { color: currentTheme.textSecondary }]}>
                    （誕生日から自動計算）
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formItem}>
                <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>音楽開始年齢</Text>
                <TouchableOpacity
                  style={[styles.ageSelectorButton, { 
                    backgroundColor: currentTheme.background,
                    borderColor: currentTheme.secondary
                  }]}
                  onPress={() => setShowAgeSelectorModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.ageSelectorText, { color: musicStartAge ? currentTheme.text : currentTheme.textSecondary }]}>
                    {musicStartAge ? `${musicStartAge}歳から開始` : '何歳から始めましたか？'}
                  </Text>
                  <Text style={[styles.ageSelectorArrow, { color: currentTheme.textSecondary }]}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formItem}>
                <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>演奏歴（年）</Text>
                <View style={[styles.experienceDisplayNew, { 
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.secondary
                }]}>
                  <Text style={[styles.experienceTextNew, { color: currentTheme.text }]}>
                    {musicExperienceYears}年
                  </Text>
                  <Text style={[styles.experienceSubtext, { color: currentTheme.textSecondary }]}>
                    （自動計算）
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButtonNew, { backgroundColor: currentTheme.primary }]}
            onPress={saveProfile}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.saveAllButtonText}>
              {loading ? '保存中...' : '基本情報を保存'}
            </Text>
          </TouchableOpacity>
        </View>


        {/* 経歴・実績セクション */}
        <View style={[styles.infoSection, { backgroundColor: currentTheme.surface }]}>
          <View style={styles.sectionTitleContainer}>
            <View style={[styles.sectionIcon, { backgroundColor: currentTheme.primary }]}>
              <Award size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>経歴・実績</Text>
          </View>
          
          <View style={styles.careerTabs}>
            <TouchableOpacity
              style={[styles.careerTab, { backgroundColor: currentTheme.primary }]}
              onPress={() => setShowPastOrganizationModal(true)}
            >
              <Users size={16} color="#FFFFFF" />
              <Text style={styles.careerTabText}>所属履歴</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.careerTab, { backgroundColor: currentTheme.primary }]}
              onPress={() => setShowAwardModal(true)}
            >
              <Award size={16} color="#FFFFFF" />
              <Text style={styles.careerTabText}>受賞歴</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.careerTab, { backgroundColor: currentTheme.primary }]}
              onPress={() => setShowPerformanceModal(true)}
            >
              <Music size={16} color="#FFFFFF" />
              <Text style={styles.careerTabText}>演奏歴</Text>
            </TouchableOpacity>
          </View>

          {/* ブランク期間は非表示 */}
          {false && (
            <View style={styles.subSection}>
              <View style={styles.subSectionHeader}>
                <Text style={[styles.subSectionTitle, { color: currentTheme.text }]}>ブランク期間</Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: currentTheme.primary }]}
                  onPress={() => {
                    setEditingBreakPeriod(null);
                    setShowBreakPeriodModal(true);
                  }}
                >
                  <Plus size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              {breakPeriods.map((period, index) => (
                <View style={[styles.careerItem, { backgroundColor: currentTheme.background }]}>
                  <View style={styles.careerItemContent}>
                    <Text style={[styles.careerItemTitle, { color: currentTheme.text }]}>
                      {period.startDate} - {period.endDate}
                    </Text>
                    <Text style={[styles.careerItemSubtitle, { color: currentTheme.textSecondary }]}>
                      {period.reason}
                    </Text>
                  </View>
                  <View style={styles.careerItemActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setEditingBreakPeriod(period);
                        setShowBreakPeriodModal(true);
                      }}
                    >
                      <Edit size={16} color={currentTheme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteBreakPeriod(period.id)}
                    >
                      <Trash2 size={16} color={currentTheme.secondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 過去の所属団体 */}
          <View style={styles.subSection}>
            <View style={styles.subSectionHeader}>
              <Text style={[styles.subSectionTitle, { color: currentTheme.text }]}>過去の所属団体</Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: currentTheme.primary }]}
                onPress={() => {
                  const newRow = { id: Date.now().toString(), name: '', startYm: '', endYm: '' };
                  setPastOrgs([...pastOrgs, newRow]);
                }}
              >
                <Plus size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {pastOrgs.map((row, index) => (
                <View key={row.id || `past-org-${index}`} style={[styles.inputRow, { marginBottom: 12 }]}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <TextInput
                    style={[styles.input, { backgroundColor: currentTheme.background, borderColor: currentTheme.secondary, color: currentTheme.text }]}
                    placeholder="例: 〇〇吹奏楽部 2020-04〜2023-03"
                    placeholderTextColor={currentTheme.textSecondary}
                    value={row.name}
                    onChangeText={(text) => {
                      const updated = [...pastOrgs];
                      updated[index].name = text;
                      setPastOrgs(updated);
                    }}
                    multiline
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: '#FF4444', marginLeft: 8 }]} 
                  onPress={() => {
                    const updated = pastOrgs.filter((_, i) => i !== index);
                    setPastOrgs(updated.length > 0 ? updated : [{ id: Date.now().toString(), name: '', startYm: '', endYm: '' }]);
                  }}
                >
                  <Minus size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* 受賞履歴 */}
          <View style={styles.subSection}>
            <View style={styles.subSectionHeader}>
              <Text style={[styles.subSectionTitle, { color: currentTheme.text }]}>受賞履歴・コンクール実績</Text>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: currentTheme.primary }]} 
                onPress={() => {
                  const newRow = { id: Date.now().toString(), title: '', dateYm: '', result: '' };
                  setAwardsEdit([...awardsEdit, newRow]);
                }}
              >
                <Plus size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {awardsEdit.map((row, index) => (
                <View key={row.id || `award-${index}`} style={[styles.inputRow, { marginBottom: 12 }]}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <TextInput
                    style={[styles.input, { backgroundColor: currentTheme.background, borderColor: currentTheme.secondary, color: currentTheme.text }]}
                    placeholder="例: ○○コンクール 金賞 2022-06"
                    placeholderTextColor={currentTheme.textSecondary}
                    value={row.title}
                    onChangeText={(text) => {
                      const updated = [...awardsEdit];
                      updated[index].title = text;
                      setAwardsEdit(updated);
                    }}
                    multiline
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: '#FF4444', marginLeft: 8 }]} 
                  onPress={() => {
                    const updated = awardsEdit.filter((_, i) => i !== index);
                    setAwardsEdit(updated.length > 0 ? updated : [{ id: Date.now().toString(), title: '', dateYm: '', result: '' }]);
                  }}
                >
                  <Minus size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* 主要な演奏経験 */}
          <View style={styles.subSection}>
            <View style={styles.subSectionHeader}>
              <Text style={[styles.subSectionTitle, { color: currentTheme.text }]}>主要な演奏経験・実績</Text>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: currentTheme.primary }]} 
                onPress={() => {
                  const newRow = { id: Date.now().toString(), title: '' };
                  setPerformancesEdit([...performancesEdit, newRow]);
                }}
              >
                <Plus size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {performancesEdit.map((row, index) => (
                <View key={row.id || `performance-${index}`} style={[styles.inputRow, { marginBottom: 12 }]}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <TextInput
                    style={[styles.input, { backgroundColor: currentTheme.background, borderColor: currentTheme.secondary, color: currentTheme.text }]}
                    placeholder="例: 定期演奏会 ソロ 2023-02"
                    placeholderTextColor={currentTheme.textSecondary}
                    value={row.title}
                    onChangeText={(text) => {
                      const updated = [...performancesEdit];
                      updated[index].title = text;
                      setPerformancesEdit(updated);
                    }}
                    multiline
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: '#FF4444', marginLeft: 8 }]} 
                  onPress={() => {
                    const updated = performancesEdit.filter((_, i) => i !== index);
                    setPerformancesEdit(updated.length > 0 ? updated : [{ id: Date.now().toString(), title: '' }]);
                  }}
                >
                  <Minus size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {/* 経歴・実績 保存ボタン（Firebase） */}
          <TouchableOpacity
            style={[styles.saveAllButton, { backgroundColor: currentTheme.primary }]}
            onPress={async () => {
              try {
                const auth = getAuth();
                const uid = auth.currentUser?.uid || currentUser?.id;
                if (!uid) {
                  Alert.alert('エラー', 'ログインが必要です');
                  return;
                }
                await setDoc(doc(db, 'profiles', uid), {
                  pastOrganizationsUi: pastOrgs,
                  awardsUi: awardsEdit,
                  performancesUi: performancesEdit,
                }, { merge: true });
                Alert.alert('保存完了', '経歴・実績を保存しました');
              } catch (e) {
                Alert.alert('エラー', '保存に失敗しました');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.saveAllButtonText}>経歴・実績を保存</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* モーダルコンポーネント */}
      <PastOrgEditorModal
        visible={showPastOrgEditor}
        onClose={() => setShowPastOrgEditor(false)}
        onSave={(name) => {
          setPastOrgs((rows) => [...rows, { name, startYm: '', endYm: '' }]);
        }}
      />
      
      <AwardEditorModal
        visible={showAwardEditor}
        onClose={() => setShowAwardEditor(false)}
        onSave={(title) => {
          setAwardsEdit((rows) => [...rows, { title, dateYm: '', result: '' }]);
        }}
      />
      
      <PerformanceEditorModal
        visible={showPerformanceEditor}
        onClose={() => setShowPerformanceEditor(false)}
        onSave={(title) => {
          setPerformancesEdit((rows) => [...rows, { title }]);
        }}
      />
      
      <AgeSelectorModal
        visible={showAgeSelectorModal}
        selectedAge={musicStartAge}
        onClose={() => setShowAgeSelectorModal(false)}
        onSelect={handleAgeSelection}
      />

      {/* 誕生日選択DateTimePicker - モバイルのみ */}
      {showBirthdayPicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={birthday || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          onChange={handleBirthdayChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </SafeAreaView>
  );
}
