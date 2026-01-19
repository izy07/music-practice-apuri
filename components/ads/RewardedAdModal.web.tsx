import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';

/**
 * リワード広告モーダル（Web用のプレースホルダー）
 * 
 * Web環境ではAdMobのリワード広告はサポートされていないため、
 * このコンポーネントは何も表示しません。
 */
export const RewardedAdModal: React.FC<{
  visible: boolean;
  onRewardEarned: () => void;
  onClose: () => void;
  onError?: (error: Error) => void;
}> = () => {
  // Web環境では何も表示しない
  return null;
};
