/**
 * 基礎練習画面のスタイル定義
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  levelTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  levelTabText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  levelTabExperience: {
    fontSize: 11,
    fontWeight: '400',
  },
  practiceList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  levelFixedNotice: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 0,
  },
  practiceCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 24,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  videoButton: {
    padding: 10,
    borderRadius: 12,
    marginLeft: 12,
    elevation: 3,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  pointsSection: {
    marginBottom: 16,
  },
  pointsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pointsList: {
    gap: 6,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pointText: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  morePointsText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  levelSelectionContainer: {
    gap: 16,
    marginBottom: 24,
  },
  levelSelectionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  levelSelectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  levelSelectionExperience: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  levelSelectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalButtons: {
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // コンパクトカードスタイル
  compactCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  compactCardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactCardLeft: {
    flex: 1,
  },
  compactCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  compactCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  compactCardRight: {
    marginLeft: 12,
  },
  // 詳細モーダルスタイル
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailModalContent: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailCloseButton: {
    padding: 8,
    width: 40,
  },
  detailCloseText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  detailHeaderSpacer: {
    width: 40,
  },
  detailBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailSectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  youtubeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepItem: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  detailInfoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailInfoLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  detailInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  detailPointBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  detailPointText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailActions: {
    marginTop: 20,
    marginBottom: 40,
  },
  detailStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  detailStartButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // 基礎情報セクションのスタイル
  basicInfoSection: {
    margin: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
  },
  basicInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  basicInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  basicInfoContent: {
    padding: 12,
    paddingTop: 8,
  },
  basicInfoItem: {
    marginBottom: 12,
  },
  basicInfoItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cameraButton: {
    padding: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    marginLeft: -4,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
    marginRight: 8,
  },
  basicInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  basicInfoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  basicInfoTips: {
    marginTop: 4,
  },
  basicInfoTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  basicInfoTipBullet: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  basicInfoTipText: {
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
});

