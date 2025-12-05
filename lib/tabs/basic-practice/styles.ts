import { StyleSheet } from 'react-native';
import { createShadowStyle } from '@/lib/shadowStyles';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
    paddingTop: 20,
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  levelTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  levelTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  levelFixedNotice: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  basicInfoSection: {
    margin: 16,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 2,
    elevation: 3,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
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
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 20,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1E4C7',
    backgroundColor: '#FEF8EA',
    gap: 16,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#E6B756',
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    }),
  },
  practiceList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    }),
  },
  compactCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactCardLeft: {
    flex: 1,
  },
  compactCardRight: {
    width: 40,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  levelSelectionContainer: {
    gap: 12,
  },
  levelSelectionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  levelSelectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  levelSelectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...createShadowStyle({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  detailCloseButton: {
    padding: 8,
  },
  detailCloseText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailSectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  youtubeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stepItem: {
    marginBottom: 8,
    paddingLeft: 8,
  },
  stepText: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  detailInfoCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  detailInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailInfoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  detailPointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  detailPointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailActions: {
    marginTop: 8,
  },
  detailStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  detailStartButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

