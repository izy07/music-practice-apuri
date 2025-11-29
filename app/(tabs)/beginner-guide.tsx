import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, Music, Target, Heart, History, Star, Play, Wrench, Lightbulb, Youtube, Image as ImageIcon, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import PostureCameraModal from '@/components/PostureCameraModal';
import { instrumentGuides } from '@/data/instrumentGuides';
import { styles } from '@/lib/tabs/beginner-guide/styles';
import { createShadowStyle } from '@/lib/shadowStyles';

export default function BeginnerGuideScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('overview');
  const [showFingeringChart, setShowFingeringChart] = useState(false);
  const [showMaintenanceTips, setShowMaintenanceTips] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // 楽器ID(選択ID) → 楽器キーへの変換
  const getInstrumentKey = () => {
    // UUID → 楽器キーの対応（instrument-selection.tsx で使用している固定UUID）
    const id = selectedInstrument;
    const map: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440001': 'piano',     // ピアノ
      '550e8400-e29b-41d4-a716-446655440002': 'guitar',    // ギター
      '550e8400-e29b-41d4-a716-446655440003': 'violin',    // バイオリン
      '550e8400-e29b-41d4-a716-446655440004': 'flute',     // フルート
      '550e8400-e29b-41d4-a716-446655440005': 'trumpet',   // トランペット
      '550e8400-e29b-41d4-a716-446655440006': 'drums',     // 打楽器
      '550e8400-e29b-41d4-a716-446655440007': 'saxophone', // サックス
      '550e8400-e29b-41d4-a716-446655440008': 'horn',      // ホルン
      '550e8400-e29b-41d4-a716-446655440009': 'clarinet',  // クラリネット
      '550e8400-e29b-41d4-a716-446655440010': 'trombone',  // トロンボーン
      '550e8400-e29b-41d4-a716-446655440011': 'cello',     // チェロ
      '550e8400-e29b-41d4-a716-446655440012': 'bassoon',   // ファゴット
      '550e8400-e29b-41d4-a716-446655440013': 'oboe',      // オーボエ
      '550e8400-e29b-41d4-a716-446655440014': 'harp',      // ハープ
      '550e8400-e29b-41d4-a716-446655440015': 'contrabass', // コントラバス
      '550e8400-e29b-41d4-a716-446655440016': 'guitar',    // その他（ギターとして）
      '550e8400-e29b-41d4-a716-446655440018': 'viola',     // ヴィオラ
      '550e8400-e29b-41d4-a716-446655440019': 'guitar',    // 琴（ギターとして）
      '550e8400-e29b-41d4-a716-446655440020': 'piano',     // シンセサイザー（ピアノとして）
      '550e8400-e29b-41d4-a716-446655440021': 'drums',     // 太鼓（打楽器として）
    };
    return map[id] || 'violin';
  };

  const currentGuide = instrumentGuides[getInstrumentKey() as keyof typeof instrumentGuides] || instrumentGuides.violin;
  

  const goBack = () => {
    router.back();
  };

  const openVideo = (url: string) => {
    Linking.openURL(url);
  };

  // カメラ機能を起動して姿勢確認
  const openCameraForPostureCheck = () => {
    setShowCameraModal(true);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'faq':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Star size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>よくあるQ&A</Text>
            </View>
            <View style={styles.infoGrid}>
              {(currentGuide as any).faq?.map((qa: any, idx: number) => (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Q. {qa.q}</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>A. {qa.a}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'roadmap':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <History size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>4週間ロードマップ</Text>
            </View>
            <View style={styles.infoGrid}>
              {(currentGuide as any).roadmap?.weeks?.map((wk: any) => (
                <View style={styles.infoItem}>
                  <Text style={[styles.resourcesTitle, { color: currentTheme.text }]}>{wk.title}</Text>
                  {wk.items.map((it: string) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: currentGuide.color }} />
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>{it}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        );
      case 'overview':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <BookOpen size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>楽器の基本情報</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>基本構造</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.structure}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>魅力</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.charm}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>歴史・背景</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.history}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>特徴</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.features}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>有名な演奏家</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.famous}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>あなたの楽器の魅力</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.yourCharm}</Text>
              </View>
            </View>
          </View>
        );

      case 'basicPlaying':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Music size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>基本的な演奏方法</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={styles.infoHeader}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>楽器の持ち方・構え方</Text>
                  <TouchableOpacity 
                    style={[styles.cameraButton, getCameraButtonStyle(), { backgroundColor: currentTheme.primary }]}
                    onPress={openCameraForPostureCheck}
                  >
                    <Camera size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>
                  {typeof currentGuide.basicPlaying.hold === 'string' 
                    ? currentGuide.basicPlaying.hold 
                    : currentGuide.basicPlaying.hold.description}
                </Text>
                
                {typeof currentGuide.basicPlaying.hold === 'object' && (
                  <>
                    <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>正しい姿勢</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.posture}</Text>
                    
                    {'bowHold' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>弓の持ち方</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.bowHold}</Text>
                      </>
                    )}
                    
                    {'handPosition' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>手の位置</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.handPosition}</Text>
                      </>
                    )}
                    
                    {'leftHand' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>左手の使い方</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.leftHand}</Text>
                      </>
                    )}
                    
                    {'embouchure' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>アンブシュア</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.embouchure}</Text>
                      </>
                    )}
                  </>
                )}
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>基本的な音の出し方</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.sound}</Text>
              </View>
              
              {'fingering' in currentGuide.basicPlaying && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>指の使い方・運指の基礎</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.fingering}</Text>
                </View>
              )}
              
              {'bowing' in currentGuide.basicPlaying && currentGuide.basicPlaying.bowing && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ボウイング（弦楽器）</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.bowing}</Text>
                </View>
              )}
              
              {'strumming' in currentGuide.basicPlaying && currentGuide.basicPlaying.strumming && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ストラミング（ギター）</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.strumming}</Text>
                </View>
              )}
              
              {'breathing' in currentGuide.basicPlaying && currentGuide.basicPlaying.breathing && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>呼吸法（管楽器）</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.breathing}</Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'fingering':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Target size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>運指表</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>基本的な運指表</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.fingering.basic}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>運指表の使い方</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.fingering.chart}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>練習のコツ</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.fingering.tips}</Text>
              </View>
              
              {/* 運指表の画像 */}
              {currentGuide.fingering.image && (
                <View style={styles.fingeringImageContainer}>
                  <Image
                    source={{ uri: currentGuide.fingering.image }}
                    style={styles.fingeringImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>
          </View>
        );

      case 'maintenance':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Wrench size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>お手入れ方法</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>日常的なお手入れ</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.maintenance.daily}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>保管方法</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.maintenance.storage}</Text>
              </View>
            </View>
          </View>
        );

      case 'tips':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Lightbulb size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>初心者向けアドバイス</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>練習のコツ・心構え</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tips.practice}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>よくある間違いと対策</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tips.mistakes}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>上達のためのポイント</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tips.improvement}</Text>
              </View>
            </View>
          </View>
        );

      case 'resources':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Youtube size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>参考資料</Text>
            </View>
            
            <View style={styles.resourcesContainer}>
              <Text style={[styles.resourcesTitle, { color: currentTheme.text }]}>解説動画</Text>
              {currentGuide.resources.videos.map((video, index) => (
                <TouchableOpacity
                  style={styles.videoItem}
                  onPress={() => openVideo(video.url)}
                >
                  <Youtube size={20} color="#FF0000" />
                  <Text style={[styles.videoTitle, { color: currentTheme.text }]}>{video.title}</Text>
                </TouchableOpacity>
              ))}
              
              <Text style={[styles.resourcesTitle, { color: currentTheme.text }]}>図解・イラスト</Text>
              {currentGuide.resources.images.map((image, index) => (
                <View style={styles.imageItem}>
                  <ImageIcon size={20} color={currentGuide.color} />
                  <Text style={[styles.imageTitle, { color: currentTheme.text }]}>{image}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'repertoire':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Music size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>練習曲・レパートリー</Text>
            </View>
            
            <View style={styles.repertoireContainer}>
              <Text style={[styles.repertoireTitle, { color: currentTheme.text }]}>初心者向け曲</Text>
              <View style={styles.songList}>
                {currentGuide.repertoire.beginner.map((song, index) => (
                  <View style={styles.songItem}>
                    <Text style={[styles.songName, { color: currentTheme.text }]}>{song}</Text>
                    <Text style={[styles.songLevel, { color: currentTheme.textSecondary }]}>初級</Text>
                  </View>
                ))}
              </View>
              
              <Text style={[styles.repertoireTitle, { color: currentTheme.text }]}>中級者向け曲</Text>
              <View style={styles.songList}>
                {currentGuide.repertoire.intermediate.map((song, index) => (
                  <View style={styles.songItem}>
                    <Text style={[styles.songName, { color: currentTheme.text }]}>{song}</Text>
                    <Text style={[styles.songLevel, { color: currentTheme.textSecondary }]}>中級</Text>
                  </View>
                ))}
              </View>
              
              <View style={[styles.tipsBox, { backgroundColor: currentTheme.background }]}>
                <Text style={[styles.tipsTitle, { color: currentTheme.text }]}>練習のコツ</Text>
                <Text style={[styles.tipsText, { color: currentTheme.textSecondary }]}>
                  {currentGuide.repertoire.tips}
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <InstrumentHeader />
      
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
            {currentGuide.name}ガイド
          </Text>
        <View style={styles.placeholder} />
      </View>


      <View style={styles.navigation}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'overview', label: '基本情報', icon: BookOpen },
            { id: 'basicPlaying', label: '演奏方法', icon: Music },
            { id: 'fingering', label: '運指表', icon: Target },
            { id: 'maintenance', label: 'お手入れ', icon: Wrench },
            { id: 'tips', label: 'アドバイス', icon: Lightbulb },
            { id: 'repertoire', label: '練習曲', icon: Music },
            { id: 'resources', label: '参考資料', icon: Youtube },
            { id: 'faq', label: 'Q&A', icon: Star },
            { id: 'roadmap', label: 'ロードマップ', icon: History }
          ].map((item) => (
            <TouchableOpacity
              style={[
                styles.navItem,
                activeSection === item.id && { 
                  backgroundColor: currentGuide.color,
                  borderColor: currentGuide.color,

                  
                  elevation: 4
                }
              ]}
              onPress={() => setActiveSection(item.id)}
            >
              <item.icon size={16} color={activeSection === item.id ? '#FFFFFF' : currentTheme.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeSection === item.id ? '#FFFFFF' : currentTheme.textSecondary }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderSection()}
      </ScrollView>

      {/* カメラモーダル */}
      <PostureCameraModal
        visible={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        instrumentName={currentGuide.name}
      />
    </SafeAreaView>
  );
}

// 動的なスタイルを定義（Platformに依存するため）
const getCameraButtonStyle = () => ({
  padding: 8,
  borderRadius: 20,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  elevation: 2,
  // Web環境用のboxShadow（shadow*プロパティの代わり）
  ...createShadowStyle({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  }),
});
