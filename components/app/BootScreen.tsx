/**
 * 冷起動・初期化待ちの共通 UI
 */
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    color: '#212121',
    marginBottom: 24,
  },
  loader: {
    marginBottom: 12,
  },
  message: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
  },
});
