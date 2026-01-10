/**
 * 動画再生モーダルコンポーネント
 */
import React, { useEffect } from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { styles } from '@/lib/tabs/goals/styles';
import { disableBackgroundFocus, enableBackgroundFocus, blurActiveElement } from '@/lib/modalFocusManager';

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

  // Webプラットフォームでのフォーカス管理（aria-hidden警告を防ぐため）
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (visible) {
        disableBackgroundFocus();
      } else {
        enableBackgroundFocus();
      }
    }
    
    return () => {
      if (Platform.OS === 'web' && !visible) {
        enableBackgroundFocus();
      }
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
        if (Platform.OS === 'web') {
          blurActiveElement();
          enableBackgroundFocus();
        }
        onClose();
      }}
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

