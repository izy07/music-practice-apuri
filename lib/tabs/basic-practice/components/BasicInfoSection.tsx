/**
 * 基礎情報セクションコンポーネント
 * 楽器の姿勢と持ち方の情報を表示
 * ガイド画面と共通のinstrumentGuidesデータを使用
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Camera } from 'lucide-react-native';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { instrumentGuides } from '@/data/instrumentGuides';
import { styles } from '../styles';

export interface BasicInfoSectionProps {
  instrumentKey: string;
  onOpenCamera: () => void;
}

export function BasicInfoSection({ instrumentKey, onOpenCamera }: BasicInfoSectionProps) {
  const { currentTheme } = useInstrumentTheme();
  
  // instrumentGuidesから情報を取得（ガイド画面と共通のデータソース）
  // ネットワークエラー時にinstrumentGuidesが読み込まれていない場合のフォールバック
  let guide;
  let holdInfo;
  try {
    guide = instrumentGuides?.[instrumentKey as keyof typeof instrumentGuides];
    holdInfo = guide?.basicPlaying?.hold;
  } catch (error) {
    // instrumentGuidesが読み込まれていない場合は、フォールバック値を使用
    guide = undefined;
    holdInfo = undefined;
  }
  
  // 姿勢と持ち方のテキストを取得（ガイド画面と同じロジック）
  let posture = '背筋を伸ばし、楽器に適した姿勢を保つ。無理な姿勢は避け、長時間でも疲れない姿勢を心がける。';
  let grip = '楽器の特性に合わせて正しく持ち、無駄な力を入れない。安定して演奏できる持ち方を身につける。';
  
  if (holdInfo) {
    if (typeof holdInfo === 'object' && holdInfo !== null) {
      // オブジェクトの場合：postureとdescriptionを使用
      if (holdInfo.posture && typeof holdInfo.posture === 'string' && holdInfo.posture.trim() !== '') {
        posture = holdInfo.posture;
      }
      if (holdInfo.description && typeof holdInfo.description === 'string' && holdInfo.description.trim() !== '') {
        grip = holdInfo.description;
      }
    } else if (typeof holdInfo === 'string' && holdInfo.trim() !== '') {
      // 文字列の場合：descriptionとして使用
      grip = holdInfo;
      // postureはフォールバック値を使用
    }
  }
  
  // 最終的な値が空文字列や不正な値にならないように保証
  if (!posture || typeof posture !== 'string' || posture.trim() === '') {
    posture = '背筋を伸ばし、楽器に適した姿勢を保つ。無理な姿勢は避け、長時間でも疲れない姿勢を心がける。';
  }
  if (!grip || typeof grip !== 'string' || grip.trim() === '') {
    grip = '楽器の特性に合わせて正しく持ち、無駄な力を入れない。安定して演奏できる持ち方を身につける。';
  }

  return (
    <View style={[styles.basicInfoSection, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}>
      <View style={styles.basicInfoHeader}>
        <Text style={[styles.basicInfoTitle, { color: currentTheme.primary }]}>基礎・姿勢・楽器の持ち方</Text>
      </View>
      
      <View style={styles.basicInfoContent}>
        <View style={styles.basicInfoItem}>
          <View style={styles.basicInfoItemHeader}>
            <Text style={[styles.basicInfoLabel, { color: currentTheme.text }]}>正しい姿勢</Text>
            <TouchableOpacity 
              style={[styles.cameraButton, { backgroundColor: currentTheme.primary }]}
              onPress={onOpenCamera}
            >
              <Camera size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.basicInfoText, { color: currentTheme.textSecondary }]}>
            {posture}
          </Text>
        </View>
        
        <View style={styles.basicInfoItem}>
          <Text style={[styles.basicInfoLabel, { color: currentTheme.text }]}>楽器の持ち方</Text>
          <Text style={[styles.basicInfoText, { color: currentTheme.textSecondary }]}>
            {grip}
          </Text>
        </View>
      </View>
    </View>
  );
}



