/**
 * basic-practiceディレクトリのレイアウトファイル
 * このディレクトリ内のコンポーネントがルートとして認識されないようにするためのレイアウト
 * Screen名を明示的に指定して重複を避ける
 */

import { Stack } from 'expo-router';

export default function BasicPracticeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* index.tsxを明示的に登録（Screen名を指定） */}
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

