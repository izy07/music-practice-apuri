/**
 * 組織情報タブコンポーネント
 * 
 * 組織の基本情報、管理者コード設定、認証情報を表示
 * 
 * @module app/organization-settings/components/OrganizationInfoTab
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform, Alert } from 'react-native';
import { Edit3, Trash2, Key, Crown, Share as ShareIcon, Copy } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import type { Organization } from '@/types/organization';
import type { SubGroup, UserGroupMembership } from '@/types/organization';

interface OrganizationInfoTabProps {
  organization: Organization | null;
  subGroups: SubGroup[];
  members: UserGroupMembership[];
  organizationPassword: string;
  isSharing: boolean;
  loading: boolean;
  isCreator: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetAdminCode: () => void;
  onEnterAdminCode: () => void;
  onShareCredentials: () => void;
  onCopyCredentials: () => void;
}

/**
 * 組織情報タブ
 */
export function OrganizationInfoTab({
  organization,
  subGroups,
  members,
  organizationPassword,
  isSharing,
  loading,
  isCreator,
  onEdit,
  onDelete,
  onSetAdminCode,
  onEnterAdminCode,
  onShareCredentials,
  onCopyCredentials,
}: OrganizationInfoTabProps) {
  const { currentTheme } = useInstrumentTheme();

  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
          組織情報
        </Text>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: currentTheme.secondary }]}
          onPress={onEdit}
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
                {subGroups.length}
              </Text>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>
                サブグループ
              </Text>
            </View>
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
      {organization && (
        <>
          {isCreator ? (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                管理者コード設定
              </Text>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: currentTheme.secondary }]}
                onPress={onSetAdminCode}
              >
                <Key size={16} color={currentTheme.text} />
                <Text style={[styles.editButtonText, { color: currentTheme.text }]}>
                  {organization.admin_code ? '変更' : '設定'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                管理者になる
              </Text>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: currentTheme.primary }]}
                onPress={onEnterAdminCode}
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
            <View style={[styles.credentialItem, { backgroundColor: currentTheme.background }]}>
              <Text style={[styles.credentialLabel, { color: currentTheme.text }]}>
                参加情報
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
                  onPress={onShareCredentials}
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
                  onPress={onCopyCredentials}
                  disabled={isSharing}
                >
                  <Copy size={16} color={currentTheme.primary} />
                  <Text style={[styles.credentialButtonText, { color: currentTheme.primary }]}>
                    {isSharing ? 'コピー中...' : 'コピー'}
                  </Text>
                </TouchableOpacity>
              </View>
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
          onPress={onDelete}
          disabled={loading}
        >
          <Trash2 size={20} color="#FFFFFF" />
          <Text style={styles.dangerButtonText}>
            {loading ? '削除中...' : '組織を削除'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  organizationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  organizationInfo: {
    flex: 1,
  },
  organizationName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  organizationDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  organizationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  credentialsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  credentialItem: {
    padding: 16,
    borderRadius: 8,
  },
  credentialLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  credentialHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  credentialValueContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 12,
  },
  credentialValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
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
  dangerZone: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
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
});

// デフォルトエクスポートを追加（Expo Routerの警告を抑制）
export default OrganizationInfoTab;

