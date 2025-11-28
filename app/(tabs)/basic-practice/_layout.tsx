/**
 * basic-practiceディレクトリのレイアウトファイル
 * このディレクトリ内のコンポーネント、データ、フック、ユーティリティファイルが
 * ルートとして認識されないようにするためのレイアウト
 */

import { Stack } from 'expo-router';

export default function BasicPracticeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

