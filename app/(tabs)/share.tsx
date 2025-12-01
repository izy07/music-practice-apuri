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
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }
    
    if (!createForm.name.trim()) {
      Alert.alert('エラー', '組織名を入力してください');
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
      Alert.alert('エラー', '組織名を入力してください');
      return;
    }

    const foundOrgs = await searchOrgs(joinForm.searchName.trim());
    
    if (foundOrgs.length === 0) {
      Alert.alert('検索結果', '該当する組織が見つかりませんでした');
    } else if (foundOrgs.length === 1) {
      setJoinForm(prev => ({ ...prev, selectedOrg: foundOrgs[0] }));
    } else {
      // 複数の組織が見つかった場合の選択処理
      const orgNames = foundOrgs.map(org => org.name);
      Alert.alert('複数の組織が見つかりました', orgNames.join('\n'));
    }
  };

  // 組織参加
  const handleJoinOrganization = async () => {
    if (!joinForm.selectedOrg || !joinForm.password.trim()) {
      Alert.alert('エラー', '組織とパスワードを入力してください');
      return;
    }

    const organization = await joinOrg({
      organizationId: joinForm.selectedOrg.id,
      password: joinForm.password.trim(),
    });

    if (organization) {
      Alert.alert('成功', '組織に参加しました！');
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
      const message = `音楽団体への参加パスワード: ${password}\n\nこのパスワードを使って組織に参加してください。`;
      await Share.share({
        message: message,
        title: '参加パスワードの共有',
      });
    } catch (error) {
      ErrorHandler.handle(error, 'パスワード共有', false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await Share.share({
        message: text,
        title: `${type}をコピー`,
      });
      Alert.alert('コピー完了', `${type}がクリップボードにコピーされました`);
    } catch (error) {
      ErrorHandler.handle(error, 'コピー', false);
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
            音楽団体管理
          </Text>
          <Text style={[styles.headerSubtitle, { color: currentTheme.textSecondary }]}>
            練習日程・出欠席・課題を効率的に管理
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
              新しい組織を作成
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary, borderWidth: 2 }]}
            onPress={() => setShowJoinOrg(true)}
          >
            <Users size={20} color={currentTheme.primary} />
            <Text style={[styles.actionButtonText, { color: currentTheme.primary }]}>
              組織に参加
            </Text>
          </TouchableOpacity>
        </View>

        {/* 組織一覧 */}
        <View style={styles.content}>
          <View style={styles.organizationsContainer}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>参加中の組織</Text>
            
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
                <Text style={[styles.overviewTitle, { color: currentTheme.text }]}>全組織</Text>
                <Text style={[styles.overviewSubtitle, { color: currentTheme.textSecondary }]}>参加中の全組織の練習日程・出欠登録・課題を表示</Text>
              </View>
              <View style={styles.overviewAction}>
                <Text style={[styles.overviewActionText, { color: currentTheme.primary }]}>開く</Text>
              </View>
            </TouchableOpacity>
            
            {/* 個別組織一覧 */}
            <Text style={[styles.sectionTitle, { color: currentTheme.text, marginTop: 24, marginBottom: 12, fontSize: 16 }]}>個別組織</Text>
            {loading ? (
              <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>読み込み中...</Text>
            ) : organizations.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: currentTheme.surface }]}> 
                <Users size={40} color={currentTheme.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: currentTheme.text }]}>まだ組織に参加していません</Text>
                <Text style={[styles.emptyStateText, { color: currentTheme.textSecondary }]}>新しい組織を作成するか、既存の組織に招待を受けてください</Text>
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
                      {org.description || '説明なし'}
                    </Text>
                    <Text style={[styles.orgDate, { color: currentTheme.primary }]}>
                      {`作成日: ${org.created_at ? new Date(org.created_at).toLocaleDateString('ja-JP') : '不明'}`}
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
            主な機能
          </Text>
          
          <View style={[styles.featureCard, { backgroundColor: currentTheme.surface }]}>
            <Calendar size={24} color={currentTheme.primary} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: currentTheme.text }]}>
                練習日程管理
              </Text>
              <Text style={[styles.featureDescription, { color: currentTheme.textSecondary }]}>
                月間カレンダーで練習日を管理し、合奏・パート練・イベントを色分け表示
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, { backgroundColor: currentTheme.surface }]}>
            <CheckSquare size={24} color={currentTheme.primary} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: currentTheme.text }]}>
                出欠席管理
              </Text>
              <Text style={[styles.featureDescription, { color: currentTheme.textSecondary }]}> 
                練習日の5日前から当日まで出欠を登録。メンバーも集計結果を確認可能
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, { backgroundColor: currentTheme.surface }]}>
            <Settings size={24} color={currentTheme.primary} />
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: currentTheme.text }]}>
                課題管理
              </Text>
              <Text style={[styles.featureDescription, { color: currentTheme.textSecondary }]}>
                パートリーダーが練習課題を登録し、メンバーの進捗を把握
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
                新しい組織を作成
              </Text>
              <TouchableOpacity onPress={() => setShowCreateOrg(false)}>
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
                  value={createForm.name}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, name: text }))}
                  placeholder="例：上智大学管弦楽部"
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
                    ソロモードで作成する
                  </Text>
                </View>
                {!createForm.isSolo && (
                  <Text style={[styles.inputHelper, { color: currentTheme.textSecondary, marginTop: 8 }]}>
                    ※ 参加パスワードは自動生成されます。組織作成後に表示されます。
                  </Text>
                )}
                {createForm.isSolo && (
                  <Text style={[styles.inputHelper, { color: currentTheme.textSecondary, marginTop: 8 }]}>
                    ※ ソロモードでは、パスワードや招待コードは不要です。個人で管理する組織を作成します。
                  </Text>
                )}
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
                  value={createForm.description}
                  onChangeText={(text) => setCreateForm(prev => ({ ...prev, description: text }))}
                  placeholder="組織の説明を入力"
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
                  {loading ? '作成中...' : '組織を作成'}
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
                組織に参加
              </Text>
              <TouchableOpacity onPress={() => setShowJoinOrg(false)}>
                <Text style={[styles.closeButton, { color: currentTheme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* 組織検索 */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                  組織名で検索 *
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
                    placeholder="例：上智大学管弦楽部"
                    placeholderTextColor={currentTheme.textSecondary}
                  />
                  <TouchableOpacity
                    style={[styles.searchButton, { backgroundColor: currentTheme.primary }]}
                    onPress={handleSearchOrganizations}
                    disabled={loading}
                  >
                    <Text style={[styles.searchButtonText, { color: currentTheme.surface }]}>
                      検索
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {joinForm.selectedOrg && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: currentTheme.text }]}>
                    選択された組織
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
                  参加パスワード *
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: currentTheme.background,
                    color: currentTheme.text,
                    borderColor: currentTheme.secondary
                  }]}
                  value={joinForm.password}
                  onChangeText={(text) => setJoinForm(prev => ({ ...prev, password: text }))}
                  placeholder="8桁の数字"
                  placeholderTextColor={currentTheme.textSecondary}
                  keyboardType="numeric"
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
                  {loading ? '参加中...' : '組織に参加'}
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
                🎉 組織作成完了！
              </Text>
            </View>
            
            <ScrollView style={styles.successContent}>
              <Text style={[styles.successMessage, { color: currentTheme.text }]}>
                組織「{createdOrgInfo?.name}」が正常に作成されました。
              </Text>
              
              {/* ソロモードでない場合のみパスワードと招待コードを表示 */}
              {!createdOrgInfo?.isSolo && (
                <>
              <View style={[styles.infoCard, { backgroundColor: currentTheme.background }]}>
                <Text style={[styles.infoTitle, { color: currentTheme.text }]}>
                  参加パスワード
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
                      共有
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: currentTheme.secondary, borderColor: currentTheme.primary, borderWidth: 1 }]}
                    onPress={() => copyToClipboard(createdOrgInfo?.password || '', 'パスワード')}
                  >
                    <Copy size={16} color={currentTheme.primary} />
                    <Text style={[styles.shareButtonText, { color: currentTheme.primary }]}>
                      コピー
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={[styles.noteCard, { backgroundColor: currentTheme.secondary }]}>
                <Text style={[styles.noteText, { color: currentTheme.textSecondary }]}>
                  💡 このパスワードをメンバーに共有してください。メンバーはこのパスワードを使って組織に参加できます。
                </Text>
              </View>
                </>
              )}
              
              {createdOrgInfo?.isSolo && (
                <View style={[styles.noteCard, { backgroundColor: currentTheme.secondary }]}>
                  <Text style={[styles.noteText, { color: currentTheme.textSecondary }]}>
                    🎵 ソロモードで作成されました。個人で練習を管理できます。
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
                  完了
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
                全組織メニュー
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
                  <Text style={[styles.menuTitle, { color: currentTheme.text }]}>練習日程</Text>
                  <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]}>参加中の全組織の練習日程をカレンダーで表示</Text>
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
                  <Text style={[styles.menuTitle, { color: currentTheme.text }]}>全組織の出欠登録</Text>
                  <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]}>参加中の全組織の出欠登録可能な日程を一覧表示</Text>
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
                  <Text style={[styles.menuTitle, { color: currentTheme.text }]}>全組織の課題一覧</Text>
                  <Text style={[styles.menuSubtitle, { color: currentTheme.textSecondary }]}>参加中の全組織の課題を一覧表示</Text>
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
