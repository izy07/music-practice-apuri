import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { X, Camera as CameraIcon, RotateCcw, Check } from 'lucide-react-native';
import { useInstrumentTheme } from './InstrumentThemeContext';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';
import { disableBackgroundFocus, enableBackgroundFocus, blurActiveElement } from '@/lib/modalFocusManager';

// Web環境ではexpo-cameraをインポートしない
let CameraView: any = null;
let CameraType: any = null;
let useCameraPermissions: any = null;

if (Platform.OS !== 'web') {
  try {
    const cameraModule = require('expo-camera');
    CameraView = cameraModule.CameraView;
    CameraType = cameraModule.CameraType;
    useCameraPermissions = cameraModule.useCameraPermissions;
  } catch (error) {
    logger.warn('expo-camera not available:', error);
  }
}

interface PostureCameraModalProps {
  visible: boolean;
  onClose: () => void;
  instrumentName: string;
}

const { width, height } = Dimensions.get('window');

export default function PostureCameraModal({ visible, onClose, instrumentName }: PostureCameraModalProps) {
  const { currentTheme } = useInstrumentTheme();
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [{ granted: false }, () => {}];
  const [facing, setFacing] = useState<any>('front');
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

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

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal 
        visible={visible} 
        animationType="slide" 
        transparent
        onRequestClose={() => {
          // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
          if (Platform.OS === 'web') {
            blurActiveElement();
            enableBackgroundFocus();
          }
          onClose();
        }}
      >
        <View style={styles.overlay}>
          <View 
            style={[styles.permissionContainer, { backgroundColor: currentTheme.surface }]}
            {...(Platform.OS === 'web' ? { 
              role: 'dialog',
              'aria-modal': true,
              'aria-labelledby': 'camera-permission-modal-title'
            } : {})}
          >
            <Text 
              id="camera-permission-modal-title"
              style={[styles.permissionTitle, { color: currentTheme.text }]}
            >
              カメラの権限が必要です
            </Text>
            <Text style={[styles.permissionText, { color: currentTheme.textSecondary }]}>
              姿勢チェックのためにカメラを使用します
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: currentTheme.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>権限を許可</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: currentTheme.textSecondary }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: currentTheme.textSecondary }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current: 'back' | 'front') => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        Alert.alert(
          '写真を撮影しました',
          '姿勢を確認して、正しいフォームと比較してください。',
          [
            { text: '再撮影', onPress: () => setIsRecording(false) },
            { text: '完了', onPress: onClose }
          ]
        );
      } catch (error) {
        Alert.alert('エラー', '写真の撮影に失敗しました。');
        setIsRecording(false);
      }
    }
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent
      onRequestClose={() => {
        // モーダルを閉じる前にフォーカスを外す（aria-hidden警告を防ぐため）
        if (Platform.OS === 'web') {
          blurActiveElement();
          enableBackgroundFocus();
        }
        onClose();
      }}
    >
      <View style={styles.overlay}>
        <View 
          style={styles.modalContainer}
          {...(Platform.OS === 'web' ? { 
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'posture-camera-modal-title'
          } : {})}
        >
          {/* ヘッダー */}
          <View style={[styles.header, { backgroundColor: currentTheme.surface }]}>
            <Text 
              id="posture-camera-modal-title"
              style={[styles.headerTitle, { color: currentTheme.text }]}
            >
              {instrumentName} 姿勢チェック
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={currentTheme.text} />
            </TouchableOpacity>
          </View>

          {/* カメラビュー */}
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
            >
              {/* 姿勢ガイドライン */}
              <View style={styles.guidelineContainer}>
                <View style={[styles.guideline, { borderColor: '#FFD700' }]} />
                <Text style={[styles.guidelineText, { color: '#FFFFFF' }]}>
                  楽器を構えてください
                </Text>
              </View>
            </CameraView>
          </View>

          {/* コントロール */}
          <View style={[styles.controls, { backgroundColor: currentTheme.surface }]}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.secondary }]}
              onPress={toggleCameraFacing}
            >
              <RotateCcw size={24} color={currentTheme.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                { backgroundColor: isRecording ? currentTheme.secondary : currentTheme.primary }
              ]}
              onPress={takePicture}
              disabled={isRecording}
            >
              <CameraIcon size={32} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.secondary }]}
              onPress={onClose}
            >
              <Check size={24} color={currentTheme.text} />
            </TouchableOpacity>
          </View>

          {/* ヒント */}
          <View style={[styles.hintContainer, { backgroundColor: currentTheme.background }]}>
            <Text style={[styles.hintText, { color: currentTheme.textSecondary }]}>
              💡 正しい姿勢で楽器を構えてから撮影してください
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.95,
    height: height * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    boxShadow: '0px 5px 10px rgba(0, 0, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  guidelineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideline: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  guidelineText: {
    position: 'absolute',
    bottom: 50,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
  },
  hintContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
  },
  permissionContainer: {
    width: width * 0.8,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 10,
    boxShadow: '0px 5px 10px rgba(0, 0, 0, 0.3)',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 12,
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
