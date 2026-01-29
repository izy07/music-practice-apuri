import React, { useState, useEffect, Fragment, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Image, Platform, Linking, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Music, Target, Plus, Minus, Edit, Trash2, Award, Users, Clock, MapPin, Camera, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { safeGoBack } from '@/lib/navigationUtils';
import SafeView from '@/components/SafeView';
import * as ImagePicker from 'expo-image-picker';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { getUserProfile, upsertUserProfile, updateAvatarUrl, getCurrentUser, deleteBreakPeriod, deletePastOrganization, deleteAward, deletePerformance, getInstrumentSpecificProfileData, saveInstrumentSpecificProfileData } from '@/repositories/userRepository';
import type { UserProfile } from '@/types/models';
import { supabase } from '@/lib/supabase';
import PastOrgEditorModal from '@/components/profile-settings/PastOrgEditorModal';
import AwardEditorModal from '@/components/profile-settings/AwardEditorModal';
import PerformanceEditorModal from '@/components/profile-settings/PerformanceEditorModal';
import EventCalendar from '@/components/EventCalendar';
import { formatLocalDate } from '@/lib/dateUtils';
import { styles } from '@/lib/tabs/profile-settings/styles';
// DateTimePickerは環境によって未導入の場合があるため動的ロード
type DateTimePickerComponent = React.ComponentType<{
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'calendar' | 'compact';
  onChange: (event: unknown, selectedDate?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}>;
let DateTimePicker: DateTimePickerComponent | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default as DateTimePickerComponent;
} catch {}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchUserProfile, signOut, user } = useAuthAdvanced();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  // 誕生日入力フィールドのref
  const birthYearInputRef = useRef<TextInput>(null);
  const birthMonthInputRef = useRef<TextInput>(null);
  const birthDayInputRef = useRef<TextInput>(null);
  
  // 購入日入力フィールドのref（各楽器ごとに管理）
  const purchaseYearInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const purchaseMonthInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const purchaseDayInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const [breakPeriods, setBreakPeriods] = useState<Array<{id: string, startDate: string, endDate: string, reason: string}>>([]);
  const [pastOrganizations, setPastOrganizations] = useState<Array<{id: string, name: string, role: string, startDate: string, endDate: string}>>([]);
  const [awards, setAwards] = useState<Array<{id: string, title: string, organization: string, date: string, description: string}>>([]);
  const [performances, setPerformances] = useState<Array<{id: string, title: string, venue: string, date: string, role: string, description: string}>>([]);
  // 楽器情報の型定義
  type InstrumentInfo = {
    id: string;
    name: string;
    maker: string;
    model: string;
    purchaseDate: string | null;
    purchaseYear: string;
    purchaseMonth: string;
    purchaseDay: string;
    purchasePrice?: string;
    notes?: string;
  };
  
  const [instrumentTypes, setInstrumentTypes] = useState<Array<InstrumentInfo>>([]);
  const [showInstrumentInfo, setShowInstrumentInfo] = useState(false);
  
  const [showBreakPeriodModal, setShowBreakPeriodModal] = useState(false);
  const [showPastOrganizationModal, setShowPastOrganizationModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
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
          
          // ニックネーム、現在の所属団体、年齢は楽器に関係なく共通データとして読み込む
          setCurrentAge(profile.current_age ? profile.current_age.toString() : '');
          const bday = profile.birthday ? new Date(profile.birthday) : null;
          setBirthday(bday);
          if (bday) {
            setBirthYear(String(bday.getFullYear()));
            setBirthMonth(String(bday.getMonth() + 1).padStart(2, '0'));
            setBirthDay(String(bday.getDate()).padStart(2, '0'));
          }
          
          // 所属団体を読み込み（カンマ区切りから配列に変換）
          // current_organizationまたはorganizationのどちらかを使用
          const organizationValue = profile.current_organization || profile.organization;
          if (organizationValue) {
            const orgs = organizationValue.split(',').filter((name: string) => name.trim() !== '');
            setCurrentOrganizations(
              orgs.length > 0 
                ? orgs.map((name: string, index: number) => ({ id: (index + 1).toString(), name: name.trim() }))
                : [
                    { id: '1', name: '' },
                  ]
            );
          }
          
          // 楽器ごとのデータを読み込む（現在選択されている楽器がある場合のみ）
          if (selectedInstrument) {
            const instrumentDataResult = await getInstrumentSpecificProfileData(user.id, selectedInstrument);
            if (instrumentDataResult.data) {
              const instrumentData = instrumentDataResult.data;
              
              // 楽器ごとのデータを設定
              if (instrumentData.music_start_age !== undefined) {
                setMusicStartAge(instrumentData.music_start_age.toString());
              }
              if (instrumentData.music_experience_years !== undefined) {
                setMusicExperienceYears(instrumentData.music_experience_years);
              }
              // 楽器情報の読み込み（既存データとの互換性維持）
              if (instrumentData.custom_instrument_name) {
                try {
                  // 新しいJSON形式を試行
                  const parsed = JSON.parse(instrumentData.custom_instrument_name);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    // JSON形式のデータ（型安全性のため明示的に型を指定）
                    interface CustomInstrumentItem {
                      id?: string;
                      name?: string;
                      maker?: string;
                      model?: string;
                      purchaseDate?: string | null;
                      purchasePrice?: string;
                      notes?: string;
                    }
                    const instruments = parsed.map((item: CustomInstrumentItem, index: number) => {
                      let purchaseYear = '';
                      let purchaseMonth = '';
                      let purchaseDay = '';
                      if (item.purchaseDate) {
                        const date = new Date(item.purchaseDate);
                        if (!isNaN(date.getTime())) {
                          purchaseYear = String(date.getFullYear());
                          purchaseMonth = String(date.getMonth() + 1).padStart(2, '0');
                          purchaseDay = String(date.getDate()).padStart(2, '0');
                        }
                      }
                      return {
                        id: item.id || (index + 1).toString(),
                        name: item.name || '',
                        maker: item.maker || '',
                        model: item.model || '',
                        purchaseDate: item.purchaseDate || null,
                        purchaseYear,
                        purchaseMonth,
                        purchaseDay,
                        purchasePrice: item.purchasePrice || '',
                        notes: item.notes || '',
                      };
                    });
                    setInstrumentTypes(instruments);
                    setShowInstrumentInfo(true);
                  } else {
                    throw new Error('Invalid JSON format');
                  }
                } catch {
                  // 既存のカンマ区切り文字列形式（後方互換性）
                  const types = instrumentData.custom_instrument_name.split(',').filter((name: string) => name.trim() !== '');
                  if (types.length > 0) {
                    setInstrumentTypes(
                      types.map((name: string, index: number) => ({ 
                        id: (index + 1).toString(), 
                        name: name.trim(),
                        maker: '',
                        model: '',
                        purchaseDate: null,
                        purchaseYear: '',
                        purchaseMonth: '',
                        purchaseDay: '',
                        purchasePrice: '',
                        notes: '',
                      }))
                    );
                    setShowInstrumentInfo(true);
                  }
                }
              }
              if (instrumentData.career_data) {
                const careerData = instrumentData.career_data;
                if (careerData.pastOrganizationsUi && Array.isArray(careerData.pastOrganizationsUi)) {
                  setPastOrgs(careerData.pastOrganizationsUi.length > 0 
                    ? careerData.pastOrganizationsUi 
                    : [{ id: undefined, name: '', startYm: '', endYm: '' }]);
                }
                if (careerData.awardsUi && Array.isArray(careerData.awardsUi)) {
                  setAwardsEdit(careerData.awardsUi.length > 0 
                    ? careerData.awardsUi 
                    : [{ id: undefined, title: '', dateYm: '', result: '' }]);
                }
                if (careerData.performancesUi && Array.isArray(careerData.performancesUi)) {
                  setPerformancesEdit(careerData.performancesUi.length > 0 
                    ? careerData.performancesUi 
                    : [{ id: undefined, title: '' }]);
                }
                // 休止期間も楽器ごとのデータから読み込む（型安全性のため明示的に型を指定）
                interface BreakPeriodItem {
                  id?: string;
                  startDate?: string;
                  endDate?: string;
                  reason?: string;
                }
                if (careerData.breakPeriodsUi && Array.isArray(careerData.breakPeriodsUi)) {
                  setBreakPeriods(careerData.breakPeriodsUi.length > 0 
                    ? careerData.breakPeriodsUi.map((bp: BreakPeriodItem) => ({
                      id: bp.id || Date.now().toString(),
                      startDate: bp.startDate || '',
                      endDate: bp.endDate || '',
                      reason: bp.reason || ''
                    }))
                    : []);
                }
              }
            } else {
              // 楽器ごとのデータが存在しない場合は、既存のデータを読み込む（後方互換性）
              setMusicStartAge(profile.music_start_age ? profile.music_start_age.toString() : '');
              setMusicExperienceYears(profile.music_experience_years || 0);
              const customInstrumentName = (profile as any).custom_instrument_name;
              if (customInstrumentName) {
                const types = customInstrumentName.split(',').filter((name: string) => name.trim() !== '');
                if (types.length > 0) {
                  setInstrumentTypes(
                    types.map((name: string, index: number) => ({ id: (index + 1).toString(), name: name.trim(), maker: '', model: '', purchaseDate: null, purchaseYear: '', purchaseMonth: '', purchaseDay: '', purchasePrice: '', notes: '' }))
                  );
                  setShowInstrumentInfo(true);
                }
              }
              
              // 経歴・実績データを読み込み（Supabaseから）
              const profileWithCareer = profile as { career_data?: {
                pastOrganizationsUi?: Array<{ id?: string; name: string; startYm: string; endYm: string }>;
                awardsUi?: Array<{ id?: string; title: string; dateYm: string; result: string }>;
                performancesUi?: Array<{ id?: string; title: string }>;
                breakPeriodsUi?: Array<{ id?: string; startDate: string; endDate: string; reason: string }>;
              } };
              
              if (profileWithCareer?.career_data) {
                const careerData = profileWithCareer.career_data;
                if (careerData.pastOrganizationsUi && Array.isArray(careerData.pastOrganizationsUi)) {
                  setPastOrgs(careerData.pastOrganizationsUi.length > 0 
                    ? careerData.pastOrganizationsUi 
                    : [{ id: undefined, name: '', startYm: '', endYm: '' }]);
                }
                if (careerData.awardsUi && Array.isArray(careerData.awardsUi)) {
                  setAwardsEdit(careerData.awardsUi.length > 0 
                    ? careerData.awardsUi 
                    : [{ id: undefined, title: '', dateYm: '', result: '' }]);
                }
                if (careerData.performancesUi && Array.isArray(careerData.performancesUi)) {
                  setPerformancesEdit(careerData.performancesUi.length > 0 
                    ? careerData.performancesUi 
                    : [{ id: undefined, title: '' }]);
                }
                // 休止期間も楽器ごとのデータから読み込む（型安全性のため明示的に型を指定）
                interface BreakPeriodItem {
                  id?: string;
                  startDate?: string;
                  endDate?: string;
                  reason?: string;
                }
                if (careerData.breakPeriodsUi && Array.isArray(careerData.breakPeriodsUi)) {
                  setBreakPeriods(careerData.breakPeriodsUi.length > 0 
                    ? careerData.breakPeriodsUi.map((bp: BreakPeriodItem) => ({
                      id: bp.id || Date.now().toString(),
                      startDate: bp.startDate || '',
                      endDate: bp.endDate || '',
                      reason: bp.reason || ''
                    }))
                    : []);
                }
              }
            }
          } else {
            // 楽器が選択されていない場合は、既存のデータを読み込む（後方互換性）
            setMusicStartAge(profile.music_start_age ? profile.music_start_age.toString() : '');
            setMusicExperienceYears(profile.music_experience_years || 0);
            const customInstrumentName = (profile as any).custom_instrument_name;
            if (customInstrumentName) {
              const types = customInstrumentName.split(',').filter((name: string) => name.trim() !== '');
              setInstrumentTypes(
                types.length > 0 
                  ? types.map((name: string, index: number) => ({ id: (index + 1).toString(), name: name.trim() }))
                  : [
                      { id: '1', name: '' },
                    ]
              );
            }
            
            // 経歴・実績データを読み込み（Supabaseから）
            const profileWithCareer = profile as { career_data?: {
              pastOrganizationsUi?: Array<{ id?: string; name: string; startYm: string; endYm: string }>;
              awardsUi?: Array<{ id?: string; title: string; dateYm: string; result: string }>;
              performancesUi?: Array<{ id?: string; title: string }>;
              breakPeriodsUi?: Array<{ id?: string; startDate: string; endDate: string; reason: string }>;
            } };
            
            if (profileWithCareer?.career_data) {
              const careerData = profileWithCareer.career_data;
              if (careerData.pastOrganizationsUi && Array.isArray(careerData.pastOrganizationsUi)) {
                setPastOrgs(careerData.pastOrganizationsUi.length > 0 
                  ? careerData.pastOrganizationsUi 
                  : [{ id: undefined, name: '', startYm: '', endYm: '' }]);
              }
              if (careerData.awardsUi && Array.isArray(careerData.awardsUi)) {
                setAwardsEdit(careerData.awardsUi.length > 0 
                  ? careerData.awardsUi 
                  : [{ id: undefined, title: '', dateYm: '', result: '' }]);
              }
              if (careerData.performancesUi && Array.isArray(careerData.performancesUi)) {
                setPerformancesEdit(careerData.performancesUi.length > 0 
                  ? careerData.performancesUi 
                  : [{ id: undefined, title: '' }]);
              }
              // 休止期間も楽器ごとのデータから読み込む
              if (careerData.breakPeriodsUi && Array.isArray(careerData.breakPeriodsUi)) {
                setBreakPeriods(careerData.breakPeriodsUi.length > 0 
                  ? careerData.breakPeriodsUi.map((bp: any) => ({
                    id: bp.id || Date.now().toString(),
                    startDate: bp.startDate || '',
                    endDate: bp.endDate || '',
                    reason: bp.reason || ''
                  }))
                  : []);
              }
            }
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

  // 演奏歴年数を自動計算（useCallbackでメモ化）
  const calculateMusicExperienceYears = useCallback((startAge: string, currentAge: string) => {
    if (!startAge || !currentAge) return 0;
    const startAgeNum = parseInt(startAge);
    const currentAgeNum = parseInt(currentAge);
    if (isNaN(startAgeNum) || isNaN(currentAgeNum)) return 0;
    return Math.max(0, currentAgeNum - startAgeNum);
  }, []);

  // 誕生日から年齢を計算（useCallbackでメモ化）
  const calculateAgeFromBirthday = useCallback((birthdayInput: Date | string | null) => {
    if (!birthdayInput) return 0;
    const birthday = birthdayInput instanceof Date ? birthdayInput : new Date(birthdayInput);
    const today = new Date();
    
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    
    return Math.max(0, age);
  }, []);

  // 認証チェック（副作用の無限ループ防止のため依存から isAuthenticated を外す）
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
  }, [isLoading]);

  // 現在のユーザー情報を取得（依存から isAuthenticated を外す）
  // 楽器が変更されたときも再読み込み
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return; // 認証されていない場合は早期リターン
    loadCurrentUser();
  }, [isLoading, selectedInstrument]);

  // 誕生日が変更された時の処理
  useEffect(() => {
    if (birthday) {
      const age = calculateAgeFromBirthday(birthday);
      setCurrentAge(age.toString());
    }
  }, [birthday, calculateAgeFromBirthday]);

  // 楽器開始年齢と現在の年齢から演奏歴年数を自動計算
  useEffect(() => {
    if (musicStartAge && currentAge) {
      const years = calculateMusicExperienceYears(musicStartAge, currentAge);
      setMusicExperienceYears(years);
    } else {
      // どちらかが空の場合は0にリセット
      setMusicExperienceYears(0);
    }
  }, [musicStartAge, currentAge, calculateMusicExperienceYears]);


  // 認証中または認証されていない場合は何も表示しない
  if (isLoading || !isAuthenticated) {
    return null;
  }

  // 楽器・練習レベル設定はこの画面では扱わない（主要機能で管理）

  // 全角数字を半角数字に変換する関数
  const convertToHalfWidth = (text: string): string => {
    if (!text) return '';
    
    // 全角数字を半角に変換
    let converted = text.replace(/[０-９]/g, (char) => {
      const fullWidthMap: { [key: string]: string } = {
        '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
        '５': '5', '６': '6', '７': '7', '８': '8', '９': '9'
      };
      return fullWidthMap[char] || char;
    });
    
    // その他の全角文字や記号も除去（数字のみを残す）
    converted = converted.replace(/[^0-9]/g, '');
    
    return converted;
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

  // 経歴データ読み込み（非推奨：楽器ごとのデータから読み込むため、この関数は使用しない）
  // 楽器ごとのデータはloadCurrentUser内で読み込まれる
  const loadCareerData = async () => {
    // この関数は後方互換性のために残しているが、実際には使用されない
    // 楽器ごとのデータはloadCurrentUser内でinstrument_specific_dataから読み込まれる
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

      // まず現在の権限状態を確認
      const currentPermission = await ImagePicker.getCameraPermissionsAsync();
      logger.debug('現在のカメラ権限状態:', currentPermission);

      // 権限を要求
      logger.debug('カメラの権限をリクエスト中...');
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
      logger.debug('カメラの権限ステータス:', { status, canAskAgain });
      
      if (status !== 'granted') {
        logger.debug('カメラの権限が拒否されました', { status, canAskAgain });
        
        // 権限が拒否され、再度要求できない場合は設定画面への誘導を提案
        if (!canAskAgain && Platform.OS !== 'web') {
          Alert.alert(
            'カメラ権限が必要です',
            '写真を撮影するためにカメラ権限が必要です。設定画面からカメラ権限を許可してください。',
            [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '設定を開く',
                onPress: async () => {
                  try {
                    if (Platform.OS === 'ios') {
                      await Linking.openURL('app-settings:');
                    } else if (Platform.OS === 'android') {
                      await Linking.openSettings();
                    }
                  } catch (error) {
                    logger.error('設定画面を開けませんでした:', error);
                    Alert.alert('エラー', '設定画面を開けませんでした。手動で設定アプリからカメラ権限を許可してください。');
                  }
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'カメラ権限が必要です',
            '写真を撮影するためにカメラ権限が必要です。',
            [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '再試行',
                onPress: () => takePhoto() // 再帰的に呼び出し
              }
            ]
          );
        }
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
      // ファイル名を短くする（URI Too Longエラーを防ぐため）
      const fileExt = ext || 'jpg';
      // ユーザーIDの最初の8文字を使用してファイル名を短縮
      const shortUserId = currentUser.id.substring(0, 8);
      const fileName = `${shortUserId}/avatar.${fileExt}`;
      logger.debug('アップロードファイル名:', fileName);
      
      logger.debug('Supabase Storageにアップロード中...');
      
      // バケットの存在確認を試みる（権限がある場合）
      let bucketExists = false;
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) {
        logger.warn('バケット一覧取得エラー（権限がない可能性があります）:', listError);
        // 権限がない場合は、アップロード時にエラーで検出する
      } else {
        const avatarsBucket = buckets?.find((b: { name: string }) => b.name === 'avatars');
        if (avatarsBucket) {
          bucketExists = true;
          logger.debug('avatarsバケットが存在することを確認しました');
        } else {
          logger.warn('avatarsバケットが見つかりませんでした。アップロードを試みます...');
        }
      }
      
      // リトライ機能付きでアップロード
      let uploadError: Error | null = null;
      let uploadData: { path: string } | null = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
            uploadError = error;
            logger.warn(`アップロード試行 ${attempt}/${maxRetries} 失敗:`, error);
            
            // バケットが存在しないエラーの場合（最優先で処理）
            if (
              error.message?.includes('Bucket not found') || 
              error.message?.includes('not found') ||
              error.statusCode === 404 ||
              error.status === 404 ||
              error.code === '404' ||
              (error.message && error.message.toLowerCase().includes('bucket'))
            ) {
              logger.error('avatarsバケットが存在しません。Supabaseダッシュボードでバケットを作成してください。');
              Alert.alert(
                'ストレージバケットが設定されていません',
                'アバター画像をアップロードするには、Supabaseダッシュボードで「avatars」という名前のストレージバケットを作成する必要があります。\n\n管理者にお問い合わせください。'
              );
              setLoading(false);
              return;
            }
            
            // 503エラーの場合、リトライ前に少し待機
            if (error.status === 503 || error.statusCode === 503) {
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
              }
            }
            
        throw error;
      }
          
          uploadData = data;
      logger.info('アップロード成功:', data);
          break;
        } catch (err: unknown) {
          uploadError = err instanceof Error ? err : new Error(String(err));
          // バケットが存在しないエラーの場合（catch節でも確認）
          if (
            err?.message?.includes('Bucket not found') || 
            err?.message?.includes('not found') ||
            err?.statusCode === 404 ||
            err?.status === 404 ||
            err?.code === '404' ||
            (err?.message && err.message.toLowerCase().includes('bucket'))
          ) {
            logger.error('avatarsバケットが存在しません。Supabaseダッシュボードでバケットを作成してください。');
            Alert.alert(
              'ストレージバケットが設定されていません',
              'アバター画像をアップロードするには、Supabaseダッシュボードで「avatars」という名前のストレージバケットを作成する必要があります。\n\n管理者にお問い合わせください。'
            );
            setLoading(false);
            return;
          }
          
          if (attempt === maxRetries) {
            throw err;
          }
        }
      }

      if (uploadError) {
        logger.error('アップロードエラー（全試行失敗）:', uploadError);
        throw uploadError;
      }

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
    } catch (error: unknown) {
      logger.error('画像アップロードエラー:', error);
      
      // エラーメッセージを詳細化
      let errorMessage = '画像のアップロードに失敗しました';
      let errorTitle = 'エラー';
      
      // バケットが存在しないエラーの場合（最優先で処理）
      if (
        error?.message?.includes('Bucket not found') || 
        error?.message?.includes('not found') ||
        error?.statusCode === 404 ||
        error?.status === 404 ||
        error?.code === '404' ||
        (error?.message && error.message.toLowerCase().includes('bucket'))
      ) {
        errorTitle = 'ストレージバケットが設定されていません';
        errorMessage = 'アバター画像をアップロードするには、Supabaseダッシュボードで「avatars」という名前のストレージバケットを作成する必要があります。\n\n管理者にお問い合わせください。';
      } else if (error?.status === 503 || error?.statusCode === 503) {
        errorMessage = 'サービスが一時的に利用できません。しばらく待ってから再度お試しください。';
      } else if (error?.message?.includes('network') || error?.message?.includes('ネットワーク')) {
        errorMessage = 'ネットワーク接続を確認してください。';
      } else if (error?.message) {
        errorMessage = `エラー: ${error.message}`;
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
      logger.debug('uploadImage完了');
    }
  };

  const showImagePicker = () => {
    logger.debug('showImagePicker関数が呼び出されました');
    logger.debug('ユーザー認証状態:', !!currentUser);
    logger.debug('現在のアバターURL:', avatarUrl);
    
    // Web環境では直接ファイル選択ダイアログを開く
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      logger.debug('Web環境: ファイル選択ダイアログを開きます');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          logger.debug('ファイルが選択されました:', file.name);
          // ファイルをDataURLに変換してuploadImageに渡す
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              await uploadImage(dataUrl);
            }
          };
          reader.onerror = (error) => {
            logger.error('ファイル読み込みエラー:', error);
            Alert.alert('エラー', '画像の読み込みに失敗しました');
          };
          reader.readAsDataURL(file);
        }
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
      };
      document.body.appendChild(input);
      input.click();
      return;
    }
    
    // ネイティブ環境ではAlert.alertを使用
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

  // 楽器情報のみを保存する関数
  const saveInstrumentInfoOnly = async (instrumentsToSave: Array<InstrumentInfo>) => {
    if (!currentUser || !selectedInstrument) {
      return;
    }

    try {
      // 既存の楽器ごとのデータを取得
      const existingInstrumentDataResult = await getInstrumentSpecificProfileData(
        currentUser.id,
        selectedInstrument
      );
      const existingInstrumentData = existingInstrumentDataResult.data || {};
      
      // 楽器情報をJSON形式で保存（既存データとの互換性のため、空の場合はundefined）
      const validInstruments = instrumentsToSave.filter(item => item.name.trim() !== '');
      const instrumentTypesJson = validInstruments.length > 0 
        ? JSON.stringify(validInstruments.map(item => {
            // 購入日を年、月、日から生成
            let purchaseDate = item.purchaseDate;
            if (!purchaseDate && item.purchaseYear && item.purchaseMonth && item.purchaseDay) {
              const y = parseInt(item.purchaseYear, 10);
              const m = parseInt(item.purchaseMonth, 10);
              const d = parseInt(item.purchaseDay, 10);
              if (y && m && d) {
                const date = new Date(y, m - 1, d);
                if (!isNaN(date.getTime())) {
                  purchaseDate = date.toISOString().split('T')[0];
                }
              }
            }
            return {
              id: item.id,
              name: item.name.trim(),
              maker: item.maker.trim(),
              model: item.model.trim(),
              purchaseDate: purchaseDate || null,
              purchasePrice: item.purchasePrice?.trim() || '',
              notes: item.notes?.trim() || '',
            };
          }))
        : undefined;
      
      // 音楽開始年齢が空の場合は既存の値を保持
      const musicStartAgeValue = musicStartAge && musicStartAge.trim() !== '' 
        ? parseInt(musicStartAge) 
        : (existingInstrumentData.music_start_age !== undefined ? existingInstrumentData.music_start_age : undefined);
      
      const instrumentSpecificData = {
        music_start_age: musicStartAgeValue,
        music_experience_years: musicExperienceYears || 0,
        custom_instrument_name: instrumentTypesJson,
        career_data: {
          pastOrganizationsUi: pastOrgs,
          awardsUi: awardsEdit,
          performancesUi: performancesEdit,
          breakPeriodsUi: breakPeriods.map(bp => ({
            id: bp.id,
            startDate: bp.startDate,
            endDate: bp.endDate,
            reason: bp.reason
          })),
        },
      };
      
      const instrumentDataResult = await saveInstrumentSpecificProfileData(
        currentUser.id,
        selectedInstrument,
        instrumentSpecificData
      );
      
      if (instrumentDataResult.error) {
        logger.warn('楽器情報の保存エラー:', instrumentDataResult.error);
      } else {
        logger.debug('楽器情報の保存成功');
      }
    } catch (error) {
      logger.error('楽器情報の保存中にエラーが発生しました:', error);
    }
  };

  // 楽器情報の削除関数
  const handleDeleteInstrument = async (instrumentId: string) => {
    if (!currentUser?.id) {
      Alert.alert('エラー', 'ユーザー情報が取得できませんでした');
      return;
    }

    try {
      logger.info('[ProfileSettings] 楽器データ削除処理を開始:', { instrumentId, userId: currentUser.id });

      // instrumentIdがUUID形式かどうかを確認
      // UUID形式の正規表現: 8-4-4-4-12の16進数
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = uuidRegex.test(instrumentId);

      // UUID形式の場合のみ、データベースの各テーブルから削除を試みる
      // ローカルID（"1", "2"など）の場合は、楽器情報リストからのみ削除
      if (isUuid && selectedInstrument) {
        // 選択中の楽器のIDと一致する場合のみ削除
        if (instrumentId === selectedInstrument) {
          const deletePromises = [
            supabase
              .from('recordings')
              .delete()
              .eq('user_id', currentUser.id)
              .eq('instrument_id', instrumentId),
            supabase
              .from('goals')
              .delete()
              .eq('user_id', currentUser.id)
              .eq('instrument_id', instrumentId),
            supabase
              .from('my_songs')
              .delete()
              .eq('user_id', currentUser.id)
              .eq('instrument_id', instrumentId),
            supabase
              .from('practice_sessions')
              .delete()
              .eq('user_id', currentUser.id)
              .eq('instrument_id', instrumentId),
            supabase
              .from('events')
              .delete()
              .eq('user_id', currentUser.id)
              .eq('instrument_id', instrumentId),
          ];

          const results = await Promise.all(deletePromises);
          const errors = results.filter(r => r.error);

          if (errors.length > 0) {
            logger.error('[ProfileSettings] 楽器データ削除エラー:', errors);
            // エラーがあっても、楽器情報リストからの削除は続行
          }
        }
      } else {
        // ローカルIDの場合は、データベースからの削除はスキップ
        logger.info('[ProfileSettings] ローカルIDのため、データベースからの削除をスキップ:', { instrumentId });
      }

      logger.info('[ProfileSettings] 楽器データの削除が完了:', { instrumentId });

      // 楽器情報リストから削除
      const filtered = instrumentTypes.filter(i => i.id !== instrumentId);
      const updatedInstruments = filtered.length === 0 ? [] : filtered;
      
      // 状態を更新
      if (updatedInstruments.length === 0) {
        // 全て削除した場合は、楽器情報欄を非表示にする
        setInstrumentTypes([]);
        setShowInstrumentInfo(false);
      } else {
        setInstrumentTypes(updatedInstruments);
      }
      
      // 削除後、楽器情報を自動保存（更新後の値を渡す）
      await saveInstrumentInfoOnly(updatedInstruments);

      // 削除成功のアラートを表示
      const instrument = instrumentTypes.find(i => i.id === instrumentId);
      const instrumentName = instrument?.name || '楽器';
      Alert.alert(
        '削除完了',
        `「${instrumentName}」のデータを削除しました。`,
        [{ text: 'OK' }]
      );
    } catch (error: unknown) {
      logger.error('[ProfileSettings] 楽器データ削除例外:', error);
      Alert.alert(
        'エラー',
        '楽器データの削除中にエラーが発生しました。\n\nお問い合わせ先までご連絡ください。',
        [{ text: 'OK' }]
      );
    }
  };

  // 削除関数
  const handleDeleteBreakPeriod = async (id: string) => {
    if (!currentUser || !selectedInstrument) {
      Alert.alert('エラー', '楽器が選択されていません');
      return;
    }
    
    try {
      // 楽器ごとのデータから削除
      const updatedBreakPeriods = breakPeriods.filter(item => item.id !== id);
      setBreakPeriods(updatedBreakPeriods);
      
      // 既存の楽器ごとのデータを取得
      const existingInstrumentDataResult = await getInstrumentSpecificProfileData(
        currentUser.id,
        selectedInstrument
      );
      const existingData = existingInstrumentDataResult.data || {};
      
      // 楽器ごとのデータを更新
      const updatedInstrumentData = {
        ...existingData,
        career_data: {
          ...(existingData.career_data || {}),
          breakPeriodsUi: updatedBreakPeriods.map(bp => ({
            id: bp.id,
            startDate: bp.startDate,
            endDate: bp.endDate,
            reason: bp.reason
          })),
        },
      };
      
      const saveResult = await saveInstrumentSpecificProfileData(
        currentUser.id,
        selectedInstrument,
        updatedInstrumentData
      );
      
      if (saveResult.error) {
        // エラーが発生した場合は元に戻す
        setBreakPeriods(breakPeriods);
        ErrorHandler.handle(saveResult.error, '休止期間の削除', false);
        Alert.alert('エラー', '休止期間の削除に失敗しました');
      }
    } catch (error) {
      // エラーが発生した場合は元に戻す
      setBreakPeriods(breakPeriods);
      ErrorHandler.handle(error, '休止期間の削除', false);
      Alert.alert('エラー', '休止期間の削除に失敗しました');
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

      // 基本カラムのみを含める（ニックネーム、現在の所属団体、年齢は共通データ）
      const upsertRow: Partial<UserProfile> = {
        user_id: currentUser.id,
        display_name: nickname.trim(),
        updated_at: new Date().toISOString(),
      };
      
      // オプショナルカラム（存在する場合のみ追加）
      // カラムが存在しない場合はエラーを無視して続行
      try {
        if (currentAge) upsertRow.current_age = parseInt(currentAge);
        if (birthday) upsertRow.birthday = birthday.toISOString().split('T')[0];
        if (organizationsString) upsertRow.organization = organizationsString;
        if (organizationsString) (upsertRow as any).current_organization = organizationsString;
      } catch (optionalColumnError) {
        // カラムが存在しない場合のエラーは無視（基本情報は保存される）
        logger.debug('オプショナルカラムの設定をスキップ（カラムが存在しない可能性）:', optionalColumnError);
      }

      logger.debug('保存データ（共通）:', upsertRow);

      // user_id一意制約を使ってUPSERT（共通データ）
      const result = await upsertUserProfile(upsertRow);
      
      // 楽器ごとのデータを保存（現在選択されている楽器がある場合のみ）
      if (selectedInstrument) {
        // 既存の楽器ごとのデータを取得して、空の場合は既存の値を保持
        const existingInstrumentDataResult = await getInstrumentSpecificProfileData(
          currentUser.id,
          selectedInstrument
        );
        const existingInstrumentData = existingInstrumentDataResult.data || {};
        
        // 楽器情報をJSON形式で保存（既存データとの互換性のため、空の場合はundefined）
        const validInstruments = instrumentTypes.filter(item => item.name.trim() !== '');
        const instrumentTypesJson = validInstruments.length > 0 
          ? JSON.stringify(validInstruments.map(item => ({
              id: item.id,
              name: item.name.trim(),
              maker: item.maker.trim(),
              model: item.model.trim(),
              purchaseDate: item.purchaseDate || null,
              purchasePrice: item.purchasePrice?.trim() || '',
              notes: item.notes?.trim() || '',
            })))
          : undefined;
        
        // 音楽開始年齢が空の場合は既存の値を保持、そうでない場合は新しい値を設定
        const musicStartAgeValue = musicStartAge && musicStartAge.trim() !== '' 
          ? parseInt(musicStartAge) 
          : (existingInstrumentData.music_start_age !== undefined ? existingInstrumentData.music_start_age : undefined);
        
        const instrumentSpecificData = {
          music_start_age: musicStartAgeValue,
          music_experience_years: musicExperienceYears || 0,
          custom_instrument_name: instrumentTypesJson,
          career_data: {
            pastOrganizationsUi: pastOrgs,
            awardsUi: awardsEdit,
            performancesUi: performancesEdit,
            breakPeriodsUi: breakPeriods.map(bp => ({
              id: bp.id,
              startDate: bp.startDate,
              endDate: bp.endDate,
              reason: bp.reason
            })),
          },
        };
        
        const instrumentDataResult = await saveInstrumentSpecificProfileData(
          currentUser.id,
          selectedInstrument,
          instrumentSpecificData
        );
        
        if (instrumentDataResult.error) {
          logger.warn('楽器ごとのデータ保存エラー:', instrumentDataResult.error);
          // エラーは警告として扱う（共通データは保存済み）
        } else {
          logger.info('楽器ごとのデータ保存成功');
        }
      }

      if (result.error) {
        // カラムが存在しないエラーの場合は警告として処理（基本情報は保存済みの可能性）
        const errorCode = (result.error as any).code || (result.error as any).originalError?.code;
        const errorMessage = result.error.message || (result.error as any).originalError?.message || '';
        if (errorCode === '42703' || errorCode === 'PGRST204' || errorMessage.includes('column') || errorMessage.includes('does not exist') || errorMessage.includes('Could not find')) {
          logger.warn('一部のカラムが存在しないため、オプショナル情報は保存されませんでした:', result.error);
          // 基本情報は保存されている可能性があるため、成功として扱う
        } else {
          logger.error('Supabase upsert エラー:', result.error);
          throw result.error;
        }
      }

      logger.info('保存成功:', result.data);

      // 認証プロフィール更新（他画面の表示名を即時反映）
      await fetchUserProfile();
      
      // プロフィール情報を再読み込み（次回ログイン時に反映されるように）
      await loadCurrentUser();
      
      Alert.alert('保存されました', '基本情報を保存しました');
    } catch (error) {
      logger.error('プロフィール保存エラー:', error);
      Alert.alert('エラー', `プロフィールの保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    safeGoBack(router, '/(tabs)/settings', true); // 確実にsettings画面に戻る
  };

  // プロフィール情報削除処理
  const handleDeleteProfile = async () => {
    if (isDeleting) return;
    
    logger.info('[ProfileSettings] プロフィール削除ボタンが押されました');
    
    // Web環境ではconfirmを使用
    if (typeof window !== 'undefined' && window.confirm) {
      const confirm = window.confirm(
        'プロフィール情報を削除しますか？\n\n削除される情報：\n• ニックネーム\n• 誕生日\n• 楽器情報\n• 経歴・実績\n• 休止期間\n\nこの操作は取り消せません。アカウントは削除されません。'
      );
      
      if (!confirm) {
        logger.info('[ProfileSettings] プロフィール削除がキャンセルされました');
        return;
      }
      
      await performProfileDeletion();
      return;
    }
    
    // ネイティブ環境ではAlertを使用
    Alert.alert(
      'プロフィール削除の確認',
      'プロフィール情報を削除しますか？\n\n削除される情報：\n• ニックネーム\n• 誕生日\n• 楽器情報\n• 経歴・実績\n• 休止期間\n\nこの操作は取り消せません。アカウントは削除されません。',
      [
        { 
          text: 'キャンセル', 
          style: 'cancel',
          onPress: () => {
            logger.info('[ProfileSettings] プロフィール削除がキャンセルされました');
          }
        },
        { 
          text: '削除する', 
          style: 'destructive',
          onPress: async () => {
            await performProfileDeletion();
          }
        }
      ]
    );
  };

  const performProfileDeletion = async () => {
    if (isDeleting || !user) return;
    
    setIsDeleting(true);
    
    try {
      logger.info('[ProfileSettings] プロフィール削除処理を開始');
      
      // 1. プロフィール情報をクリア
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          display_name: null,
          nickname: null,
          birthday: null,
          music_start_age: null,
          music_experience_years: null,
          avatar_url: null,
          instrument_specific_data: {},
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      if (profileError) {
        logger.error('[ProfileSettings] プロフィール削除エラー:', profileError);
        Alert.alert('エラー', `プロフィール情報の削除に失敗しました: ${profileError.message}`);
        setIsDeleting(false);
        return;
      }
      
      // 2. 経歴・実績データを削除（楽器ごとのデータから）
      // 楽器ごとのデータを取得して、すべての楽器の経歴・実績をクリア
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('instrument_specific_data')
        .eq('user_id', user.id)
        .single();
      
      if (profileData && profileData.instrument_specific_data) {
        const instrumentData = profileData.instrument_specific_data as any;
        
        // すべての楽器のcareer_dataをクリア
        const updatedInstrumentData: any = {};
        for (const [instrumentId, data] of Object.entries(instrumentData)) {
          if (data && typeof data === 'object') {
            updatedInstrumentData[instrumentId] = {
              ...data,
              career_data: {
                pastOrganizationsUi: [],
                awardsUi: [],
                performancesUi: [],
                breakPeriodsUi: [],
              },
            };
          }
        }
        
        // 更新
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            instrument_specific_data: updatedInstrumentData,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        
        if (updateError) {
          logger.error('[ProfileSettings] 経歴・実績データ削除エラー:', updateError);
          // エラーでも続行（プロフィール情報は削除済み）
        }
      }
      
      logger.info('[ProfileSettings] プロフィール削除が完了');
      
      // 3. 画面の状態をリセット
      setDisplayName('ユーザー');
      setNickname('');
      setBirthday(null);
      setBirthYear('');
      setBirthMonth('');
      setBirthDay('');
      setMusicStartAge('');
      setMusicExperienceYears(0);
      setCurrentAge('');
      setAvatarUrl(null);
      setInstrumentTypes([]);
      setBreakPeriods([]);
      setPastOrganizations([]);
      setAwards([]);
      setPerformances([]);
      setPastOrgs([{ id: undefined, name: '', startYm: '', endYm: '' }]);
      setAwardsEdit([{ id: undefined, title: '', dateYm: '', result: '' }]);
      setPerformancesEdit([{ id: undefined, title: '' }]);
      
      // 4. プロフィール情報を再読み込み
      await loadCurrentUser();
      
      Alert.alert(
        'プロフィール削除完了',
        'プロフィール情報を削除しました。\n\nアカウントは削除されていません。',
        [{ text: 'OK' }]
      );
      
    } catch (error: unknown) {
      logger.error('[ProfileSettings] プロフィール削除例外:', error);
      Alert.alert(
        'エラー',
        'プロフィール情報の削除中にエラーが発生しました。'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // アカウント削除処理
  const handleDeleteAccount = () => {
    logger.info('[ProfileSettings] アカウント削除ボタンが押されました');
    
    // Web環境ではconfirmを使用
    if (typeof window !== 'undefined' && window.confirm) {
      const firstConfirm = window.confirm(
        'アカウントを削除すると、すべてのデータが永久に削除されます。\n\nこの操作は取り消せません。本当に削除しますか？'
      );
      
      if (!firstConfirm) {
        logger.info('[ProfileSettings] 1回目の確認でキャンセルされました');
        return;
      }
      
      const secondConfirm = window.confirm(
        '最終確認\n\nアカウントを削除すると、以下のデータがすべて永久に削除されます：\n\n• プロフィール情報\n• 練習記録\n• 目標設定\n• 録音データ\n• その他すべてのデータ\n\nこの操作は取り消せません。本当に削除しますか？'
      );
      
      if (!secondConfirm) {
        logger.info('[ProfileSettings] 2回目の確認でキャンセルされました');
        return;
      }
      
      logger.info('[ProfileSettings] 2回の確認が完了、削除処理を開始');
      performAccountDeletion();
      return;
    }
    
    // ネイティブ環境ではAlertを使用
    Alert.alert(
      'アカウント削除の確認',
      'アカウントを削除すると、すべてのデータが永久に削除されます。\n\nこの操作は取り消せません。本当に削除しますか？',
      [
        { 
          text: 'キャンセル', 
          style: 'cancel',
          onPress: () => {
            logger.info('[ProfileSettings] 1回目の確認でキャンセルされました');
          }
        },
        { 
          text: '削除する', 
          style: 'destructive',
          onPress: () => {
            logger.info('[ProfileSettings] 1回目の確認で削除が選択されました');
            // 2回目の確認
            Alert.alert(
              '最終確認',
              'アカウントを削除すると、以下のデータがすべて永久に削除されます：\n\n• プロフィール情報\n• 練習記録\n• 目標設定\n• 録音データ\n• その他すべてのデータ\n\nこの操作は取り消せません。本当に削除しますか？',
              [
                { 
                  text: 'キャンセル', 
                  style: 'cancel',
                  onPress: () => {
                    logger.info('[ProfileSettings] 2回目の確認でキャンセルされました');
                  }
                },
                { 
                  text: 'はい、削除します', 
                  style: 'destructive',
                  onPress: () => {
                    logger.info('[ProfileSettings] 2回目の確認で削除が選択されました、削除処理を開始');
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
      logger.info('[ProfileSettings] アカウント削除処理を開始');
      
      // データベース関数を呼び出してユーザーデータを削除
      const { error: deleteError } = await supabase.rpc('delete_user_account');
      
      if (deleteError) {
        logger.error('[ProfileSettings] アカウント削除エラー:', deleteError);
        Alert.alert(
          'エラー',
          'アカウント削除中にエラーが発生しました。\n\nお問い合わせ先までご連絡ください。'
        );
        setIsDeleting(false);
        return;
      }
      
      logger.info('[ProfileSettings] ユーザーデータの削除が完了');
      
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
      logger.error('[ProfileSettings] アカウント削除例外:', error);
      Alert.alert(
        'エラー',
        'アカウント削除中にエラーが発生しました。\n\nお問い合わせ先までご連絡ください。'
      );
      setIsDeleting(false);
    }
  };

  // 現在の年齢を計算する関数（削除）
  // const calculateCurrentAge = (startAge: string, experienceYears: number) => {
  //   if (!startAge || experienceYears === 0) return 0;
  //   const startAgeNum = parseInt(startAge);
  //   return startAgeNum + experienceYears;
  // };

  // 誕生日選択のハンドラー
  const handleBirthdayChange = (_event: unknown, selectedDate?: Date) => {
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

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>現在の所属団体</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setCurrentOrganizations([
                        ...currentOrganizations,
                        { id: Date.now().toString(), name: '' }
                      ]);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: currentTheme.primary,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    activeOpacity={0.7}
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>追加</Text>
                  </TouchableOpacity>
                </View>
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
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formItem}>
                <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>誕生日</Text>
          <View style={[
            styles.birthdayRow,
            { 
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }
          ]}>
            <TextInput
              ref={birthYearInputRef}
              style={[
                styles.dateInputSmall,
                { 
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.secondary,
                  color: currentTheme.text
                }
              ]}
              placeholder="YYYY"
              placeholderTextColor={currentTheme.textSecondary}
              value={birthYear}
              onChangeText={(v) => {
                // 全角数字を半角に変換
                const halfWidthText = convertToHalfWidth(v);
                const nv = halfWidthText.slice(0, 4);
                setBirthYear(nv);
                if (nv.length === 4 && birthMonth && birthDay) {
                  validateBirthdayFields(nv, birthMonth, birthDay);
                } else {
                  setBirthdayError('');
                }
                // 4桁入力されたら次のフィールド（月）にフォーカス
                if (nv.length === 4) {
                  birthMonthInputRef.current?.focus();
                }
              }}
              keyboardType="number-pad"
              {...(Platform.OS === 'web' ? { 
                inputMode: 'numeric',
                pattern: '[0-9]*',
                type: 'tel',
                autoComplete: 'off'
              } : {})}
              maxLength={4}
              returnKeyType="next"
              onSubmitEditing={() => {
                birthMonthInputRef.current?.focus();
              }}
              accessibilityLabel="誕生日 年"
            />
            <Text style={[styles.dateSep, { color: currentTheme.textSecondary }]}>-</Text>
            <TextInput
              ref={birthMonthInputRef}
              style={[
                styles.dateInputXs,
                { 
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.secondary,
                  color: currentTheme.text
                }
              ]}
              placeholder="MM"
              placeholderTextColor={currentTheme.textSecondary}
              value={birthMonth}
              onChangeText={(v) => {
                // 全角数字を半角に変換
                const halfWidthText = convertToHalfWidth(v);
                let nv = halfWidthText.slice(0, 2);
                if (nv.length === 2) {
                  const n = Math.min(12, Math.max(1, parseInt(nv, 10)));
                  nv = String(n).padStart(2, '0');
                  // 2桁入力されたら次のフィールド（日）にフォーカス
                  birthDayInputRef.current?.focus();
                }
                setBirthMonth(nv);
                if (birthYear && nv && birthDay) {
                  validateBirthdayFields(birthYear, nv, birthDay);
                } else {
                  setBirthdayError('');
                }
              }}
              keyboardType="number-pad"
              {...(Platform.OS === 'web' ? { 
                inputMode: 'numeric',
                pattern: '[0-9]*',
                type: 'tel',
                autoComplete: 'off'
              } : {})}
              maxLength={2}
              returnKeyType="next"
              onSubmitEditing={() => {
                birthDayInputRef.current?.focus();
              }}
              accessibilityLabel="誕生日 月"
            />
            <Text style={[styles.dateSep, { color: currentTheme.textSecondary }]}>-</Text>
            <TextInput
              ref={birthDayInputRef}
              style={[
                styles.dateInputXs,
                { 
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.secondary,
                  color: currentTheme.text
                }
              ]}
              placeholder="DD"
              placeholderTextColor={currentTheme.textSecondary}
              value={birthDay}
              onChangeText={(v) => {
                // 全角数字を半角に変換
                const halfWidthText = convertToHalfWidth(v);
                let nv = halfWidthText.slice(0, 2);
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
              {...(Platform.OS === 'web' ? { 
                inputMode: 'numeric',
                pattern: '[0-9]*',
                type: 'tel',
                autoComplete: 'off'
              } : {})}
              maxLength={2}
              returnKeyType="done"
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
                <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>楽器開始年齢</Text>
                <View style={[styles.ageInputContainer, { 
                  backgroundColor: currentTheme.background,
                  borderColor: currentTheme.secondary
                }]}>
                  <TextInput
                    style={[styles.ageInput, { 
                      color: currentTheme.text,
                      backgroundColor: 'transparent'
                    }]}
                    value={musicStartAge}
                    onChangeText={(text) => {
                      // 全角数字を半角数字に変換
                      const halfWidthText = convertToHalfWidth(text);
                      // 数字のみを許可（全角・半角両方）
                      const numericText = halfWidthText.replace(/[^0-9]/g, '');
                      // 最大3桁まで（0-999歳）
                      if (numericText.length <= 3) {
                        setMusicStartAge(numericText);
                      }
                    }}
                    placeholder="年齢を入力"
                    placeholderTextColor={currentTheme.textSecondary}
                    keyboardType="number-pad"
                    maxLength={3}
                    editable={true}
                    selectTextOnFocus={false}
                    pointerEvents="auto"
                  />
                  <Text style={[styles.ageInputSuffix, { color: currentTheme.textSecondary }]}>歳</Text>
                </View>
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

            <View style={styles.formRow}>
              <View style={styles.formItem}>
                {!showInstrumentInfo ? (
                  // 初期状態：追加ボタンのみ表示
                  <View style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    width: '100%',
                  }}>
                    <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>楽器情報</Text>
                    <View style={{ marginBottom: 8 }} />
                    <TouchableOpacity
                      onPress={() => {
                        setShowInstrumentInfo(true);
                        const newId = '1';
                        setInstrumentTypes([{ id: newId, name: '', maker: '', model: '', purchaseDate: null, purchaseYear: '', purchaseMonth: '', purchaseDay: '', purchasePrice: '', notes: '' }]);
                      }}
                      style={[
                        styles.saveButtonNew,
                        {
                          backgroundColor: currentTheme.primary,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          marginHorizontal: 12,
                          paddingHorizontal: 32,
                          paddingVertical: 10,
                        }
                      ]}
                      activeOpacity={0.8}
                      pointerEvents="auto"
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.saveAllButtonText}>
                        追加
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // 楽器情報が表示されている場合
                  <>
                    <View style={{
                      flexDirection: Dimensions.get('window').width < 400 ? 'column' : 'row',
                      alignItems: Dimensions.get('window').width < 400 ? 'stretch' : 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      gap: Dimensions.get('window').width < 400 ? 8 : 0,
                    }}>
                      <Text style={[styles.formLabel, { color: currentTheme.textSecondary }]}>楽器情報</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const newId = (instrumentTypes.length + 1).toString();
                          setInstrumentTypes([...instrumentTypes, { id: newId, name: '', maker: '', model: '', purchaseDate: null, purchaseYear: '', purchaseMonth: '', purchaseDay: '', purchasePrice: '', notes: '' }]);
                        }}
                        style={[
                          styles.saveButtonNew,
                          {
                            backgroundColor: currentTheme.primary,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            marginHorizontal: 12,
                            paddingHorizontal: 32,
                            paddingVertical: 10,
                          }
                        ]}
                        activeOpacity={0.8}
                      >
                        <Plus size={16} color="#FFFFFF" />
                        <Text style={styles.saveAllButtonText}>
                          追加
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {instrumentTypes.map((item, index) => (
                  <View key={item.id} style={{ marginBottom: index < instrumentTypes.length - 1 ? 8 : 0, marginTop: 4 }}>
                    <View style={{ 
                      backgroundColor: currentTheme.surface, 
                      borderRadius: 12, 
                      padding: 8,
                      borderWidth: 1,
                      borderColor: currentTheme.secondary,
                    }}>
                      {/* ヘッダー部分（楽器名ラベルと編集・削除ボタン） */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[styles.formLabel, { color: currentTheme.textSecondary, fontSize: 12 }]}>
                          楽器名
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // 編集ボタンは現在は視覚的な表示のみ（将来の拡張用）
                              // 現在は常に編集可能な状態なので、特に処理は不要
                            }}
                            style={{
                              padding: 6,
                              backgroundColor: currentTheme.primary,
                              borderRadius: 6,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                            activeOpacity={0.7}
                          >
                            <Edit size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (Platform.OS === 'web') {
                                // Web環境ではconfirmを使用
                                if (typeof window !== 'undefined' && window.confirm('この楽器を削除しますか？')) {
                                  handleDeleteInstrument(item.id);
                                }
                              } else {
                                // モバイル環境ではAlertを使用
                                Alert.alert(
                                  '削除確認',
                                  'この楽器を削除しますか？',
                                  [
                                    { text: 'キャンセル', style: 'cancel' },
                                    { 
                                      text: '削除', 
                                      style: 'destructive',
                                      onPress: () => {
                                        handleDeleteInstrument(item.id);
                                      }
                                    }
                                  ]
                                );
                              }
                            }}
                            style={{
                              padding: 6,
                              backgroundColor: '#FF4444',
                              borderRadius: 6,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      {/* 楽器名入力 */}
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: currentTheme.background, 
                          borderColor: currentTheme.secondary, 
                          color: currentTheme.text,
                          marginBottom: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                        }]}
                        placeholder="例: ストラディバリウス"
                        placeholderTextColor={currentTheme.textSecondary}
                        value={item.name}
                        onChangeText={(text) => {
                          const updated = instrumentTypes.map(i => 
                            i.id === item.id ? { ...i, name: text } : i
                          );
                          setInstrumentTypes(updated);
                        }}
                      />
                      
                      {/* メーカー */}
                      <Text style={[styles.formLabel, { color: currentTheme.textSecondary, marginBottom: 2, fontSize: 12 }]}>
                        メーカー
                      </Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: currentTheme.background, 
                          borderColor: currentTheme.secondary, 
                          color: currentTheme.text,
                          marginBottom: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                        }]}
                        placeholder="例: YAMAHA、Stradivarius"
                        placeholderTextColor={currentTheme.textSecondary}
                        value={item.maker}
                        onChangeText={(text) => {
                          const updated = instrumentTypes.map(i => 
                            i.id === item.id ? { ...i, maker: text } : i
                          );
                          setInstrumentTypes(updated);
                        }}
                      />
                      
                      {/* 購入日 */}
                      <Text style={[styles.formLabel, { color: currentTheme.textSecondary, marginBottom: 2, fontSize: 12 }]}>
                        購入日
                      </Text>
                      <View style={[
                        styles.birthdayRow,
                        { 
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          marginBottom: 4,
                        }
                      ]}>
                        <TextInput
                          ref={(ref) => { purchaseYearInputRefs.current[item.id] = ref; }}
                          style={[
                            styles.dateInputSmall,
                            { 
                              backgroundColor: currentTheme.background,
                              borderColor: currentTheme.secondary,
                              color: currentTheme.text
                            }
                          ]}
                          placeholder="YYYY"
                          placeholderTextColor={currentTheme.textSecondary}
                          value={item.purchaseYear}
                          onChangeText={(v) => {
                            const halfWidthText = convertToHalfWidth(v);
                            const nv = halfWidthText.slice(0, 4);
                            const updated = instrumentTypes.map(i => 
                              i.id === item.id ? { ...i, purchaseYear: nv } : i
                            );
                            setInstrumentTypes(updated);
                            if (nv.length === 4 && item.purchaseMonth && item.purchaseDay) {
                              const y = parseInt(nv, 10);
                              const m = parseInt(item.purchaseMonth, 10);
                              const d = parseInt(item.purchaseDay, 10);
                              if (y && m && d) {
                                const date = new Date(y, m - 1, d);
                                if (!isNaN(date.getTime())) {
                                  const updated2 = updated.map(i => 
                                    i.id === item.id ? { ...i, purchaseDate: date.toISOString().split('T')[0] } : i
                                  );
                                  setInstrumentTypes(updated2);
                                }
                              }
                            }
                            if (nv.length === 4) {
                              purchaseMonthInputRefs.current[item.id]?.focus();
                            }
                          }}
                          keyboardType="number-pad"
                          {...(Platform.OS === 'web' ? { 
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                            type: 'tel',
                            autoComplete: 'off'
                          } : {})}
                          maxLength={4}
                          returnKeyType="next"
                          onSubmitEditing={() => {
                            purchaseMonthInputRefs.current[item.id]?.focus();
                          }}
                          accessibilityLabel="購入日 年"
                        />
                        <Text style={[styles.dateSep, { color: currentTheme.textSecondary }]}>-</Text>
                        <TextInput
                          ref={(ref) => { purchaseMonthInputRefs.current[item.id] = ref; }}
                          style={[
                            styles.dateInputXs,
                            { 
                              backgroundColor: currentTheme.background,
                              borderColor: currentTheme.secondary,
                              color: currentTheme.text
                            }
                          ]}
                          placeholder="MM"
                          placeholderTextColor={currentTheme.textSecondary}
                          value={item.purchaseMonth}
                          onChangeText={(v) => {
                            const halfWidthText = convertToHalfWidth(v);
                            let nv = halfWidthText.slice(0, 2);
                            if (nv.length === 2) {
                              const n = Math.min(12, Math.max(1, parseInt(nv, 10)));
                              nv = String(n).padStart(2, '0');
                              purchaseDayInputRefs.current[item.id]?.focus();
                            }
                            const updated = instrumentTypes.map(i => 
                              i.id === item.id ? { ...i, purchaseMonth: nv } : i
                            );
                            setInstrumentTypes(updated);
                            if (item.purchaseYear && nv && item.purchaseDay) {
                              const y = parseInt(item.purchaseYear, 10);
                              const m = parseInt(nv, 10);
                              const d = parseInt(item.purchaseDay, 10);
                              if (y && m && d) {
                                const date = new Date(y, m - 1, d);
                                if (!isNaN(date.getTime())) {
                                  const updated2 = updated.map(i => 
                                    i.id === item.id ? { ...i, purchaseDate: date.toISOString().split('T')[0] } : i
                                  );
                                  setInstrumentTypes(updated2);
                                }
                              }
                            }
                          }}
                          keyboardType="number-pad"
                          {...(Platform.OS === 'web' ? { 
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                            type: 'tel',
                            autoComplete: 'off'
                          } : {})}
                          maxLength={2}
                          returnKeyType="next"
                          onSubmitEditing={() => {
                            purchaseDayInputRefs.current[item.id]?.focus();
                          }}
                          accessibilityLabel="購入日 月"
                        />
                        <Text style={[styles.dateSep, { color: currentTheme.textSecondary }]}>-</Text>
                        <TextInput
                          ref={(ref) => { purchaseDayInputRefs.current[item.id] = ref; }}
                          style={[
                            styles.dateInputXs,
                            { 
                              backgroundColor: currentTheme.background,
                              borderColor: currentTheme.secondary,
                              color: currentTheme.text
                            }
                          ]}
                          placeholder="DD"
                          placeholderTextColor={currentTheme.textSecondary}
                          value={item.purchaseDay}
                          onChangeText={(v) => {
                            const halfWidthText = convertToHalfWidth(v);
                            let nv = halfWidthText.slice(0, 2);
                            if (nv.length === 2) {
                              const y = parseInt(item.purchaseYear || '0', 10);
                              const m = parseInt(item.purchaseMonth || '0', 10);
                              const maxDay = y && m ? new Date(y, m, 0).getDate() : 31;
                              const n = Math.min(maxDay, Math.max(1, parseInt(nv, 10)));
                              nv = String(n).padStart(2, '0');
                            }
                            const updated = instrumentTypes.map(i => 
                              i.id === item.id ? { ...i, purchaseDay: nv } : i
                            );
                            setInstrumentTypes(updated);
                            if (item.purchaseYear && item.purchaseMonth && nv) {
                              const y = parseInt(item.purchaseYear, 10);
                              const m = parseInt(item.purchaseMonth, 10);
                              const d = parseInt(nv, 10);
                              if (y && m && d) {
                                const date = new Date(y, m - 1, d);
                                if (!isNaN(date.getTime())) {
                                  const updated2 = updated.map(i => 
                                    i.id === item.id ? { ...i, purchaseDate: date.toISOString().split('T')[0] } : i
                                  );
                                  setInstrumentTypes(updated2);
                                }
                              }
                            }
                          }}
                          keyboardType="number-pad"
                          {...(Platform.OS === 'web' ? { 
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                            type: 'tel',
                            autoComplete: 'off'
                          } : {})}
                          maxLength={2}
                          returnKeyType="done"
                          accessibilityLabel="購入日 日"
                        />
                      </View>
                      
                      {/* 購入価格 */}
                      <Text style={[styles.formLabel, { color: currentTheme.textSecondary, marginBottom: 2, fontSize: 12 }]}>
                        購入価格
                      </Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: currentTheme.background, 
                          borderColor: currentTheme.secondary, 
                          color: currentTheme.text,
                          marginBottom: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                        }]}
                        placeholder="例: 500000"
                        placeholderTextColor={currentTheme.textSecondary}
                        value={item.purchasePrice || ''}
                        onChangeText={(text) => {
                          const updated = instrumentTypes.map(i => 
                            i.id === item.id ? { ...i, purchasePrice: text } : i
                          );
                          setInstrumentTypes(updated);
                        }}
                        keyboardType="number-pad"
                        {...(Platform.OS === 'web' ? { 
                          inputMode: 'numeric',
                          pattern: '[0-9]*',
                          type: 'tel',
                          autoComplete: 'off'
                        } : {})}
                      />
                      
                      {/* 備考 */}
                      <Text style={[styles.formLabel, { color: currentTheme.textSecondary, marginBottom: 2, fontSize: 12 }]}>
                        備考
                      </Text>
                      <TextInput
                        style={[styles.input, styles.textArea, { 
                          backgroundColor: currentTheme.background, 
                          borderColor: currentTheme.secondary, 
                          color: currentTheme.text,
                          marginBottom: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                        }]}
                        placeholder="メモや特記事項を記入"
                        placeholderTextColor={currentTheme.textSecondary}
                        value={item.notes || ''}
                        onChangeText={(text) => {
                          const updated = instrumentTypes.map(i => 
                            i.id === item.id ? { ...i, notes: text } : i
                          );
                          setInstrumentTypes(updated);
                        }}
                        multiline
                        numberOfLines={3}
                        {...(Platform.OS !== 'web' ? { textAlignVertical: 'top' } : {})}
                      />
                    </View>
                  </View>
                ))}
                    <Text style={[styles.helpText, { color: currentTheme.textSecondary, marginTop: 4 }]}>
                      所有している楽器の情報を記入してください。複数の楽器を追加できます。
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButtonNew,
              {
                backgroundColor: currentTheme.primary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                marginHorizontal: 12,
                paddingHorizontal: 32,
                paddingVertical: 10,
              }
            ]}
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
                <View key={row.id || `past-org-${index}`} style={styles.inputRow}>
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
                  style={[styles.addButton, { backgroundColor: '#FF4444' }]} 
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
                <View key={row.id || `award-${index}`} style={styles.inputRow}>
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
                  style={[styles.addButton, { backgroundColor: '#FF4444' }]} 
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
                <View key={row.id || `performance-${index}`} style={styles.inputRow}>
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
                  style={[styles.addButton, { backgroundColor: '#FF4444' }]} 
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
          
          {/* 経歴・実績 保存ボタン（楽器ごとに保存） */}
          <TouchableOpacity
            style={[styles.saveAllButton, { backgroundColor: currentTheme.primary }]}
            onPress={async () => {
              try {
                const uid = currentUser?.id;
                if (!uid) {
                  Alert.alert('エラー', 'ログインが必要です');
                  return;
                }
                
                if (!selectedInstrument) {
                  Alert.alert('エラー', '楽器が選択されていません');
                  return;
                }
                
                // 楽器ごとのデータを取得して、経歴・実績を更新
                const instrumentDataResult = await getInstrumentSpecificProfileData(uid, selectedInstrument);
                const existingData = instrumentDataResult.data || {};
                
                // 空の行を除外して保存
                const filteredPastOrgs = pastOrgs.filter(org => org.name.trim() !== '');
                const filteredAwards = awardsEdit.filter(award => award.title.trim() !== '');
                const filteredPerformances = performancesEdit.filter(perf => perf.title.trim() !== '');
                
                const updatedInstrumentData = {
                  ...existingData,
                  career_data: {
                    pastOrganizationsUi: filteredPastOrgs.length > 0 ? filteredPastOrgs : [],
                    awardsUi: filteredAwards.length > 0 ? filteredAwards : [],
                    performancesUi: filteredPerformances.length > 0 ? filteredPerformances : [],
                    breakPeriodsUi: breakPeriods.map(bp => ({
                      id: bp.id,
                      startDate: bp.startDate,
                      endDate: bp.endDate,
                      reason: bp.reason
                    })),
                  },
                };
                
                const saveResult = await saveInstrumentSpecificProfileData(
                  uid,
                  selectedInstrument,
                  updatedInstrumentData
                );
                
                if (saveResult.error) {
                  throw saveResult.error;
                }
                
                Alert.alert('保存完了', '経歴・実績を保存しました');
              } catch (e) {
                logger.error('経歴・実績の保存エラー:', e);
                ErrorHandler.handle(e, '経歴・実績の保存', false);
                Alert.alert('エラー', '保存に失敗しました');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.saveAllButtonText}>経歴・実績を保存</Text>
          </TouchableOpacity>
        </View>

          {/* プロフィール削除セクション */}
          <View style={[styles.infoSection, { backgroundColor: currentTheme.surface, marginTop: 16, marginBottom: 24, paddingHorizontal: 8, paddingVertical: 8 }]}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIcon, { backgroundColor: '#FF4444' }]}>
                <Trash2 size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text, fontSize: 14 }]}>プロフィール削除</Text>
            </View>
            <View style={[styles.formGroup, { marginTop: 4 }]}>
              <Text style={[styles.sectionDescription, { color: currentTheme.textSecondary, marginBottom: 8, fontSize: 11 }]}>
                プロフィール情報を削除します。この操作は取り消せません。
              </Text>
              <TouchableOpacity
                style={[styles.deleteButton, { 
                  backgroundColor: '#FF4444',
                  opacity: isDeleting ? 0.6 : 1,
                  paddingVertical: 6,
                  paddingHorizontal: 12
                }]}
                onPress={handleDeleteProfile}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <Text style={[styles.deleteButtonText, { fontSize: 12 }]}>削除中...</Text>
                ) : (
                  <Text style={[styles.deleteButtonText, { fontSize: 12 }]}>プロフィール削除</Text>
                )}
              </TouchableOpacity>
            </View>
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
