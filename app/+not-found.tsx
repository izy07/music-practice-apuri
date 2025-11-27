import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  
  const handleGoHome = () => {
    // Web環境では、ベースパスを考慮してルートに遷移
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const basePath = '/music-practice-apuri';
      const currentPath = window.location.pathname;
      const pathWithoutBase = currentPath.startsWith(basePath) 
        ? currentPath.replace(basePath, '') || '/' 
        : currentPath;
      
      // ルートパスに遷移（認証フローで適切な画面にリダイレクトされる）
      router.replace('/' as any);
    } else {
      router.replace('/' as any);
    }
  };
  
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <TouchableOpacity onPress={handleGoHome} style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 600,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
