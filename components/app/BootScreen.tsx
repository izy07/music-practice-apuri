/**
 * 冷起動・初期化待ちの共通 UI
 * 白一色に見えないよう背景色を付け、ビルド情報を表示する
 */
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { getBuildStamp, getStartupPhase } from '@/lib/startupDiagnostics';

type BootScreenProps = {
  message?: string;
};

export function BootScreen({ message }: BootScreenProps) {
  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/icon.png')} style={styles.icon} resizeMode="contain" />
      <Text style={styles.title}>楽器練習アプリ</Text>
      <ActivityIndicator size="large" color="#1976D2" style={styles.loader} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Text style={styles.phase}>起動中 ({getStartupPhase()})</Text>
      <Text style={styles.stamp}>{getBuildStamp()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 24,
  },
  icon: {
    width: 96,
    height: 96,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 24,
  },
  loader: {
    marginBottom: 12,
  },
  message: {
    fontSize: 13,
    color: '#1565C0',
    textAlign: 'center',
    marginBottom: 8,
  },
  phase: {
    fontSize: 11,
    color: '#546E7A',
    marginTop: 4,
  },
  stamp: {
    fontSize: 10,
    color: '#78909C',
    marginTop: 8,
    textAlign: 'center',
  },
});
