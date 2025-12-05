import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, FlatList, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Plus, Users, Trash2, Edit3, ArrowLeft, UserPlus, Crown, Shield, Share as ShareIcon, Copy, Key } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import InstrumentHeader from '../components/InstrumentHeader';
import { useInstrumentTheme } from '../components/InstrumentThemeContext';
import { useLanguage } from '../components/LanguageContext';
import { safeGoBack } from '@/lib/navigationUtils';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { useOrganization } from '@/hooks/useOrganization';
import { useAdminCode } from '@/hooks/useAdminCode';
import type { Organization, UserGroupMembership } from '@/types/organization';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export default function OrganizationSettingsScreen() {
  const router = useRouter();
  const { orgId, from } = useLocalSearchParams();
  const { currentTheme } = useInstrumentTheme();
  const { t } = useLanguage();
  const { user } = useAuthAdvanced();
  
  // 戻り先の決定
  const fromScreen = from as string || 'share';
  
  // フック
  const {
    organizations,
    loading: orgLoading,
    loadOrganizations,
    updateOrganization: updateOrg,
    deleteOrganization: deleteOrg,
  } = useOrganization();
  
  const {
    loading: adminCodeLoading,
    setAdminCode,
    becomeAdminByCode,
  } = useAdminCode();
  
  // 状態管理
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<UserGroupMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'organization'>('members');
  
  // モーダル状態
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showEditOrganization, setShowEditOrganization] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showSetAdminCode, setShowSetAdminCode] = useState(false);
  const [showEnterAdminCode, setShowEnterAdminCode] = useState(false);
  
  // 認証情報
  const [organizationPassword, setOrganizationPassword] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);
  
  // 管理者コード関連
  const [adminCodeForm, setAdminCodeForm] = useState({
    code: '',
    confirmCode: ''
  });
  
  // フォーム状態
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member' as 'member' | 'leader' | 'admin'
  });
  const [orgEditForm, setOrgEditForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (orgId) {
      loadOrganizationData();
    }
  }, [orgId]);

  const loadOrganizationData = async () => {
    setLoading(true);
    try {
      // 組織情報を取得
      await loadOrganizations();
      const org = organizations.find(o => o.id === orgId);
      if (org) {
        setOrganization(org);
        setOrgEditForm({ name: org.name, description: org.description || '' });
        // 認証情報を設定（実際のAPIに合わせて調整が必要）
        setOrganizationPassword(org.password || '');
      }

      // TODO: メンバー一覧の取得（実装が必要）
      // const membersResult = await MemberManager.getOrganizationMembers(orgId as string);
      // if (membersResult.success && membersResult.members) {
      //   setMembers(membersResult.members);
      // }
    } catch (error) {
      ErrorHandler.handle(error, t('loading'), false);
    } finally {
      setLoading(false);
    }
  };


  // 共有機能
  const shareCredentials = async () => {
    if (isSharing) return; // 重複実行を防ぐ
    
    setIsSharing(true);
    try {
      const message = `${t('organizationJoinInfo').replace('{name}', organization?.name || '')}\n\n${t('organizationJoinInfoMessage').replace('{password}', organizationPassword)}`;
      
      const result = await Share.share({
        message: message,
        title: t('shareCredentialsTitle'),
      });
      
      // 共有が成功した場合のみログ出力
      if (result.action === Share.sharedAction) {
        logger.debug('認証情報の共有が完了しました');
      }
    } catch (error: any) {
      // ユーザーがキャンセルした場合はエラーとして扱わない
      if (error.name === 'AbortError' || error.message?.includes('canceled')) {
        logger.debug('共有がキャンセルされました');
        return;
      }
      
      // 重複実行エラーの場合
      if (error.name === 'InvalidStateError' || error.message?.includes('earlier share')) {
        logger.debug('前回の共有がまだ完了していません');
        Alert.alert(t('error'), t('previousShareNotCompleted'));
        return;
      }
      
      ErrorHandler.handle(error, t('shareCredentials'), true);
      Alert.alert(t('error'), t('shareFailed'));
    } finally {
      setIsSharing(false);
    }
  };

  // 管理者コードを設定（組織作成者用）
  const handleSetAdminCode = async () => {
    if (!adminCodeForm.code.trim() || !adminCodeForm.confirmCode.trim()) {
      Alert.alert(t('error'), t('pleaseEnterAdminCode'));
      return;
    }

    if (adminCodeForm.code !== adminCodeForm.confirmCode) {
      Alert.alert(t('error'), t('adminCodeMismatch'));
      return;
    }

    if (!/^\d{4}$/.test(adminCodeForm.code)) {
      Alert.alert(t('error'), t('adminCodeMustBe4Digits'));
      return;
    }

    if (!orgId) {
      Alert.alert(t('error'), t('organizationIdNotFound'));
      return;
    }

    if (!orgId) {
      Alert.alert(t('error'), t('organizationIdNotFound'));
      return;
    }

    const success = await setAdminCode({
      organizationId: orgId as string,
      adminCode: adminCodeForm.code,
    });

    if (success) {
      setShowSetAdminCode(false);
      setAdminCodeForm({ code: '', confirmCode: '' });
      await loadOrganizationData();
    }
  };

  // 管理者コードで管理者になる（一般ユーザー用）
  const handleEnterAdminCode = async () => {
    if (!adminCodeForm.code.trim()) {
      Alert.alert(t('error'), t('pleaseEnterAdminCode'));
      return;
    }

    if (!/^\d{4}$/.test(adminCodeForm.code)) {
      Alert.alert(t('error'), t('adminCodeMustBe4Digits'));
      return;
    }

    if (!orgId) {
      Alert.alert(t('error'), t('organizationIdNotFound'));
      return;
    }

    if (!orgId) {
      Alert.alert(t('error'), t('organizationIdNotFound'));
      return;
    }

    const success = await becomeAdminByCode(orgId as string, adminCodeForm.code);

    if (success) {
      setShowEnterAdminCode(false);
      setAdminCodeForm({ code: '', confirmCode: '' });
      await loadOrganizationData();
    }
  };

  const copyCredentials = async () => {
    if (isSharing) return; // 重複実行を防ぐ
    
    setIsSharing(true);
    try {
      const credentials = organizationPassword;
      
      if (Platform.OS === 'web') {
        // Web版ではnavigator.clipboardを使用
        await navigator.clipboard.writeText(credentials);
      } else {
        // モバイル版ではShare APIを使用
        await Share.share({
          message: credentials,
          title: t('copyCredentials')
        });
      }
      
      Alert.alert(t('copyCompleted'), t('credentialsCopied'));
    } catch (error: any) {
      ErrorHandler.handle(error, t('copy'), true);
      Alert.alert(t('error'), t('copyFailed'));
    } finally {
      setIsSharing(false);
    }
  };

  const updateOrganization = async () => {
    if (!orgEditForm.name.trim()) {
      Alert.alert(t('error'), t('pleaseEnterOrganizationName'));
      return;
    }

    if (!orgId) {
      Alert.alert(t('error'), t('organizationIdNotFound'));
      return;
    }

    const success = await updateOrg(orgId as string, {
      name: orgEditForm.name.trim(),
      description: orgEditForm.description.trim() || undefined,
    });

    if (success) {
      setShowEditOrganization(false);
      await loadOrganizationData();
    }
  };

  const deleteOrganization = async () => {
    Alert.alert(
      t('deleteOrganization'),
      t('deleteOrganizationConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            if (!orgId) {
              Alert.alert(t('error'), t('organizationIdNotFound'));
              return;
            }

            const success = await deleteOrg(orgId as string);
            
            if (success) {
              // 組織一覧画面に戻る
              router.push('/share' as any);
            }
          }
        }
      ]
    );
  };


  const removeMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      t('removeMember'),
      t('removeMemberConfirm').replace('{name}', memberName),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            // memberIdはmembershipIdとして扱う
            const { membershipService } = await import('@/services/membershipService');
            const result = await membershipService.removeMember(memberId);
            
            if (result.success) {
              Alert.alert(t('success'), t('memberRemoved'));
              await loadOrganizationData();
            } else {
              Alert.alert(t('error'), result.error || t('memberRemoveFailed'));
            }
          }
        }
      ]
    );
  };

  const inviteMember = async () => {
    if (!inviteForm.email.trim()) {
      Alert.alert(t('error'), t('pleaseEnterEmail'));
      return;
    }

    setLoading(true);
    try {
      // TODO: メンバー招待機能の実装
      Alert.alert(t('info'), t('memberInviteInProgress'));
      setShowInviteMember(false);
      setInviteForm({ email: '', role: 'member' });
    } catch (error) {
      Alert.alert(t('error'), t('memberInviteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown size={16} color="#FFD700" />;
      case 'leader': return <Shield size={16} color="#4CAF50" />;
      default: return <Users size={16} color={currentTheme.textSecondary} />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return t('admin');
      case 'leader': return t('leader');
      case 'member': return t('member');
      default: return role;
    }
  };


  if (loading && !organization) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
        <InstrumentHeader />
        <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
          <Text style={[styles.loadingText, { color: currentTheme.text }]}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      <InstrumentHeader />
      
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack('/(tabs)/share')}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {t('organizationSettings')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* タブナビゲーション */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: activeTab === 'members' ? currentTheme.primary : currentTheme.surface }
          ]}
          onPress={() => setActiveTab('members')}
        >
          <Users size={20} color={activeTab === 'members' ? currentTheme.surface : currentTheme.text} />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'members' ? currentTheme.surface : currentTheme.text }
          ]}>
            {t('members')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: activeTab === 'organization' ? currentTheme.primary : currentTheme.surface }
          ]}
          onPress={() => setActiveTab('organization')}
        >
          <Settings size={20} color={activeTab === 'organization' ? currentTheme.surface : currentTheme.text} />
          <Text style={[
            styles.tabButtonText,
            { color: activeTab === 'organization' ? currentTheme.surface : currentTheme.text }
          ]}>
            {t('organizationInfo')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* メンバー管理タブ */}
        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                {t('memberManagement')}
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: currentTheme.primary }]}
                onPress={() => setShowInviteMember(true)}
              >
                <UserPlus size={20} color={currentTheme.surface} />
                <Text style={[styles.addButtonText, { color: currentTheme.surface }]}>
                  {t('invite')}
                </Text>
              </TouchableOpacity>
            </View>

            {members.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: currentTheme.surface }]}>
                <Users size={48} color={currentTheme.textSecondary} />
                <Text style={[styles.emptyStateText, { color: currentTheme.text }]}>
                  {t('noMembersRegistered')}
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: currentTheme.textSecondary }]}>
                  {t('inviteNewMember')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.memberCard, { backgroundColor: currentTheme.surface }]}>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberHeader}>
                        <Text style={[styles.memberName, { color: currentTheme.text }]}>
                          {t('memberName')} {/* 実際の実装ではプロフィール情報を取得 */}
                        </Text>
                        <View style={styles.memberRole}>
                          {getRoleIcon(item.role)}
                          <Text style={[styles.roleText, { color: currentTheme.textSecondary }]}>
                            {getRoleLabel(item.role)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.memberEmail, { color: currentTheme.textSecondary }]}>
                        {t('emailAddress')}
                      </Text>
                      <Text style={[styles.joinDate, { color: currentTheme.textSecondary }]}>
                        {t('joinDate')}: {new Date(item.joined_at).toLocaleDateString(t('language') === 'en' ? 'en-US' : 'ja-JP')}
                      </Text>
                    </View>
                    <View style={styles.memberActions}>
                      <TouchableOpacity style={styles.actionButton}>
                        <Edit3 size={16} color={currentTheme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => removeMember(item.user_id, t('memberName'))}
                        disabled={loading}
                      >
                        <Trash2 size={16} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {/* 組織情報タブ */}
        {activeTab === 'organization' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                組織情報
              </Text>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: currentTheme.secondary }]}
                onPress={() => setShowEditOrganization(true)}
              >
                <Edit3 size={20} color={currentTheme.text} />
                <Text style={[styles.editButtonText, { color: currentTheme.text }]}>
                  編集
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.organizationCard, { backgroundColor: currentTheme.surface }]}>
              <View style={styles.organizationInfo}>
                <Text style={[styles.organizationName, { color: currentTheme.text }]}>
                  {organization?.name}
                </Text>
                <Text style={[styles.organizationDescription, { color: currentTheme.textSecondary }]}>
                  {organization?.description || '説明なし'}
                </Text>
                <View style={styles.organizationStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: currentTheme.primary }]}>
                      {members.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                      メンバー
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: currentTheme.primary }]}>
                      0
                    </Text>
                    <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                      練習予定
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 管理者コードセクション */}
            {user && organization && (
              <>
                {user.id === organization.created_by ? (
                  // 組織作成者: 管理者コード設定
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                      管理者コード設定
                    </Text>
                    <TouchableOpacity
                      style={[styles.editButton, { backgroundColor: currentTheme.secondary }]}
                      onPress={() => setShowSetAdminCode(true)}
                    >
                      <Key size={16} color={currentTheme.text} />
                      <Text style={[styles.editButtonText, { color: currentTheme.text }]}>
                        {organization.admin_code ? '変更' : '設定'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // 一般ユーザー: 管理者コード入力
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                      管理者になる
                    </Text>
                    <TouchableOpacity
                      style={[styles.editButton, { backgroundColor: currentTheme.primary }]}
                      onPress={() => setShowEnterAdminCode(true)}
                    >
                      <Crown size={16} color={currentTheme.surface} />
                      <Text style={[styles.editButtonText, { color: currentTheme.surface }]}>
                        管理者コード入力
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* 認証情報セクション（ソロモードでない場合のみ表示） */}
            {!organization?.is_solo && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                    認証情報
                  </Text>
                </View>

                <View style={[styles.credentialsCard, { backgroundColor: currentTheme.surface }]}>
              {/* 参加パスワード */}
              <View style={[styles.credentialItem, { backgroundColor: currentTheme.background }]}>
                <Text style={[styles.credentialLabel, { color: currentTheme.text }]}>
                  参加パスワード
                </Text>
                
                <Text style={[styles.credentialHint, { color: currentTheme.textSecondary }]}>
                  この画面は後からでも見れます
                </Text>
                
                <View style={[styles.credentialValueContainer, { backgroundColor: '#FFE4E1', borderColor: currentTheme.primary }]}>
                  <Text style={[styles.credentialValue, { color: '#C70039' }]}>
                    {organizationPassword}
                  </Text>
                </View>
                
                <View style={styles.credentialActions}>
                  <TouchableOpacity
                    style={[
                      styles.credentialButton, 
                      { 
                        backgroundColor: isSharing ? currentTheme.textSecondary : currentTheme.primary,
                        opacity: isSharing ? 0.6 : 1
                      }
                    ]}
                    onPress={shareCredentials}
                    disabled={isSharing}
                  >
                    <ShareIcon size={16} color={currentTheme.surface} />
                    <Text style={[styles.credentialButtonText, { color: currentTheme.surface }]}>
                      {isSharing ? '共有中...' : '共有'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.credentialButton, 
                      { 
                        backgroundColor: isSharing ? currentTheme.textSecondary : currentTheme.secondary, 
                        borderColor: currentTheme.primary, 
                        borderWidth: 1,
                        opacity: isSharing ? 0.6 : 1
                      }
                    ]}
                    onPress={copyCredentials}
                    disabled={isSharing}
                  >
                    <Copy size={16} color={currentTheme.primary} />
                    <Text style={[styles.credentialButtonText, { color: currentTheme.primary }]}>
                      {isSharing ? 'コピー中...' : 'コピー'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 管理者コード */}
              <View style={[styles.credentialItem, { backgroundColor: currentTheme.background, marginTop: 16 }]}>
                <Text style={[styles.credentialLabel, { color: currentTheme.text }]}>
                  管理者コード（4桁）
                </Text>
                
                {user && organization && user.id === organization.created_by ? (
                  // 組織作成者: 管理者コードを表示
                  <>
                    {organization.admin_code ? (
                      <>
                        <Text style={[styles.credentialHint, { color: currentTheme.textSecondary }]}>
                          設定済みの管理者コード
                        </Text>
                        <View style={[styles.credentialValueContainer, { backgroundColor: '#E3F2FD', borderColor: currentTheme.primary }]}>
                          <Text style={[styles.credentialValue, { color: '#1976D2', fontSize: 24, letterSpacing: 8 }]}>
                            {organization.admin_code}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.credentialHint, { color: currentTheme.textSecondary }]}>
                          管理者コードが設定されていません
                        </Text>
                        <TouchableOpacity
                          style={[styles.modalButton, { 
                            backgroundColor: currentTheme.primary,
                            marginTop: 12
                          }]}
                          onPress={() => setShowSetAdminCode(true)}
                        >
                          <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                            管理者コードを設定
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                ) : (
                  // 一般ユーザー: 管理者コード入力欄
                  <>
                    <Text style={[styles.credentialHint, { color: currentTheme.textSecondary }]}>
                      管理者コードを入力して管理者になります
                    </Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.textInput, { 
                          backgroundColor: currentTheme.surface,
                          color: currentTheme.text,
                          borderColor: currentTheme.secondary,
                          textAlign: 'center',
                          fontSize: 24,
                          letterSpacing: 8,
                          fontWeight: 'bold',
                          marginTop: 8
                        }]}
                        value={adminCodeForm.code}
                        onChangeText={(text) => setAdminCodeForm(prev => ({ ...prev, code: text.replace(/\D/g, '').slice(0, 4) }))}
                        placeholder="0000"
                        placeholderTextColor={currentTheme.textSecondary}
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.modalButton, { 
                        backgroundColor: currentTheme.primary,
                        opacity: (loading || adminCodeForm.code.length !== 4) ? 0.6 : 1,
                        marginTop: 12
                      }]}
                      onPress={handleEnterAdminCode}
                      disabled={loading || adminCodeForm.code.length !== 4}
                    >
                      <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                        {loading ? '認証中...' : '管理者になる'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
              </>
            )}

            {/* 危険な操作 */}
            <View style={styles.dangerZone}>
              <Text style={[styles.dangerZoneTitle, { color: '#F44336' }]}>
                危険な操作
              </Text>
              <TouchableOpacity 
                style={[styles.dangerButton, { backgroundColor: '#F44336' }]}
                onPress={deleteOrganization}
                disabled={loading}
              >
                <Trash2 size={20} color="#FFFFFF" />
                <Text style={styles.dangerButtonText}>
                  {loading ? '削除中...' : '組織を削除'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* メンバー招待モーダル */}
      <Modal
        visible={showInviteMember}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInviteMember(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                メンバーを招待
              </Text>
              <TouchableOpacity onPress={() => setShowInviteMember(false)}>
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  メールアドレス *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={inviteForm.email}
                  onChangeText={(text) => setInviteForm(prev => ({ ...prev, email: text }))}
                  placeholder="example@email.com"
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  権限
                </Text>
                <View style={styles.roleButtons}>
                  {(['member', 'leader', 'admin'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        { 
                          backgroundColor: inviteForm.role === role ? currentTheme.primary : currentTheme.background,
                          borderColor: currentTheme.secondary
                        }
                      ]}
                      onPress={() => setInviteForm(prev => ({ ...prev, role }))}
                    >
                      {getRoleIcon(role)}
                      <Text style={[
                        styles.roleButtonText,
                        { 
                          color: inviteForm.role === role ? currentTheme.surface : currentTheme.text
                        }
                      ]}>
                        {getRoleLabel(role)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { 
                  backgroundColor: currentTheme.primary,
                  opacity: loading ? 0.6 : 1
                }]}
                onPress={inviteMember}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                  {loading ? '招待中...' : 'メンバーを招待'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 組織編集モーダル */}
      <Modal
        visible={showEditOrganization}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditOrganization(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                組織情報を編集
              </Text>
              <TouchableOpacity onPress={() => setShowEditOrganization(false)}>
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  組織名 *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={orgEditForm.name}
                  onChangeText={(text) => setOrgEditForm(prev => ({ ...prev, name: text }))}
                  placeholder="組織名を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  説明
                </Text>
                <TextInput
                  style={[styles.textArea, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={orgEditForm.description}
                  onChangeText={(text) => setOrgEditForm(prev => ({ ...prev, description: text }))}
                  placeholder="組織の説明を入力"
                  placeholderTextColor={currentTheme.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { 
                  backgroundColor: currentTheme.primary,
                  opacity: loading ? 0.6 : 1
                }]}
                onPress={updateOrganization}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                  {loading ? '更新中...' : '組織情報を更新'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 管理者コード設定モーダル（組織作成者用） */}
      <Modal
        visible={showSetAdminCode}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowSetAdminCode(false);
          setAdminCodeForm({ code: '', confirmCode: '' });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                管理者コードを設定
              </Text>
              <TouchableOpacity onPress={() => {
                setShowSetAdminCode(false);
                setAdminCodeForm({ code: '', confirmCode: '' });
              }}>
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: currentTheme.textSecondary, marginBottom: 16 }]}>
                4桁の数字で管理者コードを設定してください。このコードを入力したユーザーは管理者になります。
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  管理者コード（4桁） *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary,
                    textAlign: 'center',
                    fontSize: 24,
                    letterSpacing: 8,
                    fontWeight: 'bold'
                  }]}
                  value={adminCodeForm.code}
                  onChangeText={(text) => setAdminCodeForm(prev => ({ ...prev, code: text.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="0000"
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  確認用（再入力） *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary,
                    textAlign: 'center',
                    fontSize: 24,
                    letterSpacing: 8,
                    fontWeight: 'bold'
                  }]}
                  value={adminCodeForm.confirmCode}
                  onChangeText={(text) => setAdminCodeForm(prev => ({ ...prev, confirmCode: text.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="0000"
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { 
                  backgroundColor: currentTheme.primary,
                  opacity: (loading || adminCodeForm.code.length !== 4 || adminCodeForm.confirmCode.length !== 4) ? 0.6 : 1
                }]}
                onPress={handleSetAdminCode}
                disabled={loading || adminCodeForm.code.length !== 4 || adminCodeForm.confirmCode.length !== 4}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                  {loading ? '設定中...' : '管理者コードを設定'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 管理者コード入力モーダル（一般ユーザー用） */}
      <Modal
        visible={showEnterAdminCode}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowEnterAdminCode(false);
          setAdminCodeForm({ code: '', confirmCode: '' });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                管理者コードを入力
              </Text>
              <TouchableOpacity onPress={() => {
                setShowEnterAdminCode(false);
                setAdminCodeForm({ code: '', confirmCode: '' });
              }}>
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: currentTheme.textSecondary, marginBottom: 16 }]}>
                組織作成者から提供された4桁の管理者コードを入力してください。
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  管理者コード（4桁） *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary,
                    textAlign: 'center',
                    fontSize: 24,
                    letterSpacing: 8,
                    fontWeight: 'bold'
                  }]}
                  value={adminCodeForm.code}
                  onChangeText={(text) => setAdminCodeForm(prev => ({ ...prev, code: text.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="0000"
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { 
                  backgroundColor: currentTheme.primary,
                  opacity: (loading || adminCodeForm.code.length !== 4) ? 0.6 : 1
                }]}
                onPress={handleEnterAdminCode}
                disabled={loading || adminCodeForm.code.length !== 4}
              >
                <Text style={[styles.modalButtonText, { color: currentTheme.surface }]}>
                  {loading ? '認証中...' : '管理者になる'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  tabContent: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 12,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    fontSize: 12,
  },
  memberEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 12,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  organizationCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 2,
  },
  organizationInfo: {
    alignItems: 'center',
  },
  organizationName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  organizationDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  organizationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  dangerZone: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  credentialsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  credentialItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  credentialLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  credentialHint: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  credentialValueContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  credentialInfo: {
    marginBottom: 16,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  credentialType: {
    fontSize: 14,
    fontWeight: '500',
  },
  credentialValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 2,
  },
  credentialActions: {
    flexDirection: 'row',
    gap: 8,
  },
  credentialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    flex: 1,
  },
  credentialButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
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
  closeButton: {
    fontSize: 24,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});
