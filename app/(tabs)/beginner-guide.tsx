import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, Music, Target, Heart, History, Star, Play, Wrench, Lightbulb, Youtube, Image as ImageIcon, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import InstrumentHeader from '@/components/InstrumentHeader';
import { useInstrumentTheme } from '@/components/InstrumentThemeContext';
import { useLanguage } from '@/components/LanguageContext';
import PostureCameraModal from '@/components/PostureCameraModal';
// 動的インポートで遅延読み込み（軽量化）
let instrumentGuides: any = null;
const loadInstrumentGuides = async () => {
  if (!instrumentGuides) {
    const module = await import('@/data/instrumentGuides');
    instrumentGuides = module.instrumentGuides;
  }
  return instrumentGuides;
};
import { styles } from '@/lib/tabs/beginner-guide/styles';
import { createShadowStyle } from '@/lib/shadowStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/logger';
import { ErrorHandler } from '@/lib/errorHandler';

export default function BeginnerGuideScreen() {
  const router = useRouter();
  const { currentTheme, selectedInstrument } = useInstrumentTheme();
  const { t, language } = useLanguage();
  const [activeSection, setActiveSection] = useState('overview');
  const [showFingeringChart, setShowFingeringChart] = useState(false);
  const [showMaintenanceTips, setShowMaintenanceTips] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [guidesLoaded, setGuidesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 楽器データを動的インポートで読み込み（オフライン対応付き）
  useEffect(() => {
    const loadGuides = async () => {
      try {
        // まずキャッシュから読み込みを試行（オフライン対応）
        try {
          const cachedData = await AsyncStorage.getItem('instrumentGuides_cache');
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            instrumentGuides = parsed;
            setGuidesLoaded(true);
            logger.debug('ガイドデータをキャッシュから読み込みました');
            // バックグラウンドで最新データを読み込んで更新
            loadInstrumentGuides().then((guides) => {
              if (guides) {
                AsyncStorage.setItem('instrumentGuides_cache', JSON.stringify(guides)).catch(() => {
                  // キャッシュ保存エラーは無視
                });
                instrumentGuides = guides;
              }
            }).catch(() => {
              // 最新データの読み込みエラーは無視（キャッシュを使用）
            });
            return;
          }
        } catch (cacheError) {
          // キャッシュ読み込みエラーは無視して続行
          logger.debug('キャッシュ読み込みエラー（無視）:', cacheError);
        }

        // キャッシュがない場合は動的インポートで読み込み
        const guides = await loadInstrumentGuides();
        if (guides) {
          // キャッシュに保存（オフライン対応）
          try {
            await AsyncStorage.setItem('instrumentGuides_cache', JSON.stringify(guides));
            logger.debug('ガイドデータをキャッシュに保存しました');
          } catch (saveError) {
            // キャッシュ保存エラーは無視
            logger.debug('キャッシュ保存エラー（無視）:', saveError);
          }
          setGuidesLoaded(true);
        } else {
          throw new Error('ガイドデータの読み込みに失敗しました');
        }
      } catch (error) {
        logger.error('ガイドデータ読み込みエラー:', error);
        ErrorHandler.handle(error, 'ガイドデータ読み込み', false);
        setLoadError('ガイドデータの読み込みに失敗しました。オフラインの場合は、次回オンライン時に再試行してください。');
        
        // エラー時もキャッシュがあれば使用
        try {
          const cachedData = await AsyncStorage.getItem('instrumentGuides_cache');
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            instrumentGuides = parsed;
            setGuidesLoaded(true);
            setLoadError(null);
            logger.debug('エラー時、キャッシュからガイドデータを読み込みました');
          }
        } catch (cacheError) {
          // キャッシュ読み込みエラーは無視
        }
      }
    };

    loadGuides();
  }, []);

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
      '550e8400-e29b-41d4-a716-446655440006': 'drums',     // ドラム
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
      '550e8400-e29b-41d4-a716-446655440021': 'drums',     // 太鼓（ドラムとして）
    };
    return map[id] || 'violin';
  };

  const currentGuide = guidesLoaded && instrumentGuides 
    ? (instrumentGuides[getInstrumentKey() as keyof typeof instrumentGuides] || instrumentGuides.violin)
    : null;
  

  const goBack = () => {
    router.back();
  };

  const openVideo = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'リンクを開けません',
          'インターネット接続が必要です。オフラインの場合は、後でオンライン時に再度お試しください。',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logger.error('動画リンクを開くエラー:', error);
      Alert.alert(
        'エラー',
        '動画リンクを開けませんでした。インターネット接続を確認してください。',
        [{ text: 'OK' }]
      );
    }
  };

  // カメラ機能を起動して姿勢確認
  const openCameraForPostureCheck = () => {
    setShowCameraModal(true);
  };

  const renderSection = () => {
    // ローディング中
    if (!guidesLoaded) {
      return (
        <View style={[styles.section, { backgroundColor: currentTheme.surface, padding: 40, alignItems: 'center' }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('loading')}</Text>
        </View>
      );
    }
    
    // エラー状態
    if (loadError && !currentGuide) {
      return (
        <View style={[styles.section, { backgroundColor: currentTheme.surface, padding: 40 }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text, marginBottom: 16 }]}>エラー</Text>
          <Text style={[styles.infoText, { color: currentTheme.textSecondary }]}>{loadError}</Text>
        </View>
      );
    }
    
    // currentGuideがnullの場合は何も表示しない
    if (!currentGuide) {
      return null;
    }
    
    switch (activeSection) {
      case 'faq':
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}> 
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <Star size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('faq')}</Text>
            </View>
            <View style={styles.infoGrid}>
              {(currentGuide as any).faq?.map((qa: any, idx: number) => (
                <View key={idx} style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Q. {qa.q}</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>A. {qa.a}</Text>
                </View>
              ))}
              {['violin', 'viola', 'cello', 'contrabass'].includes(currentGuide.nameEn.toLowerCase()) && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Q. いつまで指板にシールを貼っていいのか</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>A. 指板のシールは、正しい指の位置を覚えるための補助として使います。基本的には、正しい音程で指を置けるようになったら（通常は数ヶ月から1年程度）外すことをおすすめします。シールを長期間貼り続けると、指の感覚に頼らず視覚に頼る癖がついてしまう可能性があります。ただし、個人差があるので、無理に外す必要はありません。自分で音程が取れるようになったと感じたら、少しずつシールを減らしていく方法も効果的です。</Text>
                </View>
              )}
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
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('roadmap')}</Text>
            </View>
            <View style={styles.infoGrid}>
              {(currentGuide as any).roadmap?.weeks?.map((wk: any, weekIdx: number) => (
                <View key={weekIdx} style={styles.infoItem}>
                  <Text style={[styles.resourcesTitle, { color: currentTheme.text }]}>{wk.title}</Text>
                  {wk.items.map((it: string, itemIdx: number) => (
                    <View key={itemIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('overview')}</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('basicStructure')}</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.structure}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('charm')}</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.charm}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('history')}</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.history}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('features')}</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.features}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('famousMusicians')}</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.overview.famous}</Text>
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
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('basicPlaying')}</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={styles.infoHeader}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('howToHold')}</Text>
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
                    <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>{t('correctPosture')}</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.posture}</Text>
                    
                    {'bowHold' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>{t('bowHold')}</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.bowHold}</Text>
                      </>
                    )}
                    
                    {'handPosition' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>{t('handPosition')}</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.handPosition}</Text>
                      </>
                    )}
                    
                    {'leftHand' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>{t('leftHand')}</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.leftHand}</Text>
                      </>
                    )}
                    
                    {'embouchure' in currentGuide.basicPlaying.hold && (
                      <>
                        <Text style={[styles.infoSubLabel, { color: currentTheme.textSecondary }]}>{t('embouchure')}</Text>
                        <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.hold.embouchure}</Text>
                      </>
                    )}
                  </>
                )}
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('howToMakeSound')}</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.sound}</Text>
              </View>
              
              {'fingering' in currentGuide.basicPlaying && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('fingerUsage')}</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.fingering}</Text>
                </View>
              )}
              
              
              {'strumming' in currentGuide.basicPlaying && currentGuide.basicPlaying.strumming && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('strumming')}</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.basicPlaying.strumming}</Text>
                </View>
              )}
              
              {'breathing' in currentGuide.basicPlaying && currentGuide.basicPlaying.breathing && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('breathing')}</Text>
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
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('fingering')}</Text>
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
              
              {/* 音階表記（英語・ドイツ語） */}
              {/* stringInfoがない場合のみ表示（弦楽器の場合はstringInfoの説明を優先） */}
              {(currentGuide.fingering as any)?.noteNames && !(currentGuide.fingering as any)?.stringInfo && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>音階の表記</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>
                      日本語：{(currentGuide.fingering as any).noteNames.japanese}{'\n'}
                      英語：{(currentGuide.fingering as any).noteNames.english}{'\n'}
                      ドイツ語：{(currentGuide.fingering as any).noteNames.german}
                    </Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>なぜ英語で表記されているのか</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>
                      音楽では、音名を英語（C、D、E、F、G、A、B）で表記するのが世界的に標準的です。これは、楽譜や音楽理論、国際的な音楽教育でも英語の音名が広く使われているためです。例えば「C」は「ド」、「G」は「ソ」を意味します。国際的な音楽の共通言語として、英語表記に慣れておくと、楽譜を読む時や他の楽器と合わせる時、海外の音楽家と交流する時にも役立ちます。
                    </Text>
                  </View>
                </>
              )}
              
              {/* 音階表記のみ（stringInfoがある場合） */}
              {(currentGuide.fingering as any)?.noteNames && (currentGuide.fingering as any)?.stringInfo && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>音階の表記</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>
                    日本語：{(currentGuide.fingering as any).noteNames.japanese}{'\n'}
                    英語：{(currentGuide.fingering as any).noteNames.english}{'\n'}
                    ドイツ語：{(currentGuide.fingering as any).noteNames.german}
                  </Text>
                </View>
              )}
              
              {/* 弦楽器の各弦説明 */}
              {(currentGuide.fingering as any)?.stringInfo && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>なぜ英語で表記されているのか</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>
                      弦楽器では、各弦を英語の音名（G、D、A、E、Cなど）で表記するのが世界的に標準的です。これは、楽譜や音楽理論でも英語の音名（C、D、E、F、G、A、B）が広く使われているためです。例えば「G線」は「ソ（G）の音が出る弦」という意味で、日本語の「ソ弦」と同じです。国際的な音楽の共通言語として、英語表記に慣れておくと、楽譜を読む時や他の楽器と合わせる時にも役立ちます。
                    </Text>
                  </View>
                  
                  {(currentGuide.fingering as any).stringInfo.eString && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>E線について（E線 = ミ弦）</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).stringInfo.eString}
                      </Text>
                    </View>
                  )}
                  {(currentGuide.fingering as any).stringInfo.aString && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>A線について（A線 = ラ弦）</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).stringInfo.aString}
                      </Text>
                    </View>
                  )}
                  {(currentGuide.fingering as any).stringInfo.dString && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>D線について（D線 = レ弦）</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).stringInfo.dString}
                      </Text>
                    </View>
                  )}
                  {(currentGuide.fingering as any).stringInfo.gString && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>G線について（G線 = ソ弦）</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).stringInfo.gString}
                      </Text>
                    </View>
                  )}
                  {(currentGuide.fingering as any).stringInfo.cString && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>C線について（C線 = ド弦）</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).stringInfo.cString}
                      </Text>
                    </View>
                  )}
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>弦の構成</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>
                      {(currentGuide.fingering as any).stringInfo.strings}
                    </Text>
                  </View>
                </>
              )}
              
              {/* 管楽器のB管・C管説明 */}
              {(currentGuide.fingering as any)?.keyInfo && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>なぜ英語で表記されているのか</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>
                      管楽器では、楽器の種類を「B♭管」「C管」「E♭管」など、英語の音名で表記するのが世界的に標準的です。これは、楽譜や音楽理論でも英語の音名（C、D、E、F、G、A、B）が広く使われているためです。例えば「B♭管」は「シ♭（B♭）の音が出る管」という意味で、楽譜に書かれた「ド」を吹くと実際にはB♭の音が出ます。国際的な音楽の共通言語として、英語表記に慣れておくと、楽譜を読む時や他の楽器と合わせる時にも役立ちます。
                    </Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>管のキーについて</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>
                      {(currentGuide.fingering as any).keyInfo.description}
                    </Text>
                  </View>
                  {(currentGuide.fingering as any).keyInfo.bFlat && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>B♭管について</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).keyInfo.bFlat}
                      </Text>
                    </View>
                  )}
                  {(currentGuide.fingering as any).keyInfo.c && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>C管について</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).keyInfo.c}
                      </Text>
                    </View>
                  )}
                  {(currentGuide.fingering as any).keyInfo.eFlat && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>E♭管について</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).keyInfo.eFlat}
                      </Text>
                    </View>
                  )}
                  {(currentGuide.fingering as any).keyInfo.a && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>A管について</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).keyInfo.a}
                      </Text>
                    </View>
                  )}
                  {(currentGuide.fingering as any).keyInfo.f && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>F管について</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).keyInfo.f}
                      </Text>
                    </View>
                  )}
                  {(currentGuide.fingering as any).keyInfo.difference && (
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>初心者へのアドバイス</Text>
                      <Text style={[styles.infoText, { color: currentTheme.text }]}>
                        {(currentGuide.fingering as any).keyInfo.difference}
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('tips')}</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.fingering.tips}</Text>
              </View>
              
              {/* 運指表の画像 */}
              {(currentGuide.fingering as any)?.image && (
                <View style={styles.fingeringImageContainer}>
                  <Image
                    source={{ uri: (currentGuide.fingering as any).image }}
                    style={styles.fingeringImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>
          </View>
        );

      case 'terminology':
        const instrumentName = currentGuide.nameEn.toLowerCase();
        const isStringInstrument = ['violin', 'viola', 'cello', 'contrabass'].includes(instrumentName);
        const isPiano = instrumentName === 'piano';
        const isGuitar = instrumentName === 'guitar';
        const isFlute = instrumentName === 'flute';
        const isTrumpet = instrumentName === 'trumpet';
        const isSaxophone = instrumentName === 'saxophone';
        const isClarinet = instrumentName === 'clarinet';
        const isOboe = instrumentName === 'oboe';
        const isBassoon = instrumentName === 'bassoon';
        const isHarp = instrumentName === 'harp';
        const isDrums = instrumentName === 'drums';
        const isHorn = instrumentName === 'horn';
        const isTrombone = instrumentName === 'trombone';
        
        return (
          <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${currentGuide.color}20` }]}>
                <BookOpen size={24} color={currentGuide.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('terminology')}</Text>
            </View>
            
            <View style={styles.infoGrid}>
              {isStringInstrument && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>指板</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>弦を押さえるための黒い板。左手の指で弦を押さえて音程を変えます。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>弓先</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>弓の先端部分。弓先を使うと軽やかな音色になります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>弓中</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>弓の中央部分。最も安定した音色を出すことができます。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>弓元</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>弓の根元部分。強い音を出す時に使います。</Text>
                  </View>
                </>
              )}
              
              {isPiano && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>鍵盤</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>白鍵と黒鍵で構成される部分。指で押すことで音を出します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ペダル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>足で操作する装置。右ペダル（ダンパーペダル）で音を延ばし、左ペダル（ソフトペダル）で音を柔らかくします。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ハンマー</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>鍵盤を押すと動く部品。弦を叩いて音を出します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ダンパー</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>弦の振動を止める部品。鍵盤から指を離すとダンパーが弦に触れて音が止まります。</Text>
                  </View>
                </>
              )}
              
              {isGuitar && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>フレット</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>ネックに埋め込まれた金属の棒。フレットの位置で音程が決まります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ネック</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>弦が張られている細長い部分。左手でネックを握り、弦を押さえます。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ブリッジ</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>ボディに固定された部品。弦の一端が固定され、弦の張力を調整します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ピック</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>弦を弾くための小さな板。右手でピックを持って弦を弾きます。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>指板</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>ネックの表面部分。フレットが埋め込まれており、弦を押さえる場所です。</Text>
                  </View>
                </>
              )}
              
              {isFlute && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ヘッドジョイント</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>フルートの頭部管。マウスピース（歌口）があり、ここに息を吹き込みます。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ボディ</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>フルートの中央部分。キーが多く配置されており、指で操作して音程を変えます。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>フットジョイント</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>フルートの足部管。低音域のキーが配置されています。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>キー</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>指で押す金属の蓋。キーを押すことで音孔を開閉し、音程を変えます。</Text>
                  </View>
                </>
              )}
              
              {isTrumpet && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>マウスピース</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>唇を当てて息を吹き込む部分。音色や音程に大きく影響します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ピストン</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>右手の指で押すバルブ。3つのピストンを組み合わせて音程を変えます。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ベル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>楽器の先端部分。音がここから出て、広がります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>スライド</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>マウスピースに接続された管。抜き差しして音程を微調整します。</Text>
                  </View>
                </>
              )}
              
              {isSaxophone && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>マウスピース</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>リードを付けて息を吹き込む部分。音色に大きく影響します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>リード</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>マウスピースに取り付ける薄い板。振動して音を出します。消耗品です。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ネック</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>マウスピースとボディを繋ぐ部分。角度を調整して音程を微調整します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ベル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>楽器の先端部分。音がここから出て、広がります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>キー</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>指で押す金属の蓋。キーを押すことで音孔を開閉し、音程を変えます。</Text>
                  </View>
                </>
              )}
              
              {isClarinet && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>マウスピース</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>リードを付けて息を吹き込む部分。音色に大きく影響します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>リード</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>マウスピースに取り付ける薄い板。振動して音を出します。消耗品です。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>バレル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>マウスピースと上管を繋ぐ部分。抜き差しして音程を微調整します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ベル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>楽器の先端部分。音がここから出て、広がります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>キー</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>指で押す金属の蓋。キーを押すことで音孔を開閉し、音程を変えます。</Text>
                  </View>
                </>
              )}
              
              {isOboe && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ダブルリード</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>2枚のリードを合わせたもの。振動して音を出します。非常に繊細で消耗品です。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>上管</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>ダブルリードに接続される上部の管。左手で操作するキーが多く配置されています。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>下管</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>上管とベルを繋ぐ下部の管。右手で操作するキーが多く配置されています。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ベル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>楽器の先端部分。音がここから出て、広がります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>キー</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>指で押す金属の蓋。キーを押すことで音孔を開閉し、音程を変えます。</Text>
                  </View>
                </>
              )}
              
              {isBassoon && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ダブルリード</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>2枚のリードを合わせたもの。振動して音を出します。非常に繊細で消耗品です。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ボーカル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>ダブルリードに接続される短い管。左手で操作するキーが配置されています。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>バスジョイント</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>ボーカルとベルを繋ぐ長い管。右手で操作するキーが多く配置されています。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ベル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>楽器の先端部分。音がここから出て、広がります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>キー</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>指で押す金属の蓋。キーを押すことで音孔を開閉し、音程を変えます。</Text>
                  </View>
                </>
              )}
              
              {isHarp && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>弦</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>指で弾いて音を出す部分。47本の弦が張られています。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ペダル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>足で操作する装置。7つのペダルで各音名（ド・レ・ミ・ファ・ソ・ラ・シ）の音程を変えます。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>サウンドボード</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>弦の振動を増幅する共鳴板。美しい響きを作り出します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ネック</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>弦が張られている上部の部分。ペダルの操作で弦の長さが変わり、音程が変わります。</Text>
                  </View>
                </>
              )}
              
              {isDrums && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ヘッド</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>太鼓の表面の皮。スティックで叩いて音を出します。張力で音程が変わります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>リム</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>ヘッドを固定する金属の輪。リムショットという奏法で使います。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>スネア</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>スネアドラムの裏側に張られた金属の弦。カチカチという特徴的な音を出します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>シンバル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>金属の円盤。叩いたり擦ったりして音を出します。ハイハットやクラッシュシンバルなどがあります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>スティック</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>太鼓やシンバルを叩くための棒。材質や太さで音色が変わります。</Text>
                  </View>
                </>
              )}
              
              {isHorn && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>マウスピース</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>唇を当てて息を吹き込む部分。音色や音程に大きく影響します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>バルブ</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>左手の指で押す装置。3つのバルブを組み合わせて音程を変えます。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ベル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>楽器の先端部分。音がここから出て、広がります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>スライド</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>マウスピースに接続された管。抜き差しして音程を微調整します。</Text>
                  </View>
                </>
              )}
              
              {isTrombone && (
                <>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>マウスピース</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>唇を当てて息を吹き込む部分。音色や音程に大きく影響します。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>スライド</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>U字型に曲がった管。前後に動かして音程を変えます。7つのポジションがあります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>ベル</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>楽器の先端部分。音がここから出て、広がります。</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>スライドポジション</Text>
                    <Text style={[styles.infoText, { color: currentTheme.text }]}>スライドの位置。第1ポジション（最も短い）から第7ポジション（最も長い）まであり、位置で音程が決まります。</Text>
                  </View>
                </>
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
                <Text style={[styles.infoText, { color: currentTheme.text }]}>ケースに入れて（木管楽器や弦楽器は湿度が高すぎない）暗所で保管してください。</Text>
              </View>
              
              {(currentGuide.maintenance as any)?.shopFrequency && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>メンテナンス頻度の目安</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{(currentGuide.maintenance as any).shopFrequency}</Text>
                </View>
              )}
              
              {(currentGuide.maintenance as any)?.cleaningFrequency && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>洗浄頻度の目安</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{(currentGuide.maintenance as any).cleaningFrequency}</Text>
                </View>
              )}
              
              {currentGuide.maintenance.attention && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>注意事項</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.maintenance.attention}</Text>
                </View>
              )}
              
              {currentGuide.maintenance.supplies && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>必要な用品</Text>
                  <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.maintenance.supplies}</Text>
                </View>
              )}
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
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('beginnerAdvice')}</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('practiceTipsAndMindset')}</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tips.practice}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('commonMistakes')}</Text>
                <Text style={[styles.infoText, { color: currentTheme.text }]}>{currentGuide.tips.mistakes}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>{t('improvementPoints')}</Text>
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
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{t('resources')}</Text>
            </View>
            
            <View style={styles.resourcesContainer}>
              <Text style={[styles.resourcesTitle, { color: currentTheme.text }]}>{t('tutorialVideos')}</Text>
              {currentGuide.resources.videos.map((video: { title: string; url: string }, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.videoItem}
                  onPress={() => openVideo(video.url)}
                >
                  <Youtube size={20} color="#FF0000" />
                  <Text style={[styles.videoTitle, { color: currentTheme.text }]}>{video.title}</Text>
                </TouchableOpacity>
              ))}
              
              <Text style={[styles.resourcesTitle, { color: currentTheme.text }]}>図解・イラスト</Text>
              {currentGuide.resources.images.map((image: string, index: number) => (
                <View key={index} style={styles.imageItem}>
                  <ImageIcon size={20} color={currentGuide.color} />
                  <Text style={[styles.imageTitle, { color: currentTheme.text }]}>{image}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} >
      <InstrumentHeader />
      
      <View style={[styles.header, { borderBottomColor: currentTheme.secondary }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={currentTheme.text} />
        </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
            {currentGuide 
              ? t('instrumentGuide').replace('{instrument}', currentGuide.name)
              : t('guide')}
          </Text>
        <View style={styles.placeholder} />
      </View>


      <View style={styles.navigation}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
            { id: 'overview', label: t('basicInfo'), icon: BookOpen },
            { id: 'basicPlaying', label: t('playingMethod'), icon: Music },
            { id: 'fingering', label: t('fingering'), icon: Target },
            { id: 'terminology', label: t('terminology'), icon: BookOpen },
            { id: 'maintenance', label: t('care'), icon: Wrench },
            { id: 'tips', label: t('advice'), icon: Lightbulb },
            { id: 'resources', label: t('resources'), icon: Youtube },
            { id: 'faq', label: t('faq'), icon: Star },
            { id: 'roadmap', label: t('roadmap'), icon: History }
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                activeSection === item.id && currentGuide && { 
                  backgroundColor: currentGuide.color,
                  borderColor: currentGuide.color,
                  elevation: 4
                }
              ]}
              onPress={() => setActiveSection(item.id)}
              disabled={!currentGuide}
            >
              <item.icon size={16} color={activeSection === item.id && currentGuide ? '#FFFFFF' : currentTheme.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeSection === item.id && currentGuide ? '#FFFFFF' : currentTheme.textSecondary }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!guidesLoaded || !currentGuide ? (
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Text style={{ color: currentTheme.text, fontSize: 16 }}>{t('loading')}</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderSection()}
        </ScrollView>
      )}

      {/* カメラモーダル */}
      {currentGuide && (
        <PostureCameraModal
          visible={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          instrumentName={currentGuide.name}
        />
      )}
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
