import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import type { useRouter } from 'expo-router';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  router?: ReturnType<typeof useRouter>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 予期せぬクラッシュ時に、原因を隠さず復旧手段を見せる
 * （以前は空画面のままログインへ飛ばしており、テスターに原因が伝わらなかった）
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorHandler.handle(error, 'GlobalErrorBoundary', true);
    logger.error('Global Error Boundary caught an error:', { error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined });
    try {
      this.props.router?.replace('/(tabs)' as never);
    } catch (navError) {
      logger.error('GlobalErrorBoundary: ホーム遷移に失敗:', navError);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const message =
        this.state.error?.message?.trim() ||
        '予期しないエラーが発生しました。もう一度お試しください。';

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.title}>問題が発生しました</Text>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>再試行</Text>
            </TouchableOpacity>
            {!!this.props.router && (
              <TouchableOpacity style={styles.secondaryButton} onPress={this.handleGoHome} activeOpacity={0.8}>
                <Text style={styles.secondaryButtonText}>ホームに戻る</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 400,
    paddingVertical: 48,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 15,
    fontWeight: '500',
  },
});
