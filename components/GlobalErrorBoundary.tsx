import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { redirectToLogin } from '@/lib/navigationUtils';
import type { useRouter } from 'expo-router';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  router?: ReturnType<typeof useRouter>;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorHandler.handle(error, 'GlobalErrorBoundary', false);
    logger.error('Global Error Boundary caught an error:', { error, errorInfo });
    this.setState({ errorInfo });
    
    // エラー発生時にログイン画面に遷移
    if (this.props.router) {
      try {
        redirectToLogin(this.props.router, 'GlobalErrorBoundary: エラー発生によりログイン画面にリダイレクト');
      } catch (redirectError) {
        logger.error('GlobalErrorBoundary: ログイン画面への遷移に失敗しました:', redirectError);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // エラー画面は表示せず、ログイン画面に遷移するため何も表示しない
      // 遷移が完了するまでの間、空のViewを表示
      return <View style={styles.container} />;
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
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonIcon: {
    fontSize: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
