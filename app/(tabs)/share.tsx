import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Share, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Users, CheckSquare, Plus, Settings, Home, Share as ShareIcon, Copy, ClipboardList } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { useOrganization } from '@/hooks/useOrganization';
import type { Organization } from '@/types/organization';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { createShadowStyle } from '@/lib/shadowStyles';

export default function ShareScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuthAdvanced();
  
  // 組織管理フック
  const {
    organizations,
    loading,
    loadOrganizations,
    createOrganization: createOrg,
    joinOrganization: joinOrg,
    searchOrganizations: searchOrgs,
  } = useOrganization();
  
  // UI状態管理
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showJoinOrg, setShowJoinOrg] = useState(false);
  const [showAllOrgsMenu, setShowAllOrgsMenu] = useState(false);
  
  // 組織作成フォーム
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    isSolo: false
  });

  // 組織参加フォーム
  const [joinForm, setJoinForm] = useState<{
    searchName: string;
    selectedOrg: Organization | null;
    password: string;
  }>({
    searchName: '',
    selectedOrg: null,
    password: ''
  });
  
  // 組織作成成功時の表示用
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrgInfo, setCreatedOrgInfo] = useState<{
    name: string;
    password: string;
    isSolo?: boolean;
  } | null>(null);

  // 組織一覧を読み込み
  useEffect(() => {
    if (isAuthenticated) {
      loadOrganizations();
    }
  }, [isAuthenticated, loadOrganizations]);

  // 組織作成
  const handleCreateOrganization = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert(t('error'), t('loginRequired') || 'Login required');
      return;
    }
    
    if (!createForm.name.trim()) {
      Alert.alert(t('error'), t('pleaseEnterOrganizationName'));
      return;
    }

    // パスワードは常に自動生成（customPasswordを渡さない）
    // ソロモードの場合はパスワードを生成しない
    const result = await createOrg({
      name: createForm.name.trim(),
      description: createForm.description.trim() || undefined,
      customPassword: undefined, // 常にundefined（自動生成）
      isSolo: createForm.isSolo,
    });

    if (result) {
      // 成功モーダルに表示する情報を設定
      setCreatedOrgInfo({
        name: result.organization.name,
        password: result.password || '',
        isSolo: result.organization.is_solo || false
      });
      
      // 作成フォームを閉じて成功モーダルを表示
      setShowCreateOrg(false);
      setCreateForm({ name: '', description: '', isSolo: false });
      setShowSuccessModal(true);
    }
  };

  // 組織検索
  const handleSearchOrganizations = async () => {
    if (!joinForm.searchName.trim()) {
      Alert.alert(t('error'), t('pleaseEnterOrganizationName'));
      return;
    }

    const foundOrgs = await searchOrgs(joinForm.searchName.trim());
    
    if (foundOrgs.length === 0) {
      Alert.alert(t('searchResult'), t('noOrganizationsFound'));
    } else if (foundOrgs.length === 1) {
      setJoinForm(prev => ({ ...prev, selectedOrg: foundOrgs[0] }));
    } else {
      // 複数の組織が見つかった場合の選択処理
      const orgNames = foundOrgs.map(org => org.name);
      Alert.alert(t('multipleOrganizationsFound'), orgNames.join('\n'));
    }
  };

  // 組織参加
  const handleJoinOrganization = async () => {
    if (!joinForm.selectedOrg || !joinForm.password.trim()) {
      Alert.alert(t('error'), t('pleaseEnterOrganizationAndPassword'));
      return;
    }

    const organization = await joinOrg({
      organizationId: joinForm.selectedOrg.id,
      password: joinForm.password.trim(),
    });

    if (organization) {
      Alert.alert(t('success'), t('joinedOrganization'));
      setShowJoinOrg(false);
      setJoinForm({ searchName: '', selectedOrg: null, password: '' });
    }
  };

  // 組織選択
  const selectOrganization = (org: Organization) => {
    router.push(`/organization-dashboard?orgId=${org.id}` as any);
  };

  // リンク送信機能
  const sharePassword = async (password: string) => {
    try {
      const message = `${t('organizationJoinPassword')}: ${password}\n\n${t('sharePasswordMessage')}`;
      await Share.share({
        message: message,
        title: t('share'),
      });
    } catch (error) {
      ErrorHandler.handle(error, t('share'), false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await Share.share({
        message: text,
        title: `${type} ${t('copy')}`,
      });
      Alert.alert(t('copyCompleted'), `${type}${t('copiedToClipboard')}`);
    } catch (error) {
      ErrorHandler.handle(error, t('copy'), false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* 全体をスクロール可能にする */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${currentTheme.primary}20` }]}>
            <Users size={32} color={currentTheme.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
            {t('organizationManagement')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: currentTheme.textSecondary }]}>
            {t('organizationManagementSubtitle')}
          </Text>
        </View>

        {/* アクションボタン */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentTheme.primary }]}
            onPress={() => setShowCreateOrg(true)}
          >
            <Plus size={20} color={currentTheme.surface} />
            <Text style={[styles.actionButtonText, { color: currentTheme.surface }]}>
              {t('createNewOrganization')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary, borderWidth: 2 }]}
            onPress={() => setShowJoinOrg(true)}
          >
            <Users size={20} color={currentTheme.primary} />
            <Text style={[styles.actionButtonText, { color: currentTheme.primary }]}>
              {t('joinOrganization')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 組織一覧 */}
        <View style={styles.content}>
          <View style={styles.organizationsContainer}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('participatingOrganizations')}</Text>
            
            {/* 全組織カード */}
            <TouchableOpacity
              style={[
                styles.overviewCard,
                { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary + '33', marginTop: 16 }
              ]}
              onPress={() => setShowAllOrgsMenu(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.overviewIcon, { backgroundColor: currentTheme.primary + '20' }]}> 
                <Users size={20} color={currentTheme.primary} />
              </View>
              <View style={styles.overviewTextBox}>
                <Text style={[styles.overviewTitle, { color: currentTheme.text }]}>{t('allOrganizations')}</Text>
                <Text style={[styles.overviewSubtitle, { color: currentTheme.textSecondary }]}>{t('allOrganizationsSubtitle')}</Text>
              </View>
              <View style={styles.overviewAction}>
                <Text style={[styles.overviewActionText, { color: currentTheme.primary }]}>{t('open')}</Text>
              </View>
            </TouchableOpacity>
            
            {/* 個別組織一覧 */}
            <Text style={[styles.sectionTitle, { color: currentTheme.text, marginTop: 24, marginBottom: 12, fontSize: 16 }]}>{t('individualOrganizations')}</Text>
            {loading ? (
              <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>{t('loading')}</Text>
            ) : organizations.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: currentTheme.surface }]}> 
                <Users size={40} color={currentTheme.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: currentTheme.text }]}>{t('noOrganizationsYet')}</Text>
                <Text style={[styles.emptyStateText, { color: currentTheme.textSecondary }]}>{t('noOrganizationsYetSubtitle')}</Text>
              </View>
            ) : (
              // 重複を除去
              Array.from(new Map(organizations.map(o => [o.id, o])).values()).map((org) => (
                <TouchableOpacity
                  key={org.id}
                  style={[styles.orgCard, { backgroundColor: currentTheme.surface }]}
                  onPress={() => selectOrganization(org)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.orgIcon, { backgroundColor: currentTheme.primary }]}>
                    <Users size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.orgContent}>
                    <Text style={[styles.orgName, { color: currentTheme.text }]}>
                      {org.name}
                    </Text>
                    <Text style={[styles.orgDescription, { color: currentTheme.textSecondary }]}>
                      {org.description || t('noDescription')}
                    </Text>
                    <Text style={[styles.orgDate, { color: currentTheme.primary }]}>
                      {`${t('createdDate')}: ${org.created_at ? new Date(org.created_at).toLocaleDateString(t('language') === 'en' ? 'en-US' : 'ja-JP') : t('unknown')}`}
                    </Text>
                  </View>
                  <View style={styles.orgArrow}>
                    <Text style={[styles.arrow, { color: currentTheme.textSecondary }]}>›</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* 機能説明 */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, { color: currentTheme.text }]}>
            {t('mainFeatures')}
          </Text>
          
          <View style={[styles.featureCard, { backgroundColor: currentTheme.surface }]}>
            <Calendar size={24} color={currentTheme.primary} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: currentTheme.text }]}>
                {t('practiceScheduleManagement')}
              </Text>
              <Text style={[styles.featureDescription, { color: currentTheme.textSecondary }]}>
                {t('practiceScheduleManagementDesc')}
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, { backgroundColor: currentTheme.surface }]}>
            <CheckSquare size={24} color={currentTheme.primary} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: currentTheme.text }]}>
                {t('attendanceManagement')}
              </Text>
              <Text style={[styles.featureDescription, { color: currentTheme.textSecondary }]}> 
                {t('attendanceManagementDesc')}
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, { backgroundColor: currentTheme.surface }]}>
            <Settings size={24} color={currentTheme.primary} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: currentTheme.text }]}>
                {t('taskManagement')}
              </Text>
              <Text style={[styles.featureDescription, { color: currentTheme.textSecondary }]}>
                {t('taskManagementDesc')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 組織作成モーダル */}
      <Modal
        visible={showCreateOrg}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateOrg(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {t('createNewOrganization')}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateOrg(false)}>
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  {t('organizationName')} *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={createForm.name}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, name: text }))}
                  placeholder={t('organizationNamePlaceholder')}
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              {/* ソロモードチェックボックス */}
              <View style={styles.inputContainer}>
                <View style={styles.checkboxContainer}>
                  <Switch
                    value={createForm.isSolo}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, isSolo: value }))}
                    trackColor={{ false: currentTheme.secondary, true: currentTheme.primary }}
                    thumbColor={currentTheme.surface}
                  />
                  <Text style={[styles.checkboxLabel, { color: currentTheme.text }]}>
                    {t('createInSoloMode')}
                  </Text>
                </View>
                {!createForm.isSolo && (
                  <Text style={[styles.inputHelper, { color: currentTheme.textSecondary, marginTop: 8 }]}>
                    {t('passwordAutoGenerated')}
                  </Text>
                )}
                {createForm.isSolo && (
                  <Text style={[styles.inputHelper, { color: currentTheme.textSecondary, marginTop: 8 }]}>
                    {t('soloModeNote')}
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  {t('description')}
                </Text>
                <TextInput
                  style={[styles.textArea, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={createForm.description}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, description: text }))}
                  placeholder={t('descriptionPlaceholder')}
                  placeholderTextColor={currentTheme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { 
                  backgroundColor: currentTheme.primary,
                  opacity: loading ? 0.6 : 1
                }]}
                onPress={handleCreateOrganization}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                  {loading ? t('creating') : t('createOrganization')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 組織参加モーダル */}
      <Modal
        visible={showJoinOrg}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowJoinOrg(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {t('joinOrganization')}
              </Text>
              <TouchableOpacity onPress={() => setShowJoinOrg(false)}>
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* 組織検索 */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  {t('searchOrganizationByName')} *
                </Text>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: currentTheme.background,
                      color: currentTheme.text,
                      borderColor: currentTheme.secondary,
                      flex: 1
                    }]}
                    value={joinForm.searchName}
                    onChangeText={(text) => setJoinForm(prev => ({ ...prev, searchName: text }))}
                    placeholder={t('organizationNamePlaceholder')}
                    placeholderTextColor={currentTheme.textSecondary}
                  />
                  <TouchableOpacity
                    style={[styles.searchButton, { backgroundColor: currentTheme.primary }]}
                    onPress={handleSearchOrganizations}
                    disabled={loading}
                  >
                    <Text style={[styles.searchButtonText, { color: currentTheme.surface }]}>
                      {t('search')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {joinForm.selectedOrg && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                    {t('selectedOrganization')}
                  </Text>
                  <View style={[styles.selectedOrgCard, { backgroundColor: currentTheme.background }]}>
                    <Text style={[styles.selectedOrgName, { color: currentTheme.text }]}>
                      {joinForm.selectedOrg.name}
                    </Text>
                    {joinForm.selectedOrg.description && (
                      <Text style={[styles.selectedOrgDescription, { color: currentTheme.textSecondary }]}>
                        {joinForm.selectedOrg.description}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  {t('organizationPassword')} *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={joinForm.password}
                  onChangeText={(text) => {
                    // 大文字英数字のみを許可し、自動的に大文字に変換
                    const upperText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setJoinForm(prev => ({ ...prev, password: upperText }));
                  }}
                  placeholder={t('language') === 'en' ? '8 uppercase alphanumeric' : '8桁の大文字英数字'}
                  placeholderTextColor={currentTheme.textSecondary}
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>

              <TouchableOpacity
                style={[styles.actionButton, { 
                  backgroundColor: currentTheme.primary,
                  opacity: (!joinForm.selectedOrg || !joinForm.password.trim()) ? 0.5 : 1
                }]}
                onPress={handleJoinOrganization}
                disabled={loading || !joinForm.selectedOrg || !joinForm.password.trim()}
              >
                <Text style={[styles.actionButtonText, { color: currentTheme.surface }]}>
                  {loading ? t('joining') : t('join')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 組織作成成功モーダル */}
      <Modal
        visible={showSuccessModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.successHeader}>
              <Text style={[styles.successTitle, { color: currentTheme.primary }]}>
                {t('organizationCreated')}
              </Text>
            </View>
            
            <ScrollView style={styles.successContent}>
              <Text style={[styles.successMessage, { color: currentTheme.text }]}>
                {t('organizationCreatedDesc').replace('{name}', createdOrgInfo?.name || '')}
              </Text>
              
              {/* ソロモードでない場合のみパスワードと招待コードを表示 */}
              {!createdOrgInfo?.isSolo && (
                <>
              <View style={[styles.infoCard, { backgroundColor: currentTheme.background }]}>
                <Text style={[styles.infoTitle, { color: currentTheme.text }]}>
                  {t('organizationPassword')}
                </Text>
                <View style={[styles.infoValueContainer, { backgroundColor: currentTheme.secondary }]}>
                  <Text style={[styles.infoValue, { color: currentTheme.primary }]}>
                    {createdOrgInfo?.password}
                  </Text>
                </View>
                <View style={styles.shareButtons}>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: currentTheme.primary }]}
                    onPress={() => sharePassword(createdOrgInfo?.password || '')}
                  >
                    <ShareIcon size={16} color={currentTheme.surface} />
                    <Text style={[styles.shareButtonText, { color: currentTheme.surface }]}>
                      {t('share')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: currentTheme.secondary, borderColor: currentTheme.primary, borderWidth: 1 }]}
                    onPress={() => copyToClipboard(createdOrgInfo?.password || '', t('organizationPassword'))}
                  >
                    <Copy size={16} color={currentTheme.primary} />
                    <Text style={[styles.shareButtonText, { color: currentTheme.primary }]}>
                      {t('copy')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={[styles.noteCard, { backgroundColor: currentTheme.secondary }]}>
                <Text style={[styles.noteText, { color: currentTheme.textSecondary }]}>
                  {t('sharePassword')}
                </Text>
              </View>
                </>
              )}
              
              {createdOrgInfo?.isSolo && (
                <View style={[styles.noteCard, { backgroundColor: currentTheme.secondary }]}>
                  <Text style={[styles.noteText, { color: currentTheme.textSecondary }]}>
                    {t('soloModeCreated')}
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.successButton, { backgroundColor: currentTheme.primary }]}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={[styles.successButtonText, { color: currentTheme.surface }]}>
                  {t('done')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 全組織メニューモーダル */}
      <Modal
        visible={showAllOrgsMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAllOrgsMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {t('allOrganizationsMenu')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAllOrgsMenu(false)}
                style={styles.closeButtonContainer}
              >
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuContainer}>
              {/* 練習日程 */}
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary + '33' }
                ]}
                onPress={() => {
                  setShowAllOrgsMenu(false);
                  router.push('/calendar?allOrgs=true' as any);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.menuIcon, { backgroundColor: currentTheme.primary + '20' }]}> 
                  <Calendar size={24} color={currentTheme.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: currentTheme.text }]}>{t('practiceSchedule')}</Text>
                  <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]}>{t('allOrganizationsCalendarDesc')}</Text>
                </View>
              </TouchableOpacity>

              {/* 出欠登録 */}
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  { backgroundColor: currentTheme.surface, borderColor: currentTheme.secondary + '33', marginTop: 12 }
                ]}
                onPress={() => {
                  setShowAllOrgsMenu(false);
                  router.push('/attendance?allOrgs=true' as any);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.menuIcon, { backgroundColor: currentTheme.secondary + '20' }]}> 
                  <CheckSquare size={24} color={currentTheme.secondary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: currentTheme.text }]}>{t('allOrganizationsAttendance')}</Text>
                  <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]}>{t('allOrganizationsAttendanceDesc')}</Text>
                </View>
              </TouchableOpacity>

              {/* 課題一覧 */}
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary + '33', marginTop: 12 }
                ]}
                onPress={() => {
                  setShowAllOrgsMenu(false);
                  router.push('/tasks-all-orgs' as any);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.menuIcon, { backgroundColor: currentTheme.primary + '20' }]}> 
                  <ClipboardList size={24} color={currentTheme.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: currentTheme.text }]}>{t('allOrganizationsTasks')}</Text>
                  <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]}>{t('allOrganizationsTasksDesc')}</Text>
                </View>
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
  scrollContainer: {
    flex: 1,
    marginTop: -8,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButtons: {
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  actionButton: {
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
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
  },
  organizationsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingText: {
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    elevation: 4,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 4,
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  orgContent: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  orgDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  orgDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  orgArrow: {
    marginLeft: 16,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  featureContent: {
    flex: 1,
    marginLeft: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 2,
  },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  overviewTextBox: { flex: 1 },
  overviewTitle: { fontSize: 16, fontWeight: '700' },
  overviewSubtitle: { fontSize: 12, marginTop: 2 },
  overviewAction: { marginLeft: 12 },
  overviewActionText: { fontSize: 14, fontWeight: '700' },
  menuContainer: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButtonContainer: {
    padding: 4,
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 80,
  },
  inputHelper: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedOrgCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedOrgName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedOrgDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  joinMethodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  joinMethodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinMethodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  // 成功モーダル用スタイル
  successHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  successContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoValueContainer: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    flex: 1,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  successActions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  successButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
