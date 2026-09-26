/**
 * 起動失敗時に必ず見える全画面 UI（ErrorBoundary 以前のエラーもここへ）
 */
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getBuildStamp } from '@/lib/startupDiagnostics';

type StartupFailureScreenProps = {
  title?: string;
  message: string;
  detail?: string | null;
};

export function StartupFailureScreen({
  title = 'アプリを起動できませんでした',
  message,
  detail,
}: StartupFailureScreenProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        <Text style={styles.hint}>
          この画面をスクリーンショットして開発者に送ってください。
          同じ操作を繰り返しても改善しない場合は、一度アプリをアンインストールしてから再インストールしてください。
        </Text>
        <Text style={styles.stamp}>{getBuildStamp()}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF3E0',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#BF360C',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#4E342E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  detail: {
    fontSize: 12,
    color: '#5D4037',
    backgroundColor: '#FFE0B2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  hint: {
    fontSize: 13,
    color: '#6D4C41',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  stamp: {
    fontSize: 11,
    color: '#8D6E63',
    textAlign: 'center',
  },
});
