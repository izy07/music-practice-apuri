/**
 * ネイティブ起動の必須ラッパー（gesture / safe area）
 */
import React, { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

type RootAppShellProps = {
  children: ReactNode;
};

export function RootAppShell({ children }: RootAppShellProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
