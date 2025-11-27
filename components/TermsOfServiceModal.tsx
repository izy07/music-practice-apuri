import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { X, ExternalLink, Play, Pause } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
  onAgree?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function TermsOfServiceModal({ 
  visible, 
  onClose, 
  onAgree 
}: TermsOfServiceModalProps) {
  const { currentTheme } = useInstrumentTheme();
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const isVideoUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  const handleVideoPlay = (url: string) => {
    if (playingVideo === url) {
      // 停止
      setPlayingVideo(null);
      return;
    }

    // 動画URLの場合は内部で埋め込み再生
    if (isVideoUrl(url)) {
      setPlayingVideo(url);
    } else {
      // その他のURLは外部ブラウザで開く
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    }
  };

  const getEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
      }
      if (urlObj.hostname === 'youtu.be') {
        const videoId = urlObj.pathname.replace('/', '');
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
      }
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/').pop();
        return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1` : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const termsContent = [
    {
      title: '1. はじめに',
      content: '本利用規約は、音楽練習アプリ（以下「本サービス」）をご利用いただく際の条件を定めたものです。',
    },
    {
      title: '2. サービスの利用',
      content: '本サービスは音楽練習を支援するためのアプリケーションです。利用者は適切な目的でのみサービスを使用してください。',
    },
    {
      title: '3. アカウント管理',
      content: 'アカウント情報は正確に入力し、パスワード等の管理はご自身の責任で行ってください。',
    },
    {
      title: '4. 禁止事項',
      content: '以下の行為を禁止します：\n• 不正アクセスや改ざん\n• 他者への迷惑行為\n• 著作権侵害\n• 商用利用（許可なく）',
    },
    {
      title: '5. プライバシー',
      content: '個人情報の取り扱いについては、別途プライバシーポリシーに定めます。練習データは暗号化して保存します。',
    },
    {
      title: '6. サービス紹介動画',
      content: 'サービスの使い方については下記の動画をご覧ください。',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // サンプル動画URL
    },
    {
      title: '7. 免責事項',
      content: '本サービスの利用により生じた損害について、当社は責任を負いません。',
    },
    {
      title: '8. 利用規約の変更',
      content: '本利用規約は予告なく変更される場合があります。変更後も継続してご利用いただいた場合、変更に同意したものとみなします。',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <View style={[styles.header, { backgroundColor: currentTheme.surface }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={currentTheme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>利用規約</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {termsContent.map((section, index) => (
            <View key={index} style={[styles.section, { backgroundColor: currentTheme.surface }]}>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionContent, { color: currentTheme.textSecondary }]}>
                {section.content}
              </Text>
              
              {/* 動画URLがある場合の処理 */}
              {section.videoUrl && (
                <View style={styles.videoContainer}>
                  {playingVideo === section.videoUrl ? (
                    <View style={styles.videoPlayer}>
                      <TouchableOpacity
                        style={styles.videoCloseButton}
                        onPress={() => setPlayingVideo(null)}
                      >
                        <X size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                      {/* Web環境でのiframe埋め込み */}
                      {typeof window !== 'undefined' && (
                        <iframe
                          src={getEmbedUrl(section.videoUrl) || ''}
                          style={styles.iframe}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.videoButton, { backgroundColor: currentTheme.primary }]}
                      onPress={() => handleVideoPlay(section.videoUrl!)}
                    >
                      <Play size={20} color={currentTheme.surface} />
                      <Text style={[styles.videoButtonText, { color: currentTheme.surface }]}>
                        サービス紹介動画を再生
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}

          <Text style={[styles.lastUpdated, { color: currentTheme.textSecondary }]}>
            最終更新日：2024年1月1日
          </Text>
        </ScrollView>

        {onAgree && (
          <View style={[styles.footer, { backgroundColor: currentTheme.surface }]}>
            <TouchableOpacity
              style={[styles.agreeButton, { backgroundColor: currentTheme.primary }]}
              onPress={onAgree}
            >
              <Text style={[styles.agreeButtonText, { color: currentTheme.surface }]}>
                同意する
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    
    
    
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  videoContainer: {
    marginTop: 12,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  videoButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  videoPlayer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 4,
    zIndex: 1,
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  lastUpdated: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  agreeButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  agreeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});