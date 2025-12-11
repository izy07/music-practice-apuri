/**
 * アプリルーター - 世に出回っているアプリの一般的なパターン
 * 
 * ⚠️ 非推奨: このコンポーネントは使用されていません。
 * 代わりに `app/_layout.tsx` で `useAuthAdvanced` を使用したルーティングが実装されています。
 * 
 * 特徴:
 * - 認証状態に基づいてルーティング
 * - 新規登録画面は認証状態に依存しない
 * - 認証成功時は自動的にメインアプリに遷移
 * 
 * @deprecated このコンポーネントは非推奨です。`app/_layout.tsx`の実装を使用してください。
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import logger from '@/lib/logger';

export const AppRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isInitialized } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    logger.debug('ルーティング状態チェック:', {
      user: user?.email || 'none',
      isLoading,
      isInitialized,
      segments,
    });

    // 初期化中は何もしない
    if (!isInitialized || isLoading) {
      logger.debug('初期化中または読み込み中');
      return;
    }

    // 新規登録画面にいる場合は何もしない（認証状態に依存しない）
    if (segments.includes('signup')) {
      logger.debug('新規登録画面 - 認証状態に依存しない');
      return;
    }

    // チュートリアル画面にいる場合は新規登録直後の可能性があるため、認証チェックをスキップ
    if (segments.includes('tutorial')) {
      logger.debug('チュートリアル画面 - 新規登録直後の可能性があるため認証チェックをスキップ');
      return;
    }

    // 認証されていない場合は認証画面に遷移
    if (!user) {
      logger.debug('未認証 - 認証画面に遷移');
      router.replace('/auth/login');
      return;
    }

    // 認証済みの場合はメインアプリに遷移
    logger.debug('認証済み - メインアプリに遷移');
    router.replace('/(tabs)');
  }, [user, isLoading, isInitialized, segments, router]);

  return <>{children}</>;
};
