/**
 * 動画再生モーダルコンポーネント
 */
import React from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { styles } from '@/lib/tabs/goals/styles';

interface VideoPlayerModalProps {
  visible: boolean;
  videoUrl: string;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  visible,
  videoUrl,
  onClose,
}) => {
  const { currentTheme } = useInstrumentTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.videoPlayerContainer, { backgroundColor: currentTheme.background }]}>
        <View style={styles.videoPlayerHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.videoPlayerCloseButton}
          >
            <Text style={[styles.videoPlayerCloseText, { color: currentTheme.textSecondary }]}>
              閉じる
            </Text>
          </TouchableOpacity>
          <Text style={[styles.videoPlayerTitle, { color: currentTheme.text }]}>
            動画再生
          </Text>
          <View style={styles.videoPlayerHeaderSpacer} />
        </View>
        
        <WebView
          source={{ uri: videoUrl }}
          style={styles.videoWebView}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
        />
      </SafeAreaView>
    </Modal>
  );
};

