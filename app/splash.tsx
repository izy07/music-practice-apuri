/**
 * スプラッシュ画面
 * 
 * アプリ起動時に表示される画面。
 * 認証状態と課金状態の確認が完了するまで表示されます。
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthAdvanced } from '@/hooks/useAuthAdvanced';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import logger from '@/lib/logger';

const MIN_DISPLAY_TIME_MS = 1000; // 最小表示時間（1秒）

export default function SplashScreen() {
  const router = useRouter();
  const { isInitialized, isAuthenticated } = useAuthAdvanced();
  const { loading: subscriptionLoading } = useSubscriptionContext();
  const { isReady } = useFrameworkReady();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const startTimeRef = useRef<number>(Date.now());
  const hasNavigatedRef = useRef<boolean>(false);

  // フェードインアニメーション
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // 初期化完了を待って画面遷移
  useEffect(() => {
    // フレームワークが準備完了していない場合は待機
    if (!isReady) {
      return;
    }

    // 認証状態と課金状態の両方が初期化完了しているか確認
    const isAuthReady = isInitialized;
    const isSubscriptionReady = !subscriptionLoading;
    const isAllReady = isAuthReady && isSubscriptionReady;

    if (!isAllReady) {
      logger.debug('スプラッシュ画面: 初期化待機中', {
        isReady,
        isAuthReady,
        isSubscriptionReady,
      });
      return;
    }

    // 最小表示時間を確保
    const elapsedTime = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, MIN_DISPLAY_TIME_MS - elapsedTime);

    if (hasNavigatedRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (hasNavigatedRef.current) {
        return;
      }
      hasNavigatedRef.current = true;

      // フェードアウトアニメーション
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 認証状態に応じて画面遷移
        // 実際の画面遷移は _layout.tsx の useEffect で処理されるため、
        // ここでは何もしない（スプラッシュ画面が非表示になるだけ）
        logger.debug('スプラッシュ画面: 初期化完了、画面遷移を待機');
      });
    }, remainingTime);

    return () => {
      clearTimeout(timer);
    };
  }, [isReady, isInitialized, subscriptionLoading, fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* アプリアイコン */}
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        
        {/* アプリ名 */}
        <Text style={styles.appName}>楽器練習アプリ</Text>
        
        {/* ローディングインジケーター */}
        <ActivityIndicator
          size="large"
          color="#1976D2"
          style={styles.loader}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 32,
  },
  loader: {
    marginTop: 16,
  },
});
