import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// 共通スタイル定数
export const COMMON_STYLES = {
  // 色
  colors: {
    primary: '#8B4513',
    secondary: '#D2691E',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#333333',
    textSecondary: '#666666',
    border: '#E0E0E0',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
  },
  
  // スペーシング
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  
  // フォントサイズ
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  
  // ボーダー半径
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50,
  },
  
  // シャドウ
  shadow: {
    small: {
      elevation: 2,
    },
    medium: {
      elevation: 4,
    },
    large: {
      elevation: 8,
    },
  },
};

// 画面サイズに応じたスケーリング
export const getScaledSize = (baseSize: number, smallScreenFactor: number = 0.8) => {
  const isSmallScreen = width < 375 || height < 667;
  return isSmallScreen ? baseSize * smallScreenFactor : baseSize;
};

export const getScaledSpacing = (baseSpacing: number, smallScreenFactor: number = 0.7) => {
  const isSmallScreen = width < 375 || height < 667;
  return isSmallScreen ? baseSpacing * smallScreenFactor : baseSpacing;
};

// 共通スタイル
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COMMON_STYLES.colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COMMON_STYLES.colors.surface,
    borderRadius: COMMON_STYLES.borderRadius.lg,
    padding: COMMON_STYLES.spacing.md,
    ...COMMON_STYLES.shadow.small,
  },
  button: {
    backgroundColor: COMMON_STYLES.colors.primary,
    borderRadius: COMMON_STYLES.borderRadius.md,
    paddingVertical: COMMON_STYLES.spacing.sm,
    paddingHorizontal: COMMON_STYLES.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COMMON_STYLES.colors.background,
    fontSize: COMMON_STYLES.fontSize.md,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: COMMON_STYLES.colors.border,
    borderRadius: COMMON_STYLES.borderRadius.md,
    paddingVertical: COMMON_STYLES.spacing.sm,
    paddingHorizontal: COMMON_STYLES.spacing.md,
    fontSize: COMMON_STYLES.fontSize.md,
    backgroundColor: COMMON_STYLES.colors.background,
  },
  text: {
    fontSize: COMMON_STYLES.fontSize.md,
    color: COMMON_STYLES.colors.text,
  },
  textSecondary: {
    fontSize: COMMON_STYLES.fontSize.sm,
    color: COMMON_STYLES.colors.textSecondary,
  },
  title: {
    fontSize: COMMON_STYLES.fontSize.xl,
    fontWeight: '700',
    color: COMMON_STYLES.colors.text,
  },
  subtitle: {
    fontSize: COMMON_STYLES.fontSize.lg,
    fontWeight: '600',
    color: COMMON_STYLES.colors.text,
  },
});

// Design tokens（余白・角丸・影）
export const TOKENS = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  elevation: { sm: 2, md: 4, lg: 8 },
} as const;
