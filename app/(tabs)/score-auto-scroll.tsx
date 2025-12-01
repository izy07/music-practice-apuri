import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import logger from '@/lib/logger';

// Web環境ではexpo-document-pickerとexpo-file-systemをインポートしない
let DocumentPicker: any = null;
let FileSystem: any = null;
let AuthSession: any = null;

if (Platform.OS !== 'web') {
  try {
    DocumentPicker = require('expo-document-picker');
    FileSystem = require('expo-file-system');
    AuthSession = require('expo-auth-session');
  } catch (error) {
    logger.warn('expo-document-picker, expo-file-system, or expo-auth-session not available:', error);
  }
}

export default function ScoreAutoScrollScreen() {
  const router = useRouter();
  const { currentTheme } = useInstrumentTheme();
  const { entitlement } = useSubscription();
  const webviewRef = React.useRef<WebView>(null);

  const [inputUrl, setInputUrl] = React.useState<string>('');
  const [pdfUrl, setPdfUrl] = React.useState<string>('');
  const [isScrolling, setIsScrolling] = React.useState<boolean>(false);
  const [speedPxPerSec, setSpeedPxPerSec] = React.useState<number>(60); // 1秒あたりのスクロール量(px)
  const intervalMs = 50; // setInterval間隔

  const pxPerTick = React.useMemo(() => Math.max(0, (speedPxPerSec * intervalMs) / 1000), [speedPxPerSec]);

  type LocalDoc = { uri: string; name?: string; base64?: string };
  const [localDocs, setLocalDocs] = React.useState<LocalDoc[]>([]);
  const [currentDocIndex, setCurrentDocIndex] = React.useState<number>(0);
  const [driveToken, setDriveToken] = React.useState<string | null>(null);
  const [driveFiles, setDriveFiles] = React.useState<Array<{ id: string; name: string; size?: number }>>([]);
  const [showDriveModal, setShowDriveModal] = React.useState<boolean>(false);
  const [driveSelected, setDriveSelected] = React.useState<Record<string, boolean>>({});

  const buildHtml = (url: string) => {
    // Google Docs Viewer経由でリモートPDFを埋め込み（CORS回避）。ローカル/直接URLは <embed> を試行。
    const isRemote = /^https?:\/\//.test(url);
    const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
    const embedHtml = isRemote
      ? `<iframe src="${viewerUrl}" style="width:100%;height:100%;border:0;"></iframe>`
      : `<embed src="${url}" type="application/pdf" style="width:100%;height:100%;" />`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body { margin:0; padding:0; height:100%; overflow:auto; background:#ffffff; }
    #root { position:relative; width:100%; height:100%; }
  </style>
</head>
<body>
  <div id="root">${embedHtml}</div>
  <script>
    (function(){
      window.__scrollTimer = null;
      window.__scrollRafId = null;
      function stopAutoScroll(){
        if (window.__scrollTimer){ clearInterval(window.__scrollTimer); window.__scrollTimer = null; }
        if (window.__scrollRafId){ cancelAnimationFrame(window.__scrollRafId); window.__scrollRafId = null; }
      }
      function startAutoScroll(pxPerTick, intervalMs){
        stopAutoScroll();
        // requestAnimationFrameでスムーズに、間引き用にintervalMsを尊重
        var last = performance.now();
        function tick(now){
          if (!window.__scrollRafId) return; // 停止時
          if (now - last >= intervalMs){
            last = now;
            try { window.scrollBy(0, pxPerTick); } catch (e) {}
          }
          window.__scrollRafId = requestAnimationFrame(tick);
        }
        window.__scrollRafId = requestAnimationFrame(tick);
      }
      window.startAutoScroll = startAutoScroll;
      window.stopAutoScroll = stopAutoScroll;
      true;
    })();
  </script>
</body>
</html>`;
  };

  const buildHtmlForBase64 = (base64: string) => {
    const dataUrl = `data:application/pdf;base64,${base64}`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body { margin:0; padding:0; height:100%; overflow:auto; background:#ffffff; }
    #root { position:relative; width:100%; height:100%; }
  </style>
</head>
<body>
  <div id="root"><embed src="${dataUrl}" type="application/pdf" style="width:100%;height:100%;" /></div>
  <script>
    (function(){
      window.__scrollTimer = null;
      window.__scrollRafId = null;
      function stopAutoScroll(){
        if (window.__scrollTimer){ clearInterval(window.__scrollTimer); window.__scrollTimer = null; }
        if (window.__scrollRafId){ cancelAnimationFrame(window.__scrollRafId); window.__scrollRafId = null; }
      }
      function startAutoScroll(pxPerTick, intervalMs){
        stopAutoScroll();
        var last = performance.now();
        function tick(now){
          if (!window.__scrollRafId) return;
          if (now - last >= intervalMs){
            last = now;
            try { window.scrollBy(0, pxPerTick); } catch (e) {}
          }
          window.__scrollRafId = requestAnimationFrame(tick);
        }
        window.__scrollRafId = requestAnimationFrame(tick);
      }
      window.startAutoScroll = startAutoScroll;
      window.stopAutoScroll = stopAutoScroll;
      true;
    })();
  </script>
</body>
</html>`;
  };

  const handleLoadPdf = () => {
    if (!inputUrl.trim()) {
      Alert.alert('エラー', 'PDFのURLを入力してください');
      return;
    }
    setPdfUrl(inputUrl.trim());
  };

  const handleStart = () => {
    if (!webviewRef.current) return;
    const js = `window.startAutoScroll(${pxPerTick.toFixed(2)}, ${intervalMs}); true;`;
    webviewRef.current.injectJavaScript(js);
    setIsScrolling(true);
  };

  const handleStop = () => {
    if (!webviewRef.current) return;
    const js = `window.stopAutoScroll && window.stopAutoScroll(); true;`;
    webviewRef.current.injectJavaScript(js);
    setIsScrolling(false);
  };

  const changeSpeed = (delta: number) => {
    setSpeedPxPerSec((prev) => {
      const next = Math.max(0, Math.min(500, prev + delta));
      return next;
    });
  };

  const ensureDocLoaded = async (index: number) => {
    if (!localDocs[index]) return;
    if (localDocs[index].base64) return;
    if (Platform.OS === 'web' || !FileSystem) {
      Alert.alert('エラー', 'Web環境ではファイル読み込み機能は利用できません');
      return;
    }
    try {
      const b64 = await FileSystem.readAsStringAsync(localDocs[index].uri, { encoding: FileSystem.EncodingType.Base64 });
      setLocalDocs((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], base64: b64 };
        return copy;
      });
    } catch (e) {
      Alert.alert('読み込みエラー', 'PDFの読み込みに失敗しました');
    }
  };

  const pickLocalPdfs = async () => {
    if (Platform.OS === 'web' || !DocumentPicker) {
      Alert.alert('エラー', 'Web環境ではファイル選択機能は利用できません');
      return;
    }
    try {
      const maxFiles = entitlement?.isEntitled ? 50 : 5;
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
      if ((result as any).canceled) return;
      const assets = (result as any).assets || [];
      const files = assets.slice(0, maxFiles).map((a: any) => ({ uri: a.uri as string, name: a.name as string | undefined }));
      if (assets.length > maxFiles) {
        Alert.alert('お知らせ', `現在のプランでは一度に最大${maxFiles}ファイルまで選択できます。先頭${maxFiles}件を読み込みます。`);
      }
      setLocalDocs(files);
      setCurrentDocIndex(0);
      if (files.length > 0) {
        await ensureDocLoaded(0);
      }
    } catch (e) {
      Alert.alert('エラー', 'ファイル選択に失敗しました');
    }
  };

  const clearLocal = () => {
    setLocalDocs([]);
    setCurrentDocIndex(0);
  };

  const currentHtmlSource = () => {
    const hasLocal = localDocs.length > 0 && localDocs[currentDocIndex];
    if (hasLocal) {
      const doc = localDocs[currentDocIndex];
      if (doc.base64) return { html: buildHtmlForBase64(doc.base64) } as const;
      return { html: '<html><body>読み込み中...</body></html>' } as const;
    }
    return { html: buildHtml(pdfUrl) } as const;
  };

  const ensureGoogleClientId = (): string | null => {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID as string | undefined;
    if (!clientId) {
      Alert.alert('設定が必要', 'EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID を設定してください');
      return null;
    }
    return clientId;
  };

  const authorizeDrive = async () => {
    if (Platform.OS === 'web') {
      logger.warn('Google Drive authorization is not available on web');
      return;
    }
    const clientId = ensureGoogleClientId();
    if (!clientId || !AuthSession) return;
    try {
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const result = await AuthSession.startAsync({
        authUrl:
          'https://accounts.google.com/o/oauth2/v2/auth' +
          `?response_type=token&client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')}`,
      });
      if ((result as any).type === 'success') {
        const accessToken = (result as any).params?.access_token;
        if (accessToken) {
          setDriveToken(accessToken);
          return accessToken;
        }
      }
      Alert.alert('認可エラー', 'Google Driveの認可に失敗しました');
    } catch (e) {
      Alert.alert('認可エラー', 'Google認証に失敗しました');
    }
  };

  const fetchDrivePdfs = async (token: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fpdf%27&fields=files(id%2Cname%2Csize)&pageSize=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Drive API error');
      const data = await res.json();
      const files = (data.files || []).map((f: any) => ({ id: f.id as string, name: f.name as string, size: f.size ? Number(f.size) : undefined }));
      setDriveFiles(files);
      const map: Record<string, boolean> = {};
      files.forEach((f: any) => (map[f.id] = false));
      setDriveSelected(map);
      setShowDriveModal(true);
    } catch (e) {
      Alert.alert('取得エラー', 'DriveのPDF一覧取得に失敗しました');
    }
  };

  const openDrivePicker = async () => {
    const token = driveToken || (await authorizeDrive());
    if (!token) return;
    await fetchDrivePdfs(token);
  };

  const addSelectedDriveFiles = async () => {
    if (Platform.OS === 'web' || !FileSystem) {
      Alert.alert('エラー', 'Web環境ではGoogle Drive機能は利用できません');
      return;
    }
    const maxFiles = entitlement?.isEntitled ? 50 : 5;
    const remaining = Math.max(0, maxFiles - localDocs.length);
    const toAddIds = Object.keys(driveSelected).filter((id) => driveSelected[id]).slice(0, remaining);
    if (toAddIds.length === 0) {
      Alert.alert('選択なし', '追加するファイルを選択してください');
      return;
    }
    try {
      const newDocs: LocalDoc[] = [];
      for (const id of toAddIds) {
        const name = driveFiles.find((f) => f.id === id)?.name;
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
        const localPath = FileSystem.cacheDirectory + `${id}.pdf`;
        const dl = await FileSystem.downloadAsync(downloadUrl, localPath, { headers: { Authorization: `Bearer ${driveToken}` } });
        const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
        newDocs.push({ uri: dl.uri, name, base64: b64 });
      }
      const merged = [...localDocs, ...newDocs].slice(0, maxFiles);
      setLocalDocs(merged);
      setCurrentDocIndex(localDocs.length);
      setShowDriveModal(false);
    } catch (e) {
      Alert.alert('追加エラー', '選択したPDFの追加に失敗しました');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]} >
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: currentTheme.text }]}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>譜面自動スクロール</Text>
        <View style={styles.placeholder} />
      </View>

      {/* コントロール */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.controls}>
        <View style={styles.row}>
          <TextInput
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="PDFのURLを入力"
            placeholderTextColor={currentTheme.textSecondary}
            style={[styles.input, { borderColor: currentTheme.secondary, color: currentTheme.text, backgroundColor: currentTheme.surface }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={handleLoadPdf} style={[styles.button, { backgroundColor: currentTheme.primary }]}> 
            <Text style={[styles.buttonText, { color: currentTheme.surface }]}>読み込み</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity onPress={() => changeSpeed(-20)} style={[styles.smallButton, { backgroundColor: currentTheme.secondary }]}>
            <Text style={[styles.smallButtonText, { color: currentTheme.text }]}>- 速度</Text>
          </TouchableOpacity>
          <Text style={[styles.speedText, { color: currentTheme.text }]}>{Math.round(speedPxPerSec)} px/s</Text>
          <TouchableOpacity onPress={() => changeSpeed(+20)} style={[styles.smallButton, { backgroundColor: currentTheme.secondary }]}>
            <Text style={[styles.smallButtonText, { color: currentTheme.text }]}>+ 速度</Text>
          </TouchableOpacity>

          {isScrolling ? (
            <TouchableOpacity onPress={handleStop} style={[styles.button, { backgroundColor: '#FF4444' }]}>
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>停止</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleStart} style={[styles.button, { backgroundColor: currentTheme.primary }]}>
              <Text style={[styles.buttonText, { color: currentTheme.surface }]}>開始</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.row}>
          <TouchableOpacity onPress={pickLocalPdfs} style={[styles.button, { backgroundColor: currentTheme.accent }]}>
            <Text style={[styles.buttonText, { color: currentTheme.surface }]}>ローカルPDFを選択(最大10)</Text>
          </TouchableOpacity>
          {localDocs.length > 0 && (
            <TouchableOpacity onPress={clearLocal} style={[styles.smallButton, { backgroundColor: currentTheme.secondary }]}>
              <Text style={[styles.smallButtonText, { color: currentTheme.text }]}>クリア</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={openDrivePicker} style={[styles.button, { backgroundColor: currentTheme.primary }]}>
            <Text style={[styles.buttonText, { color: currentTheme.surface }]}>Google Drive から選ぶ</Text>
          </TouchableOpacity>
        </View>

        {localDocs.length > 0 && (
          <View style={styles.row}>
            <TouchableOpacity
              disabled={currentDocIndex <= 0}
              onPress={async () => {
                const next = Math.max(0, currentDocIndex - 1);
                setCurrentDocIndex(next);
                await ensureDocLoaded(next);
              }}
              style={[styles.smallButton, { backgroundColor: currentTheme.secondary, opacity: currentDocIndex <= 0 ? 0.5 : 1 }]}
            >
              <Text style={[styles.smallButtonText, { color: currentTheme.text }]}>前の譜面</Text>
            </TouchableOpacity>
            <Text style={[styles.speedText, { color: currentTheme.text }]}>
              {currentDocIndex + 1} / {localDocs.length}
            </Text>
            <TouchableOpacity
              disabled={currentDocIndex >= localDocs.length - 1}
              onPress={async () => {
                const next = Math.min(localDocs.length - 1, currentDocIndex + 1);
                setCurrentDocIndex(next);
                await ensureDocLoaded(next);
              }}
              style={[styles.smallButton, { backgroundColor: currentTheme.secondary, opacity: currentDocIndex >= localDocs.length - 1 ? 0.5 : 1 }]}
            >
              <Text style={[styles.smallButtonText, { color: currentTheme.text }]}>次の譜面</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* PDF 表示 */}
      <View style={styles.viewer}>
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={currentHtmlSource()}
          style={{ flex: 1, backgroundColor: currentTheme.surface }}
        />
      </View>

      {/* Drive Picker Modal */}
      <Modal visible={showDriveModal} transparent animationType="slide" onRequestClose={() => setShowDriveModal(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ width:'90%', maxHeight:'70%', borderRadius:16, padding:16, backgroundColor: currentTheme.surface }}>
            <Text style={{ fontSize:18, fontWeight:'700', marginBottom:12, color: currentTheme.text }}>Drive のPDFを選択</Text>
            <ScrollView style={{ maxHeight:'70%' }}>
              {driveFiles.map((f) => (
                <TouchableOpacity key={f.id} style={{ paddingVertical:10, flexDirection:'row', alignItems:'center' }} onPress={() => setDriveSelected({ ...driveSelected, [f.id]: !driveSelected[f.id] })}>
                  <View style={{ width:22, height:22, borderRadius:4, borderWidth:1, borderColor: currentTheme.secondary, backgroundColor: driveSelected[f.id] ? currentTheme.primary : 'transparent', marginRight:10 }} />
                  <Text style={{ color: currentTheme.text, flex:1 }}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection:'row', gap:12, marginTop:12 }}>
              <TouchableOpacity style={[styles.button, { backgroundColor: currentTheme.secondary, flex:1 }]} onPress={() => setShowDriveModal(false)}>
                <Text style={[styles.buttonText, { color: currentTheme.text }]}>閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: currentTheme.primary, flex:1 }]} onPress={addSelectedDriveFiles}>
                <Text style={[styles.buttonText, { color: currentTheme.surface }]}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700' },
  placeholder: { width: 60 },

  controls: { paddingHorizontal: 16, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: { fontSize: 14, fontWeight: '700' },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallButtonText: { fontSize: 12, fontWeight: '700' },
  speedText: { fontSize: 14, fontWeight: '600', minWidth: 80, textAlign: 'center' },

  viewer: { flex: 1, marginTop: 8 },
});


