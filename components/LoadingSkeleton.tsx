import React from 'react';
import { View, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  fullScreen?: boolean; // フルスクリーンのローディング表示
}

export default function LoadingSkeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  fullScreen = false
}: LoadingSkeletonProps) {
  // テーマが取得できない場合は透過または親の背景色を使用
  let currentTheme;
  try {
    const themeContext = useInstrumentTheme();
    currentTheme = themeContext.currentTheme;
  } catch (error) {
    // テーマコンテキストが利用できない場合は透過（親の背景色を使用）
    currentTheme = {
      surfaceSecondary: 'transparent',
      surface: 'transparent',
      background: 'transparent',
      primary: '#1976D2',
    };
  }
  
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true, // opacityアニメーションはネイティブドライバーで処理可能
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true, // opacityアニメーションはネイティブドライバーで処理可能
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // フルスクリーンのローディング表示
  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: currentTheme.background || 'transparent' }]}>
        <ActivityIndicator size="large" color={currentTheme.primary || '#1976D2'} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: currentTheme.surfaceSecondary || 'transparent',
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});



